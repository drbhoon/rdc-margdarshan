import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  AccessError,
  protectedRoute,
  pairWrite,
  logChange,
} from "@/lib/access";
export const PUT = protectedRoute(async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ pairId: string }> },
) {
  const { pairId } = await params,
    user = (await getSession())!,
    body = await req.json();
  const result = await pairWrite(
    pairId,
    user,
    async (tx, pair) => {
      if (![pair.mentorCode, pair.menteeCode].includes(user.employeeCode))
        throw new AccessError(
          403,
          "Only participants can change the recording mode.",
        );
      if (body.version !== pair.version)
        throw new AccessError(
          409,
          "The workspace changed. Refresh before changing mode.",
        );

      const reqWeekNumber = Number(body.weekNumber);
      if (Number.isInteger(reqWeekNumber) && reqWeekNumber >= 1 && reqWeekNumber <= 12) {
        const weekSess = await tx.session.findFirst({
          where: { pairId, weekNumber: reqWeekNumber },
          select: { status: true },
        });
        if (weekSess && (weekSess.status === "COMPLETED" || weekSess.status === "MISSED")) {
          throw new AccessError(
            403,
            `Off-record / On-record mode is locked for completed Week ${reqWeekNumber}. Only the Mentor can re-open this week for rework.`,
          );
        }
      }
      let data;
      if (body.action === "PAUSE")
        data = { isOffRecord: true, resumeMentor: false, resumeMentee: false };
      else if (body.action === "RESUME") {
        const mentor =
          pair.resumeMentor || user.employeeCode === pair.mentorCode;
        const mentee =
          pair.resumeMentee || user.employeeCode === pair.menteeCode;
        data = {
          isOffRecord: !(mentor && mentee),
          resumeMentor: mentor,
          resumeMentee: mentee,
        };
      } else throw new AccessError(400, "Invalid mode action.");
      const updated = await tx.mentoringPair.update({
        where: { id: pairId },
        data: { ...data, version: { increment: 1 } },
      });
      await logChange(tx, user, "RECORD_MODE", {
        pairId,
        isOffRecord: updated.isOffRecord,
        resumeMentor: updated.resumeMentor,
        resumeMentee: updated.resumeMentee,
      });
      return updated;
    },
    true,
  );
  return NextResponse.json({ pair: result });
});
