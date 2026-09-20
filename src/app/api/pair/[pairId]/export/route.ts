import { NextRequest, NextResponse } from "next/server";
import { protectedRoute } from "@/lib/access";
export const GET = protectedRoute(async (_req: NextRequest) =>
  NextResponse.json(
    {
      error:
        "Exports are not enabled. Coaching records are available inside the app.",
    },
    { status: 410 },
  ),
);
