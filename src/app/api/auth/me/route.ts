import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeCode: session.employeeCode },
    });

    if (!employee) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
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
    console.error('Session check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
