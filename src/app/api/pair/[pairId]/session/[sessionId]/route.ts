import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ pairId: string; sessionId: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const session = await getSession().catch(() => null);

    const { pairId, sessionId } = await params;
    const body = await req.json();
    const {
      scheduledTime,
      googleMeetLink,
      preSessionNotes,
      discussionPoints,
      insights,
      commitments,
      supportNeeded,
      status,
      isRecordingConsentGranted,
      postSessionReflectionMentee,
      postSessionReflectionMentor,
    } = body;

    const pair = await prisma.mentoringPair.findUnique({
      where: { id: pairId },
      include: { mentor: true, mentee: true },
    });

    if (!pair) {
      return NextResponse.json({ error: 'Pairing not found' }, { status: 404 });
    }

    // Prepare update payload
    const updateData: any = {};
    if (scheduledTime) {
      updateData.scheduledTime = new Date(scheduledTime);
      // Auto-generate high-quality instant meeting room if not custom provided
      if (!googleMeetLink) {
        const cleanPairId = pairId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
        updateData.googleMeetLink = `https://meet.jit.si/Margdarshan-${cleanPairId}-WeekSession`;
      }
    }
    if (googleMeetLink !== undefined) {
      updateData.googleMeetLink = googleMeetLink;
    }
    if (preSessionNotes !== undefined) updateData.preSessionNotes = preSessionNotes;
    if (discussionPoints !== undefined) updateData.discussionPoints = discussionPoints;
    if (insights !== undefined) updateData.insights = insights;
    if (commitments !== undefined) updateData.commitments = commitments;
    if (supportNeeded !== undefined) updateData.supportNeeded = supportNeeded;
    if (status !== undefined) updateData.status = status;
    if (isRecordingConsentGranted !== undefined) {
      updateData.isRecordingConsentGranted = !!isRecordingConsentGranted;
      if (isRecordingConsentGranted) {
        updateData.recordingUrl = `https://storage.googleapis.com/margdarshan-recordings/rec-${sessionId}.mp4`;
      }
    }
    if (postSessionReflectionMentee !== undefined) updateData.postSessionReflectionMentee = postSessionReflectionMentee;
    if (postSessionReflectionMentor !== undefined) updateData.postSessionReflectionMentor = postSessionReflectionMentor;

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: updateData,
    });

    try {
      if (session?.employeeCode) {
        const userExists = await prisma.employee.findUnique({ where: { employeeCode: session.employeeCode } });
        if (userExists) {
          await prisma.auditLog.create({
            data: {
              performedByCode: session.employeeCode,
              action: 'UPDATE_SESSION',
              details: `Session ${sessionId} (Week ${updatedSession.weekNumber}) updated by ${session.name || session.employeeCode}`,
            },
          });
        }
      }
    } catch (auditErr) {
      console.warn('Audit log write skipped:', auditErr);
    }

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error: any) {
    console.error('Update session error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
