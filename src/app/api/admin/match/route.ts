import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { protectedRoute, logChange } from "@/lib/access";
import { createPair, lockMatching, openStatuses } from "@/lib/pairing";
import { calculateMatchScore } from "@/lib/competencies";
export const POST = protectedRoute(async (_req: NextRequest) => {
  const user = (await getSession())!;
  const result = await prisma.$transaction(
    async (tx) => {
      await lockMatching(tx);
      const mentees = await tx.employee.findMany({
        where: {
          isActive: true,
          role: "MENTEE",
          pairAsMentee: { none: { status: { in: [...openStatuses] } } },
        },
        orderBy: { employeeCode: "asc" },
      });
      const mentors = await tx.employee.findMany({
        where: { isActive: true, role: "MENTOR" },
        include: {
          pairAsMentor: { where: { status: { in: [...openStatuses] } } },
        },
      });
      const capacity = new Map(
        mentors.map((m) => [
          m.employeeCode,
          m.mentorCapacity - m.pairAsMentor.length,
        ]),
      );
      let pairsCreated = 0;
      for (const mentee of mentees) {
        const mentor = mentors
          .filter(
            (m) =>
              (capacity.get(m.employeeCode) ?? 0) > 0 &&
              m.employeeCode !== mentee.employeeCode,
          )
          .sort(
            (a, b) =>
              calculateMatchScore(b, mentee) - calculateMatchScore(a, mentee),
          )[0];
        if (!mentor) continue;
        const pair = await createPair(
          tx,
          mentor.employeeCode,
          mentee.employeeCode,
        );
        capacity.set(
          mentor.employeeCode,
          capacity.get(mentor.employeeCode)! - 1,
        );
        await logChange(tx, user, "PROPOSE_MATCH", { pairId: pair.id });
        pairsCreated++;
      }
      return {
        success: true,
        pairsCreated,
        unmatched: mentees.length - pairsCreated,
      };
    },
    { timeout: 30000 },
  );
  return NextResponse.json(result);
});
