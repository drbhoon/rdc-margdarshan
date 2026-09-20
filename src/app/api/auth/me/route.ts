import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ user: null }, { status: 401 });
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { employeeCode: session.employeeCode },
    });
    const { googleSubject: _subject, ...profile } = employee;
    return NextResponse.json(
      { user: { ...profile, role: session.role } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Sign-in service unavailable" },
      { status: 503 },
    );
  }
}
