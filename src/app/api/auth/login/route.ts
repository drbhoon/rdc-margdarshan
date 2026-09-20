import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Employee-code login has been retired. Sign in with your RDC Google account.",
    },
    { status: 410 },
  );
}
