import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { protectedRoute } from "@/lib/access";
export const GET = protectedRoute(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ pairId: string }> },
  ) => {
    const { pairId } = await params;
    const user = (await getSession())!;
    // JSON payloads are server-generated. Filter by exact pair identity, never substring matching.
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
    });
    const history = logs.filter((log) => {
      try {
        return JSON.parse(log.details).pairId === pairId;
      } catch {
        return false;
      }
    });
    return NextResponse.json({ history, userRole: user.role });
  },
);
