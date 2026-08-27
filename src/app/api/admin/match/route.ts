import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { calculateMatchScore } from '@/lib/competencies';

export async function POST() {
  try {
    await ensureDatabaseSchema();
    const session = await getSession();
    if (session && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    // Get latest cohort or auto-create a rolling 3-month cohort
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

    // Clear previous pairs to ensure clean re-computation for all candidates
    await prisma.mentoringPair.deleteMany({});

    // Load Mentees and Mentors
    const mentees = await prisma.employee.findMany({ where: { role: 'MENTEE' } });
    const mentors = await prisma.employee.findMany({ where: { role: 'MENTOR' } });

    if (mentors.length === 0) {
      return NextResponse.json({ error: 'No mentors found in roster. Please add mentors first.' }, { status: 400 });
    }

    if (mentees.length === 0) {
      return NextResponse.json({ error: 'No mentees found in roster. Please add mentees first.' }, { status: 400 });
    }

    // Track mentor current pairing counts. Mentors can take more than 1 mentee!
    // Calculate required capacity dynamically to ensure ALL mentees get paired
    const minNeededCapacity = Math.ceil(mentees.length / mentors.length);
    const mentorCapacities: Record<string, number> = {};
    mentors.forEach((m) => {
      mentorCapacities[m.employeeCode] = Math.max(m.mentorCapacity || 1, minNeededCapacity, 2);
    });

    let pairsCreated = 0;
    const pairedMenteeCodes = new Set<string>();

    // Pass 1: Match each mentee with highest-scoring mentor having available capacity
    for (const mentee of mentees) {
      let bestMentorCode: string | null = null;
      let bestScore = -1;

      for (const mentor of mentors) {
        const remainingCap = mentorCapacities[mentor.employeeCode] || 0;
        if (remainingCap <= 0) continue;

        const score = calculateMatchScore(mentor, mentee);
        if (score > bestScore) {
          bestScore = score;
          bestMentorCode = mentor.employeeCode;
        }
      }

      if (bestMentorCode && bestScore >= 0) {
        await prisma.mentoringPair.create({
          data: {
            cohortId: cohort.id,
            menteeCode: mentee.employeeCode,
            mentorCode: bestMentorCode,
            status: 'PROPOSED',
            matchScore: bestScore,
          },
        });

        mentorCapacities[bestMentorCode] -= 1;
        pairedMenteeCodes.add(mentee.employeeCode);
        pairsCreated += 1;
      }
    }

    // Pass 2: If any mentee remains unmatched, match them with the best mentor regardless of capacity
    for (const mentee of mentees) {
      if (pairedMenteeCodes.has(mentee.employeeCode)) continue;

      let bestMentorCode: string | null = null;
      let bestScore = -1;

      for (const mentor of mentors) {
        const score = calculateMatchScore(mentor, mentee);
        if (score > bestScore) {
          bestScore = score;
          bestMentorCode = mentor.employeeCode;
        }
      }

      if (bestMentorCode) {
        await prisma.mentoringPair.create({
          data: {
            cohortId: cohort.id,
            menteeCode: mentee.employeeCode,
            mentorCode: bestMentorCode,
            status: 'PROPOSED',
            matchScore: bestScore,
          },
        });

        pairedMenteeCodes.add(mentee.employeeCode);
        pairsCreated += 1;
      }
    }

    return NextResponse.json({ success: true, pairsCreated });
  } catch (error: any) {
    console.error('Matching algorithm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

