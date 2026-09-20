import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { effectiveRole } from "@/lib/auth-policy";
import { protectedRoute } from "@/lib/access";
export const GET = protectedRoute(async function GET(_req: NextRequest) {
  const user = (await getSession())!;
  if (user.role !== "ADMIN") return NextResponse.json({ users: [] });
  const users = await prisma.employee.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({
    users: users.map(({ googleSubject: _subject, ...u }) => ({
      ...u,
      role: effectiveRole(u),
    })),
  });
});
