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

    const employee = await prisma.employee.findUnique({
      where: { employeeCode },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found. Please register or contact HR.' }, { status: 404 });
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
