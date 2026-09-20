import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, type UserSession } from "@/lib/auth";
import { appOrigin } from "@/lib/auth-policy";
import type { Prisma } from "@/generated/prisma/client";
export class AccessError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function canReadPair(
  user: UserSession,
  pair: { mentorCode: string; menteeCode: string },
) {
  return (
    user.role === "ADMIN" ||
    pair.mentorCode === user.employeeCode ||
    pair.menteeCode === user.employeeCode
  );
}
export function protectedRoute<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      const req = args[0] as NextRequest;
      const user = await getSession();
      if (!user)
        throw new AccessError(
          401,
          "Please sign in with your RDC Google account.",
        );
      const path = new URL(req.url).pathname;
      if (path.startsWith("/api/admin/") && user.role !== "ADMIN")
        throw new AccessError(403, "Administrator access required.");
      const writing = !["GET", "HEAD", "OPTIONS"].includes(req.method);
      if (writing && req.headers.get("origin") !== appOrigin())
        throw new AccessError(403, "Invalid request origin.");
      let body: Record<string, unknown> = {};
      if (writing) {
        const raw = await req.clone().text();
        if (raw.length > 200000)
          throw new AccessError(413, "Request is too large.");
        try {
          body = JSON.parse(raw);
        } catch {
          throw new AccessError(400, "Invalid JSON request.");
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new AccessError(400, "Expected an object.");
      }
      const match = path.match(/^\/api\/pair\/([^/]+)/);
      if (match) {
        const pairId = decodeURIComponent(match[1]);
        const pair = await prisma.mentoringPair.findUnique({
          where: { id: pairId },
        });
        if (!pair)
          throw new AccessError(404, "Mentoring relationship not found.");
        if (!canReadPair(user, pair))
          throw new AccessError(
            403,
            "You do not have access to this mentoring relationship.",
          );
        if (writing && pair.isOffRecord && !path.endsWith("/mode"))
          throw new AccessError(
            409,
            "This workspace is off record. Saving and AI are paused.",
          );
        if (
          writing &&
          ["TERMINATED", "DECLINED"].includes(pair.status) &&
          !path.endsWith("/respond")
        )
          throw new AccessError(409, "This relationship is read-only.");
        const sid = path.match(/\/session\/([^/]+)$/)?.[1] || body.sessionId;
        if (sid) {
          if (
            typeof sid !== "string" ||
            !(await prisma.session.findFirst({ where: { id: sid, pairId } }))
          )
            throw new AccessError(
              404,
              "Session does not belong to this relationship.",
            );
        }
        if (path.endsWith("/action")) {
          if (
            body.employeeCode &&
            ![pair.mentorCode, pair.menteeCode].includes(
              String(body.employeeCode),
            )
          )
            throw new AccessError(
              400,
              "Choose a participant in this relationship.",
            );
          if (
            body.actionItemId &&
            !(await prisma.actionItem.findFirst({
              where: { id: String(body.actionItemId), session: { pairId } },
            }))
          )
            throw new AccessError(
              404,
              "Action does not belong to this relationship.",
            );
        }
      }
      const response = await handler(...args);
      response.headers.set("Cache-Control", "no-store");
      return response;
    } catch (error) {
      if (error instanceof AccessError)
        return NextResponse.json(
          { error: error.message },
          { status: error.status },
        );
      return NextResponse.json(
        { error: "The request could not be completed. Please retry." },
        { status: 503 },
      );
    }
  };
}
export async function pairWrite<T>(
  pairId: string,
  user: UserSession,
  work: (
    tx: Prisma.TransactionClient,
    pair: Awaited<ReturnType<typeof prisma.mentoringPair.findUniqueOrThrow>>,
  ) => Promise<T>,
  allowMode = false,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "MentoringPair" WHERE id=${pairId} FOR UPDATE`;
    const pair = await tx.mentoringPair.findUniqueOrThrow({
      where: { id: pairId },
    });
    if (!canReadPair(user, pair)) throw new AccessError(403, "Access denied.");
    if (pair.isOffRecord && !allowMode)
      throw new AccessError(409, "Off record: saving is paused.");
    if (["TERMINATED", "DECLINED"].includes(pair.status) && !allowMode)
      throw new AccessError(409, "This relationship is read-only.");
    return work(tx, pair);
  });
}
export async function logChange(
  tx: Prisma.TransactionClient,
  user: UserSession,
  action: string,
  details: unknown,
) {
  await tx.auditLog.create({
    data: {
      performedByCode: user.employeeCode,
      action,
      details: JSON.stringify(details),
    },
  });
}
export function textValue(value: unknown, max = 20000): string {
  if (typeof value !== "string" || value.length > max)
    throw new AccessError(400, "Invalid or excessively long text.");
  return value;
}
