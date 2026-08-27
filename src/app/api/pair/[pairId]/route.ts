import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const session = await getSession().catch(() => null);

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

    // Sanitize any outdated or invalid Google Meet links
    const cleanPairId = pair.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    const sanitizedSessions = pair.sessions.map((s) => {
      let link = s.googleMeetLink;
      if (!link || link.includes('ksb-meet') || link.includes('meet.google.com/ksb-')) {
        link = `https://meet.jit.si/Margdarshan-${cleanPairId}-Week${s.weekNumber}`;
        // Asynchronously update in DB so future queries are fixed
        prisma.session.update({
          where: { id: s.id },
          data: { googleMeetLink: link },
        }).catch(() => {});
      }
      return {
        ...s,
        googleMeetLink: link,
      };
    });

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
    }).catch(() => []);

    // Fetch private notes of this user if session exists
    const privateNotes = session?.employeeCode
      ? await prisma.privateNote.findMany({
          where: {
            employeeCode: session.employeeCode,
          },
          orderBy: { createdAt: 'desc' },
        }).catch(() => [])
      : [];

    return NextResponse.json({
      pair: {
        ...pair,
        sessions: sanitizedSessions,
      },
      actionItems,
      privateNotes,
    });
  } catch (error) {
    console.error('Fetch pair error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
