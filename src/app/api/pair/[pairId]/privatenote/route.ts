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

    const { content } = await req.json();

    const privateNote = await prisma.privateNote.create({
      data: {
        employeeCode: session.employeeCode,
        content,
      },
    });

    return NextResponse.json({ success: true, privateNote });
  } catch (error) {
    console.error('Create private note error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
