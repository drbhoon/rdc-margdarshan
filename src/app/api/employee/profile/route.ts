import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeCode: session.employeeCode },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({
      employee: {
        employeeCode: employee.employeeCode,
        email: employee.email,
        name: employee.name,
        role: employee.role,
        department: employee.department,
        designation: employee.designation,
        discStyle: employee.discStyle,
        isConsentShared: employee.isConsentShared,
        careerGoals: employee.careerGoals,
        topics: employee.topics || [],
        challenges: employee.challenges || [],
        availability: employee.availability,
        commStyleNotes: employee.commStyleNotes,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { careerGoals, topics, challenges, availability, commStyleNotes, isConsentShared } = body;

    const employee = await prisma.employee.update({
      where: { employeeCode: session.employeeCode },
      data: {
        careerGoals,
        topics: Array.isArray(topics) ? topics : [],
        challenges: Array.isArray(challenges) ? challenges : [],
        availability,
        commStyleNotes,
        isConsentShared: !!isConsentShared,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        employeeCode: employee.employeeCode,
        email: employee.email,
        name: employee.name,
        role: employee.role,
        department: employee.department,
        designation: employee.designation,
        discStyle: employee.discStyle,
        isConsentShared: employee.isConsentShared,
        careerGoals: employee.careerGoals,
        topics: employee.topics,
        challenges: employee.challenges || [],
        availability: employee.availability,
        commStyleNotes: employee.commStyleNotes,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
