import { NextRequest, NextResponse } from "next/server";
import { prisma, ensureDatabaseSchema } from "@/lib/db";
import { randomToken } from "@/lib/google-oauth";
import { SESSION_COOKIE, SESSION_SECONDS, tokenHash } from "@/lib/auth";
import { corporateEmail, effectiveRole } from "@/lib/auth-policy";

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const body = await req.json();
    const rawIdentifier = String(
      body.identifier ?? body.email ?? body.employeeCode ?? "",
    ).trim();

    if (!rawIdentifier) {
      return NextResponse.json(
        {
          error:
            "Please enter your corporate email (@rdc.in or @ultrafine.in) or Employee ID.",
        },
        { status: 400 },
      );
    }

    const employee = await prisma.employee.findFirst({
      where: {
        isActive: true,
        OR: [
          { email: { equals: rawIdentifier, mode: "insensitive" } },
          { employeeCode: { equals: rawIdentifier, mode: "insensitive" } },
        ],
      },
    });

    if (!employee) {
      return NextResponse.json(
        {
          error:
            "No registered account found for that email or Employee ID. Please check with your programme administrator.",
        },
        { status: 404 },
      );
    }

    if (!corporateEmail(employee.email)) {
      return NextResponse.json(
        {
          error:
            "Only @rdc.in and @ultrafine.in corporate accounts are permitted.",
        },
        { status: 403 },
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

    const role = effectiveRole(employee);
    const response = NextResponse.json({
      success: true,
      user: {
        employeeCode: employee.employeeCode,
        name: employee.name,
        email: employee.email,
        role,
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
    console.error("[Login Error]:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not complete sign-in.",
      },
      { status: 500 },
    );
  }
}
