import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pairId } = await params;
    const { sharedGoals } = await req.json();

    const pair = await prisma.mentoringPair.findUnique({
      where: { id: pairId },
    });

    if (!pair) {
      return NextResponse.json({ error: 'Pairing not found' }, { status: 404 });
    }

    if (pair.menteeCode !== session.employeeCode && pair.mentorCode !== session.employeeCode) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updatedPair = await prisma.mentoringPair.update({
      where: { id: pairId },
      data: { sharedGoals },
    });

    await prisma.auditLog.create({
      data: {
        performedByCode: session.employeeCode,
        action: 'UPDATE_GOALS',
        details: `Goals updated for pair ${pairId} by ${session.name}`,
      },
    });

    return NextResponse.json({ success: true, sharedGoals: updatedPair.sharedGoals });
  } catch (error) {
    console.error('Update goals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
