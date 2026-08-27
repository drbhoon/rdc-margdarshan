import { NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/db';

export async function GET() {
  try {
    await ensureDatabaseSchema();
    const users = await prisma.employee.findMany({
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      users: users.map((u) => ({
        employeeCode: u.employeeCode,
        email: u.email,
        name: u.name,
        role: u.role,
        department: u.department,
        designation: u.designation,
        discStyle: u.discStyle,
        isConsentShared: u.isConsentShared,
        careerGoals: u.careerGoals,
        topics: u.topics || [],
        challenges: u.challenges || [],
        availability: u.availability,
        commStyleNotes: u.commStyleNotes,
        mentorCapacity: u.mentorCapacity,
      })),
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ users: [] });
  }
}
