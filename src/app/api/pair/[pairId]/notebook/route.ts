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
    const { content } = await req.json();

    const notebook = await prisma.sharedNotebook.findFirst({
      where: { pairId },
    });

    let updatedNotebook;
    if (notebook) {
      updatedNotebook = await prisma.sharedNotebook.update({
        where: { id: notebook.id },
        data: {
          content,
          updatedBy: session.name,
        },
      });
    } else {
      updatedNotebook = await prisma.sharedNotebook.create({
        data: {
          pairId,
          content,
          updatedBy: session.name,
        },
      });
    }

    return NextResponse.json({ success: true, notebook: updatedNotebook });
  } catch (error) {
    console.error('Update notebook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
