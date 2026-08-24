import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    await ensureDatabaseSchema();
    const session = await getSession();
    const role = session?.role || 'ADMIN';
    const employeeCode = session?.employeeCode || 'EMP001';

    if (role === 'ADMIN') {
      try {
        const cohorts = await prisma.cohort.findMany({
          orderBy: { startDate: 'desc' },
        }).catch(() => []);

        const allEmployees = await prisma.employee.findMany({
          where: { role: { in: ['MENTEE', 'MENTOR'] } },
          orderBy: [{ role: 'asc' }, { name: 'asc' }],
        }).catch(() => []);

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
        }).catch(() => []);

        const allSurveys = await prisma.surveyFeedback.findMany().catch(() => []);

        return NextResponse.json({
          cohorts,
          totalMentees,
          totalMentors,
          allEmployees,
          pairs,
          allSurveys,
        });
      } catch (dbErr) {
        console.error('Admin dashboard DB query error:', dbErr);
        return NextResponse.json({
          cohorts: [],
          totalMentees: 0,
          totalMentors: 0,
          allEmployees: [],
          pairs: [],
          allSurveys: [],
        });
      }
    } else {
      try {
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
        }).catch(() => null);

        const actionItems = await prisma.actionItem.findMany({
          where: { employeeCode, status: { not: 'COMPLETED' } },
          orderBy: { dueDate: 'asc' },
        }).catch(() => []);

        return NextResponse.json({ pair, actionItems });
      } catch (dbErr) {
        console.error('User dashboard DB query error:', dbErr);
        return NextResponse.json({ pair: null, actionItems: [] });
      }
    }
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return NextResponse.json({
      cohorts: [],
      totalMentees: 0,
      totalMentors: 0,
      allEmployees: [],
      pairs: [],
      allSurveys: [],
    });
  }
}
