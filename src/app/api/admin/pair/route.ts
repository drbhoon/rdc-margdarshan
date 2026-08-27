import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { calculateMatchScore } from '@/lib/competencies';

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const session = await getSession();
    if (session && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Helper: Safe Audit Logging that will never fail or throw FK constraint errors
    const safeLog = async (logAction: string, details: string) => {
      try {
        let actorCode = session?.employeeCode;
        if (actorCode) {
          const exists = await prisma.employee.findUnique({ where: { employeeCode: actorCode } });
          if (!exists) actorCode = undefined;
        }
        if (!actorCode) {
          const admin = await prisma.employee.findFirst({ where: { role: 'ADMIN' } });
          actorCode = admin?.employeeCode;
        }
        if (actorCode) {
          await prisma.auditLog.create({
            data: {
              performedByCode: actorCode,
              action: logAction,
              details,
            },
          });
        }
      } catch (err) {
        console.warn('Audit log write skipped:', err);
      }
    };

    // Helper: Ensure 13 Sessions exist for a pair
    const ensurePairSessions = async (pairId: string) => {
      try {
        const existing = await prisma.session.count({ where: { pairId } });
        if (existing === 0) {
          const sessionCreations = Array.from({ length: 13 }, (_, i) => ({
            pairId,
            weekNumber: i,
            status: 'SCHEDULED' as const,
          }));
          await prisma.session.createMany({
            data: sessionCreations,
          });
        }
      } catch (err) {
        console.warn('ensurePairSessions warning:', err);
      }
    };

    // Helper: Get or create latest cohort
    const getCohort = async () => {
      let cohort = await prisma.cohort.findFirst({
        orderBy: { startDate: 'desc' },
      });
      if (!cohort) {
        const now = new Date();
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(now.getMonth() + 3);

        cohort = await prisma.cohort.create({
          data: {
            name: 'Rolling 3-Month Mentoring Program (2026)',
            startDate: now,
            endDate: threeMonthsLater,
            status: 'MATCHING',
          },
        });
      }
      return cohort;
    };

    // 1. CONFIRM SINGLE PAIR (PROPOSED -> ACTIVE)
    if (action === 'CONFIRM_PAIR') {
      const { pairId } = body;
      if (!pairId) return NextResponse.json({ error: 'Missing pairId' }, { status: 400 });

      const pair = await prisma.mentoringPair.findUnique({
        where: { id: pairId },
        include: { mentee: true, mentor: true },
      });

      if (!pair) return NextResponse.json({ error: 'Pairing not found' }, { status: 404 });

      await prisma.mentoringPair.update({
        where: { id: pairId },
        data: { status: 'ACTIVE' },
      });

      await ensurePairSessions(pairId);

      await safeLog(
        'ADMIN_CONFIRM_PAIR',
        `Admin confirmed pairing ${pairId} (${pair.mentor.name} & ${pair.mentee.name}). Status set to ACTIVE.`
      );

      return NextResponse.json({ success: true, message: 'Pairing confirmed and activated successfully.' });
    }

    // 2. CONFIRM ALL PROPOSED PAIRS
    if (action === 'CONFIRM_ALL') {
      const proposedPairs = await prisma.mentoringPair.findMany({
        where: { status: 'PROPOSED' },
      });

      for (const p of proposedPairs) {
        await prisma.mentoringPair.update({
          where: { id: p.id },
          data: { status: 'ACTIVE' },
        });
        await ensurePairSessions(p.id);
      }

      await safeLog(
        'ADMIN_CONFIRM_ALL_PAIRS',
        `Admin confirmed all ${proposedPairs.length} proposed pairings.`
      );

      return NextResponse.json({
        success: true,
        count: proposedPairs.length,
        message: `Successfully confirmed and activated ${proposedPairs.length} pairings.`,
      });
    }

    // 3. REJECT PAIR
    if (action === 'REJECT_PAIR') {
      const { pairId, reason } = body;
      if (!pairId) return NextResponse.json({ error: 'Missing pairId' }, { status: 400 });

      await prisma.mentoringPair.update({
        where: { id: pairId },
        data: {
          status: 'DECLINED',
          declineReason: reason || 'Rejected by Admin',
        },
      });

      await safeLog(
        'ADMIN_REJECT_PAIR',
        `Admin rejected pairing ${pairId}. Reason: ${reason || 'Admin decision'}`
      );

      return NextResponse.json({ success: true, message: 'Pairing marked as rejected.' });
    }

    // 4. DELETE PAIR
    if (action === 'DELETE_PAIR') {
      const { pairId } = body;
      if (!pairId) return NextResponse.json({ error: 'Missing pairId' }, { status: 400 });

      await prisma.mentoringPair.delete({
        where: { id: pairId },
      });

      await safeLog('ADMIN_DELETE_PAIR', `Admin deleted pairing ${pairId}.`);

      return NextResponse.json({ success: true, message: 'Pairing deleted.' });
    }

    // 5. UPDATE PAIR (Change mentor, mentee, or status)
    if (action === 'UPDATE_PAIR') {
      const { pairId, mentorCode, menteeCode, status } = body;
      if (!pairId) return NextResponse.json({ error: 'Missing pairId' }, { status: 400 });

      const existingPair = await prisma.mentoringPair.findUnique({ where: { id: pairId } });
      if (!existingPair) return NextResponse.json({ error: 'Pairing not found' }, { status: 404 });

      const finalMentorCode = mentorCode || existingPair.mentorCode;
      const finalMenteeCode = menteeCode || existingPair.menteeCode;
      const finalStatus = status || existingPair.status;

      const mentor = await prisma.employee.findUnique({ where: { employeeCode: finalMentorCode } });
      const mentee = await prisma.employee.findUnique({ where: { employeeCode: finalMenteeCode } });

      if (!mentor || !mentee) {
        return NextResponse.json({ error: 'Mentor or Mentee not found in database.' }, { status: 400 });
      }

      const matchScore = calculateMatchScore(mentor, mentee);

      const updated = await prisma.mentoringPair.update({
        where: { id: pairId },
        data: {
          mentorCode: finalMentorCode,
          menteeCode: finalMenteeCode,
          status: finalStatus,
          matchScore,
        },
      });

      if (finalStatus === 'ACTIVE') {
        await ensurePairSessions(pairId);
      }

      await safeLog(
        'ADMIN_UPDATE_PAIR',
        `Admin updated pairing ${pairId}: Mentor=${mentor.name}, Mentee=${mentee.name}, Status=${finalStatus}, Score=${matchScore}`
      );

      return NextResponse.json({ success: true, pair: updated, matchScore });
    }

    // 6. CREATE MANUAL PAIR
    if (action === 'CREATE_PAIR') {
      const { menteeCode, mentorCode, status } = body;
      if (!menteeCode || !mentorCode) {
        return NextResponse.json({ error: 'Mentee and Mentor are required.' }, { status: 400 });
      }

      const mentee = await prisma.employee.findUnique({ where: { employeeCode: menteeCode } });
      const mentor = await prisma.employee.findUnique({ where: { employeeCode: mentorCode } });

      if (!mentee || !mentor) {
        return NextResponse.json({ error: 'Mentee or Mentor not found.' }, { status: 404 });
      }

      const cohort = await getCohort();

      // Delete any previous pairing for this mentee across any cohort to avoid duplicate conflicts
      await prisma.mentoringPair.deleteMany({
        where: { menteeCode },
      });

      const matchScore = calculateMatchScore(mentor, mentee);
      const pairStatus = status || 'ACTIVE'; // Default to ACTIVE for instant availability

      const newPair = await prisma.mentoringPair.create({
        data: {
          cohortId: cohort.id,
          menteeCode,
          mentorCode,
          status: pairStatus,
          matchScore,
        },
      });

      if (pairStatus === 'ACTIVE') {
        await ensurePairSessions(newPair.id);
      }

      await safeLog(
        'ADMIN_CREATE_CUSTOM_PAIR',
        `Admin created pairing between ${mentor.name} and ${mentee.name} with score ${matchScore}.`
      );

      return NextResponse.json({ success: true, pair: newPair, matchScore });
    }

    // 7. PREVIEW SCORE
    if (action === 'PREVIEW_SCORE') {
      const { menteeCode, mentorCode } = body;
      if (!menteeCode || !mentorCode) return NextResponse.json({ score: 0.5 });

      const mentee = await prisma.employee.findUnique({ where: { employeeCode: menteeCode } });
      const mentor = await prisma.employee.findUnique({ where: { employeeCode: mentorCode } });

      if (!mentee || !mentor) return NextResponse.json({ score: 0.5 });
      const score = calculateMatchScore(mentor, mentee);
      return NextResponse.json({ score });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Pair admin API error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
