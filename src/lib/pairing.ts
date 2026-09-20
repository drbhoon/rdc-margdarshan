import type { Prisma } from "@/generated/prisma/client";
import { AccessError } from "@/lib/access";
import { calculateMatchScore } from "@/lib/competencies";
export const openStatuses = [
  "PROPOSED",
  "PENDING_ACCEPTANCE",
  "ACCEPTED",
  "ACTIVE",
] as const;
export async function lockMatching(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(70140914)::text`;
}
export async function createPair(
  tx: Prisma.TransactionClient,
  mentorCode: string,
  menteeCode: string,
) {
  if (mentorCode === menteeCode)
    throw new AccessError(400, "Mentor and mentee must be different people.");
  const mentor = await tx.employee.findUnique({
    where: { employeeCode: mentorCode },
  });
  const mentee = await tx.employee.findUnique({
    where: { employeeCode: menteeCode },
  });
  if (
    !mentor ||
    !mentee ||
    !mentor.isActive ||
    !mentee.isActive ||
    mentor.role !== "MENTOR" ||
    mentee.role !== "MENTEE"
  )
    throw new AccessError(400, "Choose an active mentor and mentee.");
  if (
    await tx.mentoringPair.count({
      where: { menteeCode, status: { in: [...openStatuses] } },
    })
  )
    throw new AccessError(
      409,
      "Mentee already has an open relationship. End it first; its records will be retained.",
    );
  if (
    (await tx.mentoringPair.count({
      where: { mentorCode, status: { in: [...openStatuses] } },
    })) >= mentor.mentorCapacity
  )
    throw new AccessError(409, "Mentor capacity is full.");
  let cohort = await tx.cohort.findFirst({
    where: { status: { in: ["MATCHING", "ACTIVE"] } },
    orderBy: { startDate: "desc" },
  });
  if (!cohort)
    cohort = await tx.cohort.create({
      data: {
        name: "Rolling mentoring programme",
        startDate: new Date(),
        endDate: new Date(Date.now() + 91 * 86400000),
        status: "MATCHING",
      },
    });
  return tx.mentoringPair.create({
    data: {
      cohortId: cohort.id,
      mentorCode,
      menteeCode,
      status: "PROPOSED",
      matchScore: calculateMatchScore(mentor, mentee),
    },
  });
}
