import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { AccessError } from "@/lib/access";
import { sendWeeklyReminderEmail } from "@/lib/email";

const weekThemes: Record<number, string> = {
  1: "Agreement & expectations",
  2: "Communication & assertiveness",
  3: "Skills & strengths",
  4: "Career direction & planning",
  5: "Focus & resource responsibility",
  6: "Midpoint review & feedback",
  7: "Stakeholder relationships & trust",
  8: "Problem solving & asset care",
  9: "Difficult conversations",
  10: "Teamwork & delegation",
  11: "Sustaining progress & safety",
  12: "Growth review & next steps",
};

async function runWeeklyReminders({
  targetWeek,
  performedByCode,
  customAppUrl,
}: {
  targetWeek?: number | null;
  performedByCode: string;
  customAppUrl?: string;
}) {
  const activePairs = await prisma.mentoringPair.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      mentor: { omit: { googleSubject: true } },
      mentee: { omit: { googleSubject: true } },
      sessions: { orderBy: { weekNumber: "asc" } },
    },
  });

  let emailsSent = 0;
  let emailsSimulated = 0;
  let emailsFailed = 0;
  const pendingPairs: Array<{
    pairId: string;
    mentorName: string;
    menteeName: string;
    weekNumber: number;
    status: string;
    mentorResult: string;
    menteeResult: string;
  }> = [];

  for (const pair of activePairs) {
    const completedCount = pair.sessions.filter(
      (s) => s.status === "COMPLETED",
    ).length;

    const pendingSession = targetWeek
      ? pair.sessions.find(
          (s) =>
            s.weekNumber === targetWeek &&
            s.status !== "COMPLETED" &&
            s.status !== "MISSED",
        )
      : pair.sessions.find(
          (s) => s.status !== "COMPLETED" && s.status !== "MISSED",
        );

    if (!pendingSession) continue;

    const sessionStatusLabel = pendingSession.scheduledTime
      ? "Scheduled — Pending Completion"
      : "Not Scheduled (Pending)";
    const scheduledTimeText = pendingSession.scheduledTime
      ? new Date(pendingSession.scheduledTime).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        }) + " IST"
      : null;

    const weekTheme =
      weekThemes[pendingSession.weekNumber] ||
      `Week ${pendingSession.weekNumber}`;

    let mentorResult = "skipped";
    let menteeResult = "skipped";

    if (pair.mentor?.email) {
      try {
        const res = await sendWeeklyReminderEmail({
          to: pair.mentor.email,
          name: pair.mentor.name,
          roleLabel: "Mentor",
          counterpartName: pair.mentee.name,
          pairId: pair.id,
          employeeCode: pair.mentorCode,
          weekNumber: pendingSession.weekNumber,
          weekTheme,
          sessionStatusLabel,
          scheduledTimeText,
          completedCount,
          customAppUrl,
        });
        if (res.sent) {
          emailsSent++;
          mentorResult = "sent";
        } else if (res.simulated) {
          emailsSimulated++;
          mentorResult = "simulated";
        }
      } catch (err) {
        emailsFailed++;
        mentorResult = `failed: ${err instanceof Error ? err.message : "error"}`;
      }
    }

    if (pair.mentee?.email) {
      try {
        const res = await sendWeeklyReminderEmail({
          to: pair.mentee.email,
          name: pair.mentee.name,
          roleLabel: "Mentee",
          counterpartName: pair.mentor.name,
          pairId: pair.id,
          employeeCode: pair.menteeCode,
          weekNumber: pendingSession.weekNumber,
          weekTheme,
          sessionStatusLabel,
          scheduledTimeText,
          completedCount,
          customAppUrl,
        });
        if (res.sent) {
          emailsSent++;
          menteeResult = "sent";
        } else if (res.simulated) {
          emailsSimulated++;
          menteeResult = "simulated";
        }
      } catch (err) {
        emailsFailed++;
        menteeResult = `failed: ${err instanceof Error ? err.message : "error"}`;
      }
    }

    pendingPairs.push({
      pairId: pair.id,
      mentorName: pair.mentor.name,
      menteeName: pair.mentee.name,
      weekNumber: pendingSession.weekNumber,
      status: sessionStatusLabel,
      mentorResult,
      menteeResult,
    });
  }

  await prisma.auditLog.create({
    data: {
      action: "WEEKLY_REMINDER_SENT",
      performedByCode,
      details: JSON.stringify({
        targetWeek: targetWeek ?? "ACTIVE_WEEK",
        totalPendingPairs: pendingPairs.length,
        emailsSent,
        emailsSimulated,
        emailsFailed,
      }),
    },
  });

  return {
    totalPendingPairs: pendingPairs.length,
    emailsSent,
    emailsSimulated,
    emailsFailed,
    pendingPairs,
  };
}

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const authHeader = req.headers.get("authorization") || "";
    const querySecret = req.nextUrl.searchParams.get("secret") || "";

    if (
      cronSecret &&
      (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret)
    ) {
      const result = await runWeeklyReminders({
        performedByCode: "SYSTEM_CRON",
        customAppUrl: req.nextUrl.origin,
      });
      return NextResponse.json({ ok: true, mode: "cron", ...result });
    }

    const user = await getSession();
    if (!user || user.role !== "ADMIN") {
      throw new AccessError(403, "Administrator access required.");
    }

    const recentLogs = await prisma.auditLog.findMany({
      where: { action: "WEEKLY_REMINDER_SENT" },
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    return NextResponse.json({ recentLogs });
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Unable to load weekly reminder history." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || user.role !== "ADMIN") {
      throw new AccessError(403, "Administrator access required.");
    }

    const body = await req.json().catch(() => ({}));
    const rawWeek = Number(body.weekNumber);
    const targetWeek =
      Number.isInteger(rawWeek) && rawWeek >= 1 && rawWeek <= 12
        ? rawWeek
        : null;

    const result = await runWeeklyReminders({
      targetWeek,
      performedByCode: user.employeeCode,
      customAppUrl: req.nextUrl.origin,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to send weekly email reminders." },
      { status: 500 },
    );
  }
}
