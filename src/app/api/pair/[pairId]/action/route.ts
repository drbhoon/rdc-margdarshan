import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  protectedRoute,
  pairWrite,
  AccessError,
  textValue,
  logChange,
} from "@/lib/access";
type Context = { params: Promise<{ pairId: string }> };
export const POST = protectedRoute(
  async (req: NextRequest, { params }: Context) => {
    const user = (await getSession())!;
    const { pairId } = await params;
    const body = await req.json();
    const actionItem = await pairWrite(pairId, user, async (tx, pair) => {
      const sessionId = textValue(body.sessionId, 100),
        employeeCode = textValue(body.employeeCode, 100);
      if (![pair.menteeCode, pair.mentorCode].includes(employeeCode))
        throw new AccessError(400, "Choose a participant as owner.");
      if (!(await tx.session.findFirst({ where: { id: sessionId, pairId } })))
        throw new AccessError(404, "Session not found.");
      const value = textValue(body.dueDate, 100);
      const dueDate = new Date(
        /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + "T23:59:59+05:30" : value,
      );
      if (!Number.isFinite(dueDate.getTime()))
        throw new AccessError(400, "Invalid due date.");
      const title = textValue(body.title, 500).trim();
      if (!title) throw new AccessError(400, "Enter an action.");
      const result = await tx.actionItem.create({
        data: {
          sessionId,
          employeeCode,
          title,
          description: textValue(body.description ?? ""),
          dueDate,
        },
      });
      await logChange(tx, user, "CREATE_ACTION", { pairId, after: result });
      return result;
    });
    return NextResponse.json({ success: true, actionItem });
  },
);
export const PUT = protectedRoute(
  async (req: NextRequest, { params }: Context) => {
    const user = (await getSession())!;
    const { pairId } = await params;
    const body = await req.json();
    if (!["PENDING", "IN_PROGRESS", "COMPLETED"].includes(body.status))
      throw new AccessError(400, "Invalid status.");
    const actionItem = await pairWrite(pairId, user, async (tx) => {
      const previous = await tx.actionItem.findFirst({
        where: { id: textValue(body.actionItemId, 100), session: { pairId } },
      });
      if (!previous) throw new AccessError(404, "Action not found.");
      if (body.updatedAt !== previous.updatedAt.toISOString())
        throw new AccessError(409, "Action changed. Reload before saving.");
      const result = await tx.actionItem.update({
        where: { id: previous.id },
        data: {
          status: body.status,
          evidence:
            body.evidence === undefined
              ? previous.evidence
              : textValue(body.evidence),
          completedAt:
            body.status === "COMPLETED"
              ? (previous.completedAt ?? new Date())
              : null,
        },
      });
      await logChange(tx, user, "UPDATE_ACTION", {
        pairId,
        before: previous,
        after: result,
      });
      return result;
    });
    return NextResponse.json({ success: true, actionItem });
  },
);
