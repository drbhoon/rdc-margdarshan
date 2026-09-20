import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { protectedRoute } from "@/lib/access";
export const GET = protectedRoute(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ pairId: string }> },
  ) => {
    const { pairId } = await params;
    const pair = await prisma.mentoringPair.findUniqueOrThrow({
      where: { id: pairId },
      include: {
        mentor: { omit: { googleSubject: true } },
        mentee: { omit: { googleSubject: true } },
        cohort: true,
        sessions: {
          orderBy: { weekNumber: "asc" },
          include: { actionItems: true },
        },
        notebooks: { orderBy: { updatedAt: "desc" } },
        learningNotes: { orderBy: { createdAt: "desc" } },
        surveys: true,
        coachingMessages: { orderBy: { createdAt: "asc" } },
      },
    });
    const actionItems = await prisma.actionItem.findMany({
      where: { session: { pairId } },
      include: { assignee: { omit: { googleSubject: true } } },
      orderBy: { dueDate: "asc" },
    });
    return NextResponse.json({
      pair,
      actionItems,
      privateNotes: pair.learningNotes,
    });
  },
);
