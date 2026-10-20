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
import { sendCandidateInviteEmail } from "@/lib/email";

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

  if (body.action === "BROADCAST_INVITES") {
    const targetCodes: string[] | undefined = Array.isArray(body.employeeCodes)
      ? body.employeeCodes.map((c: unknown) => String(c).trim()).filter(Boolean)
      : body.employeeCode
        ? [String(body.employeeCode).trim()]
        : undefined;

    const candidates = await prisma.employee.findMany({
      where: {
        role: { in: ["MENTEE", "MENTOR"] },
        ...(targetCodes && targetCodes.length > 0
          ? { employeeCode: { in: targetCodes } }
          : {}),
      },
      orderBy: { name: "asc" },
    });

    let sentCount = 0;
    let simulatedCount = 0;
    const errors: string[] = [];

    for (const c of candidates) {
      try {
        const res = await sendCandidateInviteEmail({
          to: c.email,
          name: c.name,
          role: c.role === "MENTOR" ? "MENTOR" : "MENTEE",
          employeeCode: c.employeeCode,
        });
        if (res.simulated) {
          simulatedCount++;
        } else {
          sentCount++;
        }
      } catch (mailErr) {
        console.error(`Failed to send invite email to ${c.email}:`, mailErr);
        errors.push(
          `${c.email}: ${mailErr instanceof Error ? mailErr.message : "SMTP error"}`,
        );
      }
    }

    await logChange(prisma, user, "BROADCAST_INVITES", {
      sentCount,
      simulatedCount,
      errors,
      targetCodes: targetCodes ?? "ALL",
    });

    const recipients = candidates.map((c) => ({
      employeeCode: c.employeeCode,
      name: c.name,
      email: c.email,
      role: c.role,
    }));

    if (errors.length > 0 && sentCount === 0) {
      return NextResponse.json({
        success: false,
        sentCount,
        simulatedCount,
        errors,
        recipients,
        message: `SMTP delivery failed (${errors[0]}). Opening your default email client so you can send the invitation directly.`,
      });
    }

    if (simulatedCount > 0 && sentCount === 0) {
      return NextResponse.json({
        success: true,
        sentCount,
        simulatedCount,
        recipients,
        message:
          candidates.length === 1 && candidates[0]
            ? `SMTP is not configured on the server yet — opening your email client with a pre-filled invitation & login link for ${candidates[0].name} (${candidates[0].email}).`
            : `SMTP is not configured on the server yet — opening your email client and copying all ${candidates.length} personalized login links.`,
      });
    }

    return NextResponse.json({
      success: true,
      sentCount,
      simulatedCount,
      recipients,
      count: sentCount,
      message:
        sentCount === 1 && candidates[0]
          ? `Invitation & login link emailed to ${candidates[0].name} (${candidates[0].role}) at ${candidates[0].email}.`
          : `Broadcast complete: Program invitations with personalized login links emailed to ${sentCount} Mentor/Mentee employee(s).`,
    });
  }

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
            "Each candidate needs a code, name, corporate email (@rdc.in or @ultrafine.in) and mentor/mentee role.",
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
        const highestQualification = c.highestQualification
          ? textValue(c.highestQualification, 200)
          : null;
        const location = c.location ? textValue(c.location, 200) : null;
        const data = {
          name,
          email,
          role: c.role as "MENTEE" | "MENTOR",
          department: textValue(c.department ?? "Engineering", 200),
          designation: textValue(
            c.designation ?? "Graduate Engineer Trainee",
            200,
          ),
          highestQualification,
          location,
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
  const shouldSendInvite =
    body.sendInvite === "on" || body.sendInvite === true || body.sendInvite === "true";
  let invitedCount = 0;

  if (shouldSendInvite) {
    for (const savedEmp of result) {
      if (savedEmp.role === "MENTEE" || savedEmp.role === "MENTOR") {
        try {
          await sendCandidateInviteEmail({
            to: savedEmp.email,
            name: savedEmp.name,
            role: savedEmp.role,
            employeeCode: savedEmp.employeeCode,
          });
          invitedCount++;
        } catch (mailErr) {
          console.error(
            `Failed to send invite email to ${savedEmp.email}:`,
            mailErr,
          );
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    count: result.length,
    candidates: result,
    candidate: result[0],
    message:
      invitedCount > 0 && result[0]
        ? `Saved ${result[0].name} (${result[0].role}) and sent welcome invitation with login link to ${result[0].email}.`
        : result[0]
          ? `Saved ${result[0].name} (${result[0].role}) in employee roster.`
          : "Saved successfully.",
  });
});
