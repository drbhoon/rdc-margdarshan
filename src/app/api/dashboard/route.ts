import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { protectedRoute } from "@/lib/access";
import { effectiveRole } from "@/lib/auth-policy";
export const GET = protectedRoute(async (_req: NextRequest) => {
  const user = (await getSession())!;
  const pairs = await prisma.mentoringPair.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { menteeCode: user.employeeCode },
              { mentorCode: user.employeeCode },
            ],
          },
    include: {
      mentor: { omit: { googleSubject: true } },
      mentee: { omit: { googleSubject: true } },
      cohort: true,
      sessions: { orderBy: { weekNumber: "asc" } },
      surveys: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (user.role === "ADMIN") {
    const [cohorts, employees, allSurveys, legacyNotes] = await Promise.all([
      prisma.cohort.findMany({ orderBy: { startDate: "desc" } }),
      prisma.employee.findMany({
        omit: { googleSubject: true },
        orderBy: { name: "asc" },
      }),
      prisma.surveyFeedback.findMany(),
      prisma.privateNote.findMany({
        where: { pairId: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const allEmployees = employees.map((e) => ({
      ...e,
      role: effectiveRole(e),
    }));
    return NextResponse.json({
      pairs,
      cohorts,
      allEmployees,
      allSurveys,
      legacyNotes,
      totalMentees: allEmployees.filter((e) => e.role === "MENTEE").length,
      totalMentors: allEmployees.filter((e) => e.role === "MENTOR").length,
    });
  }
  const actionItems = await prisma.actionItem.findMany({
    where: { employeeCode: user.employeeCode, status: { not: "COMPLETED" } },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json({ pair: pairs[0] ?? null, pairs, actionItems });
});
