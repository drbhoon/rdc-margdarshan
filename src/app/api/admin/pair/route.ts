import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  protectedRoute,
  AccessError,
  logChange,
  textValue,
} from "@/lib/access";
import { createPair, lockMatching } from "@/lib/pairing";
import { calculateMatchScore } from "@/lib/competencies";
export const POST = protectedRoute(async (req: NextRequest) => {
  const user = (await getSession())!;
  const body = await req.json();
  const result = await prisma.$transaction(async (tx) => {
    await lockMatching(tx);
    if (body.action === "PREVIEW_SCORE") {
      const mentor = await tx.employee.findUnique({
        where: { employeeCode: textValue(body.mentorCode, 100) },
      });
      const mentee = await tx.employee.findUnique({
        where: { employeeCode: textValue(body.menteeCode, 100) },
      });
      if (!mentor || !mentee)
        throw new AccessError(404, "Choose a mentor and mentee.");
      return { score: calculateMatchScore(mentor, mentee) };
    }
    if (body.action === "CREATE_PAIR") {
      const pair = await createPair(
        tx,
        textValue(body.mentorCode, 100),
        textValue(body.menteeCode, 100),
      );
      await logChange(tx, user, "CREATE_PAIR", { pairId: pair.id });
      return { success: true, pair, matchScore: pair.matchScore };
    }
    if (body.action === "CONFIRM_ALL" || body.action === "CONFIRM_PAIR") {
      const pairs = await tx.mentoringPair.findMany({
        where: {
          status: "PROPOSED",
          ...(body.action === "CONFIRM_PAIR"
            ? { id: textValue(body.pairId, 100) }
            : {}),
        },
      });
      for (const pair of pairs) {
        await tx.mentoringPair.update({
          where: { id: pair.id },
          data: { status: "PENDING_ACCEPTANCE", version: { increment: 1 } },
        });
        await logChange(tx, user, "INVITE_PAIR", { pairId: pair.id });
      }
      return {
        success: true,
        count: pairs.length,
        message: "Ready for acceptance by both participants.",
      };
    }
    if (
      body.action === "DELETE_PAIR" ||
      body.action === "REJECT_PAIR" ||
      body.action === "TERMINATE_PAIR"
    ) {
      const pairId = textValue(body.pairId, 100);
      await tx.$queryRaw`SELECT id FROM "MentoringPair" WHERE id=${pairId} FOR UPDATE`;
      const pair = await tx.mentoringPair.findUnique({ where: { id: pairId } });
      if (!pair) throw new AccessError(404, "Relationship not found.");
      const status =
        body.action === "REJECT_PAIR" && pair.status !== "ACTIVE"
          ? "DECLINED"
          : "TERMINATED";
      await tx.mentoringPair.update({
        where: { id: pairId },
        data: {
          status,
          declineReason: textValue(body.reason ?? "Ended by administrator"),
          version: { increment: 1 },
        },
      });
      await logChange(tx, user, "END_PAIR", {
        pairId,
        status,
        reason: body.reason ?? "",
      });
      return {
        success: true,
        message: "Relationship ended. All coaching records retained.",
      };
    }
    if (body.action === "UPDATE_PAIR")
      throw new AccessError(
        409,
        "End this relationship and create a new invitation to change participants. Existing records stay with their original owners.",
      );
    throw new AccessError(400, "Invalid action.");
  });
  return NextResponse.json(result);
});
