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
    const { sessionId, employeeCode, title, description, dueDate } = await req.json();

    const actionItem = await prisma.actionItem.create({
      data: {
        sessionId,
        employeeCode,
        title,
        description,
        dueDate: new Date(dueDate),
      },
    });

    return NextResponse.json({ success: true, actionItem });
  } catch (error) {
    console.error('Create action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionItemId, status } = await req.json();

    const actionItem = await prisma.actionItem.update({
      where: { id: actionItemId },
      data: { status },
    });

    return NextResponse.json({ success: true, actionItem });
  } catch (error) {
    console.error('Update action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
