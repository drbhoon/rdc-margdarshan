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
    const notebook = await pairWrite(pairId, user, async (tx) => {
      // Append revisions: previous coaching records remain available.
      const result = await tx.sharedNotebook.create({
        data: {
          pairId,
          content: textValue(body.content),
          updatedBy: user.employeeCode,
        },
      });
      await logChange(tx, user, "SAVE_NOTEBOOK", {
        pairId,
        notebookId: result.id,
      });
      return result;
    });
    return NextResponse.json({ success: true, notebook });
  },
);
