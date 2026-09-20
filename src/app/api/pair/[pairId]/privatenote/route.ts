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
    const privateNote = await pairWrite(pairId, user, async (tx) => {
      const result = await tx.privateNote.create({
        data: {
          pairId,
          employeeCode: user.employeeCode,
          content: textValue(body.content),
        },
      });
      await logChange(tx, user, "SAVE_LEARNING_NOTE", {
        pairId,
        noteId: result.id,
      });
      return result;
    });
    return NextResponse.json({ success: true, privateNote });
  },
);
