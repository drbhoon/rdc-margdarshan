import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pairId } = await params;
    const { action, declineReason } = await req.json();

    if (action !== 'ACCEPT' && action !== 'DECLINE') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const pair = await prisma.mentoringPair.findUnique({
      where: { id: pairId },
      include: { cohort: true, mentee: true, mentor: true },
    });

    if (!pair) {
      return NextResponse.json({ error: 'Pairing not found' }, { status: 404 });
    }

    // Verify user is part of the pair
    const isMentee = pair.menteeCode === session.employeeCode;
    const isMentor = pair.mentorCode === session.employeeCode;

    if (!isMentee && !isMentor) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (action === 'DECLINE') {
      await prisma.mentoringPair.update({
        where: { id: pairId },
        data: {
          status: 'DECLINED',
          declineReason: declineReason || 'Declined by counterpart',
        },
      });

      await prisma.auditLog.create({
        data: {
          performedByCode: session.employeeCode,
          action: 'PAIR_DECLINED',
          details: `Pairing ${pairId} declined by ${session.name}. Reason: ${declineReason}`,
        },
      });

      return NextResponse.json({ success: true, status: 'DECLINED' });
    }

    // If action is ACCEPT, check status.
    // If it's PROPOSED, we can set it to PENDING_ACCEPTANCE (one accepted, waiting for other)
    // If it's PENDING_ACCEPTANCE, we set it to ACTIVE (both accepted) and create sessions
    let newStatus = pair.status;

    if (pair.status === 'PROPOSED') {
      newStatus = 'PENDING_ACCEPTANCE';
    } else if (pair.status === 'PENDING_ACCEPTANCE') {
      newStatus = 'ACTIVE';

      // Initialize the 12-week sessions (Week 0 to Week 12 = 13 sessions)
      const sessionCreations = Array.from({ length: 13 }, (_, i) => ({
        weekNumber: i,
        status: 'SCHEDULED' as const,
      }));

      await prisma.mentoringPair.update({
        where: { id: pairId },
        data: {
          status: newStatus,
          sessions: {
            create: sessionCreations,
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          performedByCode: session.employeeCode,
          action: 'PAIR_ACTIVATED',
          details: `Pairing ${pairId} between ${pair.mentor.name} and ${pair.mentee.name} activated. 13 sessions initialized.`,
        },
      });

      return NextResponse.json({ success: true, status: newStatus });
    }

    await prisma.mentoringPair.update({
      where: { id: pairId },
      data: { status: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        performedByCode: session.employeeCode,
        action: 'PAIR_ACCEPTED_PARTIAL',
        details: `Pairing ${pairId} accepted by ${session.name}. Waiting for counterpart.`,
      },
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    console.error('Response API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
