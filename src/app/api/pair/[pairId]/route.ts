import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pairId } = await params;

    const pair = await prisma.mentoringPair.findUnique({
      where: { id: pairId },
      include: {
        mentee: true,
        mentor: true,
        cohort: true,
        sessions: {
          orderBy: { weekNumber: 'asc' },
          include: { actionItems: true },
        },
        notebooks: {
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!pair) {
      return NextResponse.json({ error: 'Pairing not found' }, { status: 404 });
    }

    // Verify user is in this pair
    const isMentee = pair.menteeCode === session.employeeCode;
    const isMentor = pair.mentorCode === session.employeeCode;
    if (!isMentee && !isMentor) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch action items for this pair
    const actionItems = await prisma.actionItem.findMany({
      where: {
        sessionId: {
          in: pair.sessions.map((s) => s.id),
        },
      },
      include: {
        assignee: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    // Fetch private notes of this user only
    const privateNotes = await prisma.privateNote.findMany({
      where: {
        employeeCode: session.employeeCode,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      pair,
      actionItems,
      privateNotes,
    });
  } catch (error) {
    console.error('Fetch pair error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
