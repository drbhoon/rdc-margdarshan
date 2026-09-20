import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { protectedRoute } from "@/lib/access";
import { effectiveRole } from "@/lib/auth-policy";
export const GET = protectedRoute(async (_req: NextRequest) => {
  const [employees, legacyNotes, legacyReviews, audit] = await Promise.all([
    prisma.employee.findMany({
      omit: { googleSubject: true },
      orderBy: { name: "asc" },
    }),
    prisma.privateNote.findMany({
      where: { pairId: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.surveyFeedback.findMany({
      where: { pairId: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 500 }),
  ]);
  return NextResponse.json({
    employees: employees.map((e) => ({ ...e, role: effectiveRole(e) })),
    legacyNotes,
    legacyReviews,
    audit,
  });
});
