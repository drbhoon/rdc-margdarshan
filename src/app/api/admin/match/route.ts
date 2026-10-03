import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { protectedRoute, logChange } from "@/lib/access";
import { createPair, lockMatching, openStatuses } from "@/lib/pairing";
import { calculateMatchScore } from "@/lib/competencies";
import { getHarmonyAdvice } from "@/lib/disc-guide";

export const GET = protectedRoute(async (_req: NextRequest) => {
  const mentees = await prisma.employee.findMany({
    where: {
      isActive: true,
      role: "MENTEE",
      pairAsMentee: { none: { status: { in: [...openStatuses] } } },
    },
    orderBy: { name: "asc" },
  });

  const mentors = await prisma.employee.findMany({
    where: { isActive: true, role: "MENTOR" },
    include: {
      pairAsMentor: { where: { status: { in: [...openStatuses] } } },
    },
    orderBy: { name: "asc" },
  });

  const capacity = new Map(
    mentors.map((m) => [
      m.employeeCode,
      m.mentorCapacity - m.pairAsMentor.length,
    ]),
  );

  const suggestions: Array<{
    mentee: (typeof mentees)[0];
    mentor: (typeof mentors)[0];
    matchScore: number;
    reasons: string[];
    harmonyAdvice: ReturnType<typeof getHarmonyAdvice>;
  }> = [];

  const tempCapacity = new Map(capacity);

  for (const mentee of mentees) {
    const scoredMentors = mentors
      .filter(
        (m) =>
          (tempCapacity.get(m.employeeCode) ?? 0) > 0 &&
          m.employeeCode !== mentee.employeeCode,
      )
      .map((m) => {
        const score = calculateMatchScore(m, mentee);
        const reasons: string[] = [];

        if (m.discStyle && mentee.discStyle) {
          reasons.push(
            `DISC Style Alignment: Mentor (${m.discStyle}) & Mentee (${mentee.discStyle})`,
          );
        }

        const sharedTopics = (mentee.topics || []).filter((t) =>
          (m.topics || []).includes(t),
        );
        if (sharedTopics.length > 0) {
          reasons.push(`Shared Competencies: ${sharedTopics.join(", ")}`);
        }

        if (m.department && mentee.department && m.department !== mentee.department) {
          reasons.push(`Cross-Functional Growth: ${m.department} ↔ ${mentee.department}`);
        } else if (m.department && mentee.department) {
          reasons.push(`Deep Domain Specialization: ${m.department}`);
        }

        return {
          mentor: m,
          matchScore: score,
          reasons,
          harmonyAdvice: getHarmonyAdvice(m.discStyle, mentee.discStyle),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    if (scoredMentors.length > 0) {
      const best = scoredMentors[0];
      suggestions.push({
        mentee,
        mentor: best.mentor,
        matchScore: best.matchScore,
        reasons: best.reasons,
        harmonyAdvice: best.harmonyAdvice,
      });
      tempCapacity.set(
        best.mentor.employeeCode,
        (tempCapacity.get(best.mentor.employeeCode) ?? 1) - 1,
      );
    }
  }

  return NextResponse.json({
    success: true,
    totalMenteesAvailable: mentees.length,
    totalMentorsAvailable: mentors.filter((m) => (capacity.get(m.employeeCode) ?? 0) > 0).length,
    suggestionsCount: suggestions.length,
    suggestions,
  });
});

export const POST = protectedRoute(async (req: NextRequest) => {
  const user = (await getSession())!;
  const body = await req.json().catch(() => ({}));
  const specificPairings: Array<{ mentorCode: string; menteeCode: string }> | undefined = body.pairings;

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

      const pairsCreatedList: Array<{
        pairId: string;
        mentor: (typeof mentors)[0];
        mentee: (typeof mentees)[0];
        matchScore: number;
      }> = [];

      if (specificPairings && Array.isArray(specificPairings) && specificPairings.length > 0) {
        for (const p of specificPairings) {
          const mentor = mentors.find((m) => m.employeeCode === p.mentorCode);
          const mentee = mentees.find((m) => m.employeeCode === p.menteeCode);
          if (!mentor || !mentee || (capacity.get(mentor.employeeCode) ?? 0) <= 0) continue;

          const pair = await createPair(tx, mentor.employeeCode, mentee.employeeCode);
          capacity.set(mentor.employeeCode, (capacity.get(mentor.employeeCode) ?? 1) - 1);
          await logChange(tx, user, "PROPOSE_MATCH", { pairId: pair.id });
          pairsCreatedList.push({
            pairId: pair.id,
            mentor,
            mentee,
            matchScore: pair.matchScore,
          });
        }
      } else {
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
          pairsCreatedList.push({
            pairId: pair.id,
            mentor,
            mentee,
            matchScore: pair.matchScore,
          });
        }
      }

      return {
        pairsCreatedList,
        totalUnmatched: mentees.length - pairsCreatedList.length,
        menteesCount: mentees.length,
      };
    },
    { timeout: 30000 },
  );

  let message = "";
  if (result.pairsCreatedList.length > 0) {
    message = `Created ${result.pairsCreatedList.length} draft mentoring proposal(s) for administrator review.`;
    if (result.totalUnmatched > 0) {
      message += ` (${result.totalUnmatched} mentee(s) remain unmatched due to mentor capacity).`;
    }
  } else if (result.menteesCount === 0) {
    message = "All active mentees already have active or proposed mentoring relationships.";
  } else {
    message = "No available mentors with spare capacity found for the remaining mentees.";
  }

  return NextResponse.json({
    success: true,
    message,
    pairsCreated: result.pairsCreatedList.length,
    unmatched: result.totalUnmatched,
    pairs: result.pairsCreatedList,
  });
});
