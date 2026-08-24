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
    const { weekNumber, growthRating, feedbackText } = await req.json();

    if (weekNumber !== 6 && weekNumber !== 12) {
      return NextResponse.json({ error: 'Feedback is only required for Week 6 and Week 12.' }, { status: 400 });
    }

    if (!growthRating || growthRating < 1 || growthRating > 5) {
      return NextResponse.json({ error: 'Growth rating must be between 1 and 5.' }, { status: 400 });
    }

    const feedback = await prisma.surveyFeedback.create({
      data: {
        employeeCode: session.employeeCode,
        weekNumber,
        growthRating,
        feedbackText: feedbackText || '',
      },
    });

    await prisma.auditLog.create({
      data: {
        performedByCode: session.employeeCode,
        action: 'SUBMIT_SURVEY',
        details: `Week ${weekNumber} survey feedback submitted by ${session.name}. Rating: ${growthRating}/5`,
      },
    });

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error('Submit feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
