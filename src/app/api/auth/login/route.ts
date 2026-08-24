import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { employeeCode } = await req.json();
    if (!employeeCode) {
      return NextResponse.json({ error: 'Employee Code is required' }, { status: 400 });
    }

    let employee = await prisma.employee.findUnique({
      where: { employeeCode },
    });

    // If EMP001 (Admin) is not yet in database (e.g. freshly created Railway DB), auto-seed Admin
    if (!employee && employeeCode === 'EMP001') {
      employee = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Puja Singh',
          email: 'puja.singh@rdc.in',
          role: 'ADMIN',
          department: 'HR, L&D & Operational Excellence',
          designation: 'Head of L&D and Operational Excellence',
          joinDate: new Date(),
        },
      });
    }

    if (!employee) {
      return NextResponse.json({ error: `Employee ${employeeCode} not found in roster.` }, { status: 404 });
    }

    const sessionData = {
      employeeCode: employee.employeeCode,
      email: employee.email,
      role: employee.role,
      name: employee.name,
    };

    const token = createToken(sessionData);

    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({ user: sessionData });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
