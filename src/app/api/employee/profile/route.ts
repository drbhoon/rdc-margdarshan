import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  protectedRoute,
  textValue,
  AccessError,
  logChange,
} from "@/lib/access";
export const GET = protectedRoute(async (_req: NextRequest) => {
  const user = (await getSession())!;
  const employee = await prisma.employee.findUniqueOrThrow({
    where: { employeeCode: user.employeeCode },
    omit: { googleSubject: true },
  });
  return NextResponse.json({ employee: { ...employee, role: user.role } });
});
export const PUT = protectedRoute(async (req: NextRequest) => {
  const user = (await getSession())!,
    body = await req.json();
  const array = (value: unknown) => {
    if (!Array.isArray(value) || value.length > 30)
      throw new AccessError(400, "Choose up to 30 priorities.");
    return value.map((v) => textValue(v, 500));
  };
  const data = {
    careerGoals: textValue(body.careerGoals ?? ""),
    topics: array(body.topics ?? []),
    challenges: array(body.challenges ?? []),
    availability: textValue(body.availability ?? "", 2000),
    commStyleNotes: textValue(body.commStyleNotes ?? ""),
    isConsentShared: body.isConsentShared === true,
  };
  const employee = await prisma.$transaction(async (tx) => {
    const before = await tx.employee.findUniqueOrThrow({
      where: { employeeCode: user.employeeCode },
      omit: { googleSubject: true },
    });
    const after = await tx.employee.update({
      where: { employeeCode: user.employeeCode },
      data,
      omit: { googleSubject: true },
    });
    await logChange(tx, user, "UPDATE_PROFILE", {
      employeeCode: user.employeeCode,
      before: {
        careerGoals: before.careerGoals,
        topics: before.topics,
        challenges: before.challenges,
        availability: before.availability,
        commStyleNotes: before.commStyleNotes,
      },
      after: data,
    });
    return after;
  });
  return NextResponse.json({
    success: true,
    user: { ...employee, role: user.role },
  });
});
