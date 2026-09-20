import { NextRequest, NextResponse } from "next/server";
import { revokeSession } from "@/lib/auth";
import { appOrigin } from "@/lib/auth-policy";
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== appOrigin())
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  try {
    await revokeSession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to end your session. Please retry." },
      { status: 503 },
    );
  }
}
