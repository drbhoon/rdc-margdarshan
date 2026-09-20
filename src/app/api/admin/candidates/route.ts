import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { corporateEmail, effectiveRole } from "@/lib/auth-policy";
import {
  protectedRoute,
  AccessError,
  textValue,
  logChange,
} from "@/lib/access";
export const GET = protectedRoute(async (_req: NextRequest) => {
  const employees = await prisma.employee.findMany({
    omit: { googleSubject: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    employees: employees.map((e) => ({ ...e, role: effectiveRole(e) })),
  });
});
export const POST = protectedRoute(async (req: NextRequest) => {
  const user = (await getSession())!;
  const body = await req.json();
  if (body.action === "RESET_DATABASE")
    throw new AccessError(
      410,
      "Database reset is disabled to preserve coaching records.",
    );
  if (body.action) throw new AccessError(400, "This action is not available.");
  const candidates = Array.isArray(body.candidates) ? body.candidates : [body];
  if (!candidates.length || candidates.length > 500)
    throw new AccessError(400, "Submit between 1 and 500 candidates.");
  const result = await prisma.$transaction(
    async (tx) => {
      const saved = [];
      for (const c of candidates) {
        const employeeCode = textValue(c.employeeCode, 100).trim(),
          name = textValue(c.name, 200).trim(),
          email = corporateEmail(c.email);
        if (
          !employeeCode ||
          !name ||
          !email ||
          !["MENTEE", "MENTOR"].includes(c.role)
        )
          throw new AccessError(
            400,
            "Each candidate needs a code, name, RDC email and mentor/mentee role.",
          );
        const mentorCapacity =
          c.role === "MENTOR" ? Number(c.mentorCapacity ?? 2) : 1;
        if (
          !Number.isInteger(mentorCapacity) ||
          mentorCapacity < 1 ||
          mentorCapacity > 50
        )
          throw new AccessError(400, "Mentor capacity must be 1–50.");
        const existing = await tx.employee.findUnique({
          where: { employeeCode },
        });
        if (existing && existing.email.toLowerCase() !== email)
          throw new AccessError(
            409,
            "An employee code cannot be reassigned to another email.",
          );
        const data = {
          name,
          email,
          role: c.role as "MENTEE" | "MENTOR",
          department: textValue(c.department ?? "Engineering", 200),
          designation: textValue(
            c.designation ?? "Graduate Engineer Trainee",
            200,
          ),
          mentorCapacity,
        };
        const joinDate = c.joinDate ? new Date(c.joinDate) : new Date();
        if (!Number.isFinite(joinDate.getTime()))
          throw new AccessError(400, "Invalid joining date.");
        const employee = await tx.employee.upsert({
          where: { employeeCode },
          update: data,
          create: {
            employeeCode,
            ...data,
            joinDate,
            topics: [],
            challenges: [],
          },
        });
        await logChange(tx, user, "SAVE_CANDIDATE", {
          employeeCode,
          before: existing
            ? {
                name: existing.name,
                role: existing.role,
                mentorCapacity: existing.mentorCapacity,
              }
            : null,
          after: data,
        });
        const { googleSubject: _, ...safe } = employee;
        saved.push({ ...safe, role: effectiveRole(employee) });
      }
      return saved;
    },
    { timeout: 30000 },
  );
  return NextResponse.json({
    success: true,
    count: result.length,
    candidates: result,
    candidate: result[0],
  });
});
