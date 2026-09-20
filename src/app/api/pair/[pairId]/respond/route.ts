import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  protectedRoute,
  pairWrite,
  logChange,
  AccessError,
  textValue,
} from "@/lib/access";
type Context = { params: Promise<{ pairId: string }> };

export const POST = protectedRoute(
  async (req: NextRequest, { params }: Context) => {
    const user = (await getSession())!;
    const { pairId } = await params;
    const body = await req.json();
    if (!["ACCEPT", "DECLINE"].includes(body.action))
      throw new AccessError(400, "Invalid response.");
    const result = await pairWrite(pairId, user, async (tx, pair) => {
      const mentor = pair.mentorCode === user.employeeCode,
        mentee = pair.menteeCode === user.employeeCode;
      if (!mentor && !mentee)
        throw new AccessError(403, "Only the mentor and mentee can respond.");
      if (!["PROPOSED", "PENDING_ACCEPTANCE", "ACCEPTED"].includes(pair.status))
        throw new AccessError(
          409,
          "This invitation is no longer awaiting acceptance.",
        );
      const mentorAcceptedAt = mentor ? new Date() : pair.mentorAcceptedAt;
      const menteeAcceptedAt = mentee ? new Date() : pair.menteeAcceptedAt;
      const status =
        body.action === "DECLINE"
          ? "DECLINED"
          : mentorAcceptedAt && menteeAcceptedAt
            ? "ACTIVE"
            : "PENDING_ACCEPTANCE";
      const result = await tx.mentoringPair.update({
        where: { id: pairId },
        data:
          body.action === "DECLINE"
            ? {
                status,
                declineReason: textValue(body.declineReason ?? ""),
                version: { increment: 1 },
              }
            : {
                status,
                mentorAcceptedAt,
                menteeAcceptedAt,
                version: { increment: 1 },
              },
      });
      if (status === "ACTIVE")
        await tx.session.createMany({
          data: Array.from({ length: 13 }, (_, weekNumber) => ({
            pairId,
            weekNumber,
          })),
          skipDuplicates: true,
        });
      await logChange(tx, user, "PAIR_RESPONSE", {
        pairId,
        action: body.action,
        status,
      });
      return result;
    });
    return NextResponse.json({ success: true, status: result.status });
  },
);
