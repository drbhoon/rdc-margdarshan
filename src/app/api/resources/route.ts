import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resources = await prisma.resource.findMany({
      where: {
        OR: [
          { isApproved: true },
          { contributedByCode: session.employeeCode }, // Show user their own pending contributions
        ],
      },
      orderBy: { title: 'asc' },
    });

    return NextResponse.json({ resources });
  } catch (error) {
    console.error('Fetch resources error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, url, content, tags } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const tagsArray = Array.isArray(tags) ? tags : [];

    const resource = await prisma.resource.create({
      data: {
        title,
        url,
        content,
        tags: tagsArray,
        contributedByCode: session.employeeCode,
        isApproved: session.role === 'ADMIN', // Auto-approved if Admin
      },
    });

    await prisma.auditLog.create({
      data: {
        performedByCode: session.employeeCode,
        action: 'CONTRIBUTE_RESOURCE',
        details: `Resource "${title}" contributed by ${session.name}. Status: ${
          session.role === 'ADMIN' ? 'APPROVED' : 'PENDING_APPROVAL'
        }`,
      },
    });

    return NextResponse.json({ success: true, resource });
  } catch (error) {
    console.error('Contribute resource error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
