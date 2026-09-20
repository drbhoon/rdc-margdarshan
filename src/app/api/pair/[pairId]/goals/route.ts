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

export const PUT = protectedRoute(
  async (req: NextRequest, { params }: Context) => {
    const user = (await getSession())!;
    const { pairId } = await params;
    const body = await req.json();
    const pair = await pairWrite(pairId, user, async (tx, pair) => {
      if (body.version !== pair.version)
        throw new AccessError(409, "Goals changed. Reload before saving.");
      const sharedGoals = textValue(body.sharedGoals);
      const result = await tx.mentoringPair.update({
        where: { id: pairId },
        data: { sharedGoals, version: { increment: 1 } },
      });
      await logChange(tx, user, "UPDATE_GOALS", {
        pairId,
        before: pair.sharedGoals,
        after: sharedGoals,
      });
      return result;
    });
    return NextResponse.json({
      success: true,
      sharedGoals: pair.sharedGoals,
      pair,
    });
  },
);
