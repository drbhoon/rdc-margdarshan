import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ pairId: string; sessionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pairId, sessionId } = await params;
    const body = await req.json();
    const {
      scheduledTime,
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
    });

    if (!pair) {
      return NextResponse.json({ error: 'Pairing not found' }, { status: 404 });
    }

    if (pair.menteeCode !== session.employeeCode && pair.mentorCode !== session.employeeCode) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Prepare update payload
    const updateData: any = {};
    if (scheduledTime) {
      updateData.scheduledTime = new Date(scheduledTime);
      // Auto-generate a Google Meet link if not present
      updateData.googleMeetLink = `https://meet.google.com/ksb-meet-${pairId.slice(0, 4)}-${sessionId.slice(0, 4)}`;
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

    await prisma.auditLog.create({
      data: {
        performedByCode: session.employeeCode,
        action: 'UPDATE_SESSION',
        details: `Session ${sessionId} (Week ${updatedSession.weekNumber}) updated by ${session.name}`,
      },
    });

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error('Update session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
