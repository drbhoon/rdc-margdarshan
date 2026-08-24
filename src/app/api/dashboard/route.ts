import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employeeCode = session.employeeCode;
    const role = session.role;

    if (role === 'ADMIN') {
      // Fetch data for Admin
      const cohorts = await prisma.cohort.findMany({
        orderBy: { startDate: 'desc' },
      });

      const allEmployees = await prisma.employee.findMany({
        where: { role: { in: ['MENTEE', 'MENTOR'] } },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      });

      const totalMentees = allEmployees.filter((e) => e.role === 'MENTEE').length;
      const totalMentors = allEmployees.filter((e) => e.role === 'MENTOR').length;

      const pairs = await prisma.mentoringPair.findMany({
        include: {
          mentee: true,
          mentor: true,
          cohort: true,
          sessions: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const allSurveys = await prisma.surveyFeedback.findMany();

      return NextResponse.json({
        cohorts,
        totalMentees,
        totalMentors,
        allEmployees,
        pairs,
        allSurveys,
      });
    } else {
      // Fetch data for Mentee or Mentor
      const pair = await prisma.mentoringPair.findFirst({
        where: {
          OR: [
            { menteeCode: employeeCode },
            { mentorCode: employeeCode },
          ],
          status: {
            in: ['PROPOSED', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'ACTIVE', 'DECLINED'],
          },
        },
        include: {
          mentee: true,
          mentor: true,
          cohort: true,
          sessions: {
            orderBy: { weekNumber: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ pair });
    }
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
