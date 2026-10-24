import { NextRequest, NextResponse } from "next/server";
import { prisma, ensureDatabaseSchema } from "@/lib/db";
import { randomToken } from "@/lib/google-oauth";
import { SESSION_COOKIE, SESSION_SECONDS, tokenHash } from "@/lib/auth";
import { corporateEmail, effectiveRole, isAdminEmail } from "@/lib/auth-policy";

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

    let employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { email: { equals: rawIdentifier, mode: "insensitive" } },
          { employeeCode: { equals: rawIdentifier, mode: "insensitive" } },
          { name: { equals: rawIdentifier, mode: "insensitive" } },
        ],
      },
    });

    // If not yet in the database, auto-provision when a valid @ultrafine.in or @rdc.in corporate email is entered
    if (!employee) {
      const validEmail = corporateEmail(rawIdentifier);
      if (validEmail) {
        const localPart = validEmail.split("@")[0] || "employee";
        const domainPart = validEmail.split("@")[1] || "";
        const prefix = domainPart.startsWith("ultrafine") ? "UF" : "RDC";
        const cleanLocal = localPart.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
        const generatedCode = `${prefix}-${cleanLocal}-${Math.floor(100 + Math.random() * 900)}`;
        const formattedName = localPart
          .split(/[._-]+/)
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");

        employee = await prisma.employee.create({
          data: {
            employeeCode: generatedCode,
            email: validEmail,
            name: formattedName || localPart,
            role: isAdminEmail(validEmail) ? "ADMIN" : "MENTEE",
            department: domainPart.startsWith("ultrafine")
              ? "Ultrafine Minerals"
              : "RDC Concrete",
            designation: "Team Member",
            isActive: true,
            joinDate: new Date(),
            topics: [],
            challenges: [],
          },
        });
      }
    }

    if (!employee) {
      return NextResponse.json(
        {
          error:
            "No registered account found for that Employee ID. Please sign in using your full corporate email (@ultrafine.in or @rdc.in) or check with your administrator.",
        },
        { status: 404 },
      );
    }

    if (!employee.isActive) {
      employee = await prisma.employee.update({
        where: { employeeCode: employee.employeeCode },
        data: { isActive: true },
      });
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
