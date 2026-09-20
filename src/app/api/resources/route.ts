import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  protectedRoute,
  AccessError,
  textValue,
  logChange,
} from "@/lib/access";
export const GET = protectedRoute(async (_req: NextRequest) => {
  const user = (await getSession())!;
  const resources = await prisma.resource.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { isApproved: true },
              { contributedByCode: user.employeeCode },
            ],
          },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({
    resources: resources.map((r) => ({
      ...r,
      url: r.url?.includes(".margdarshan.internal") ? null : r.url,
    })),
  });
});
export const POST = protectedRoute(async (req: NextRequest) => {
  const user = (await getSession())!,
    body = await req.json();
  const title = textValue(body.title, 500).trim(),
    url = textValue(body.url ?? "", 2000);
  if (!title) throw new AccessError(400, "Title is required.");
  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new AccessError(400, "Invalid URL.");
    }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password)
      throw new AccessError(400, "Use an HTTPS link.");
  }
  const tags = Array.isArray(body.tags)
    ? body.tags.map((t: unknown) => textValue(t, 200))
    : [];
  if (tags.length > 30) throw new AccessError(400, "Too many tags.");
  const resource = await prisma.$transaction(async (tx) => {
    const record = await tx.resource.create({
      data: {
        title,
        url: url || null,
        content: textValue(body.content ?? ""),
        tags,
        contributedByCode: user.employeeCode,
        isApproved: user.role === "ADMIN",
      },
    });
    await logChange(tx, user, "CONTRIBUTE_RESOURCE", { resourceId: record.id });
    return record;
  });
  return NextResponse.json({ success: true, resource });
});
export const PUT = protectedRoute(async (req: NextRequest) => {
  const user = (await getSession())!;
  if (user.role !== "ADMIN")
    throw new AccessError(403, "Administrator access required.");
  const body = await req.json();
  if (typeof body.isApproved !== "boolean")
    throw new AccessError(400, "Choose an approval status.");
  const resource = await prisma.$transaction(async (tx) => {
    const record = await tx.resource.update({
      where: { id: textValue(body.id, 100) },
      data: { isApproved: body.isApproved },
    });
    await logChange(tx, user, "REVIEW_RESOURCE", {
      resourceId: record.id,
      isApproved: record.isApproved,
    });
    return record;
  });
  return NextResponse.json({ resource });
});
