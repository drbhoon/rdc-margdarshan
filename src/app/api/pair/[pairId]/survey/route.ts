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
    const { weekNumber, growthRating } = body;
    if (
      ![6, 12].includes(weekNumber) ||
      !Number.isInteger(growthRating) ||
      growthRating < 1 ||
      growthRating > 5
    )
      throw new AccessError(
        400,
        "Choose week 6 or 12 and an integer rating from 1 to 5.",
      );
    const feedback = await pairWrite(pairId, user, async (tx, pair) => {
      if (![pair.mentorCode, pair.menteeCode].includes(user.employeeCode))
        throw new AccessError(
          403,
          "Only participants can submit their own feedback.",
        );
      const previous = await tx.surveyFeedback.findUnique({
        where: {
          pairId_employeeCode_weekNumber: {
            pairId,
            employeeCode: user.employeeCode,
            weekNumber,
          },
        },
      });
      const data = {
        growthRating,
        feedbackText: textValue(body.feedbackText ?? ""),
      };
      const result = await tx.surveyFeedback.upsert({
        where: {
          pairId_employeeCode_weekNumber: {
            pairId,
            employeeCode: user.employeeCode,
            weekNumber,
          },
        },
        create: {
          pairId,
          employeeCode: user.employeeCode,
          weekNumber,
          ...data,
        },
        update: data,
      });
      await logChange(tx, user, "SUBMIT_SURVEY", {
        pairId,
        before: previous,
        after: result,
      });
      return result;
    });
    return NextResponse.json({ success: true, feedback });
  },
);
