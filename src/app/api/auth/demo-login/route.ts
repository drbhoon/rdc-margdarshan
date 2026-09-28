import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/google-oauth";
import { SESSION_COOKIE, SESSION_SECONDS, tokenHash } from "@/lib/auth";
import { ensureDemoData, DEMO_ACCOUNTS } from "@/lib/demo-data";

export async function POST(req: NextRequest) {
  try {
    const { employeeCode } = await req.json();
    if (!employeeCode || typeof employeeCode !== "string") {
      return NextResponse.json({ error: "Employee code required." }, { status: 400 });
    }

    // Ensure demo accounts and pairs are present in database
    await ensureDemoData();

    const target = DEMO_ACCOUNTS.find((a) => a.employeeCode === employeeCode);
    if (!target) {
      return NextResponse.json(
        { error: "Demo persona not recognized." },
        { status: 404 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeCode: target.employeeCode },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee account could not be found." },
        { status: 404 }
      );
    }

    const rawToken = randomToken();
    await prisma.authSession.create({
      data: {
        tokenHash: tokenHash(rawToken),
        employeeCode: employee.employeeCode,
        expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
      },
    });

    const response = NextResponse.json({
      success: true,
      message: `Signed in as ${employee.name} (${employee.role})`,
      user: {
        employeeCode: employee.employeeCode,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    });

    response.cookies.set(SESSION_COOKIE, rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    response.cookies.delete("token");

    return response;
  } catch (err: unknown) {
    console.error("[Demo Login Error]:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Demo sign-in failed." },
      { status: 500 }
    );
  }
}
