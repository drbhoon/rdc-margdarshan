import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  protectedRoute,
  pairWrite,
  logChange,
  AccessError,
  textValue,
} from "@/lib/access";
import type { Prisma } from "@/generated/prisma/client";
import { sendSessionScheduledEmail, sendSessionCompletedFeedbackEmail } from "@/lib/email";
import { prisma } from "@/lib/db";

type Context = { params: Promise<{ pairId: string; sessionId: string }> };

export const PUT = protectedRoute(
  async (req: NextRequest, { params }: Context) => {
    const user = (await getSession())!;
    const { pairId, sessionId } = await params;
    const body = await req.json();

    const { session, previousSessionState } = await pairWrite(pairId, user, async (tx, pair) => {
      const previous = await tx.session.findFirst({
        where: { id: sessionId, pairId },
      });
      if (!previous) throw new AccessError(404, "Session not found.");
      if (body.version !== previous.version)
        throw new AccessError(
          409,
          "Someone updated this session. Reload and merge your changes.",
        );

      const previousState = {
        scheduledTime: previous.scheduledTime,
        googleMeetLink: previous.googleMeetLink,
        status: previous.status,
      };

      const data: Prisma.SessionUpdateInput = { version: { increment: 1 } };
      for (const key of [
        "agenda",
        "preSessionNotes",
        "discussionPoints",
        "insights",
        "commitments",
        "supportNeeded",
      ] as const)
        if (body[key] !== undefined) data[key] = textValue(body[key]);
      for (const [key, owner] of [
        ["postSessionReflectionMentee", pair.menteeCode],
        ["postSessionReflectionMentor", pair.mentorCode],
      ] as const) {
        if (body[key] !== undefined && body[key] !== previous[key]) {
          if (user.employeeCode !== owner)
            throw new AccessError(
              403,
              "Only the author can change their reflection.",
            );
          data[key] = textValue(body[key]);
        }
      }
      if (body.status !== undefined) {
        if (
          !["SCHEDULED", "COMPLETED", "MISSED", "RESCHEDULED"].includes(
            body.status,
          )
        )
          throw new AccessError(400, "Invalid session status.");
        data.status = body.status;
      }
      if (body.scheduledTime !== undefined) {
        if (body.scheduledTime === null || body.scheduledTime === "")
          data.scheduledTime = null;
        else {
          const value = textValue(body.scheduledTime, 100);
          if (
            !/(Z|[+-]\d{2}:\d{2})$/.test(value) ||
            !Number.isFinite(Date.parse(value))
          )
            throw new AccessError(400, "Meeting time must include a timezone.");
          data.scheduledTime = new Date(value);
        }
      }
      if (body.googleMeetLink !== undefined) {
        const value = textValue(body.googleMeetLink, 2000);
        if (value) {
          let url: URL;
          try {
            url = new URL(value);
          } catch {
            throw new AccessError(400, "Invalid meeting link.");
          }
          if (url.protocol !== "https:" || url.username || url.password)
            throw new AccessError(400, "Use an HTTPS meeting link.");
        }
        data.googleMeetLink = value || null;
      }
      if (body.isRecordingConsentGranted === true)
        throw new AccessError(
          400,
          "Audio/video recording is not available. Save written coaching notes instead.",
        );
      const result = await tx.session.update({
        where: { id: sessionId },
        data,
      });
      await logChange(tx, user, "UPDATE_SESSION", {
        pairId,
        sessionId,
        before: previous,
        after: result,
      });
      return { session: result, previousSessionState: previousState };
    });

    // Handle Async Email Notifications
    try {
      const pair = await prisma.mentoringPair.findUnique({
        where: { id: pairId },
        include: { mentor: true, mentee: true },
      });

      if (pair) {
        const timeChanged =
          session.scheduledTime &&
          (!previousSessionState?.scheduledTime ||
            session.scheduledTime.getTime() !== previousSessionState.scheduledTime.getTime());
        const linkChanged =
          session.googleMeetLink &&
          session.googleMeetLink !== previousSessionState?.googleMeetLink;

        // 1. Session Scheduled / Rescheduled with Google Meet
        if (timeChanged || linkChanged) {
          void sendSessionScheduledEmail({
            to: pair.mentee.email,
            name: pair.mentee.name,
            counterpartName: pair.mentor.name,
            counterpartRole: "MENTOR",
            weekNumber: session.weekNumber,
            scheduledTime: session.scheduledTime ? session.scheduledTime.toISOString() : null,
            googleMeetLink: session.googleMeetLink,
            agenda: session.agenda,
            pairId,
          });
          void sendSessionScheduledEmail({
            to: pair.mentor.email,
            name: pair.mentor.name,
            counterpartName: pair.mentee.name,
            counterpartRole: "MENTEE",
            weekNumber: session.weekNumber,
            scheduledTime: session.scheduledTime ? session.scheduledTime.toISOString() : null,
            googleMeetLink: session.googleMeetLink,
            agenda: session.agenda,
            pairId,
          });
        }

        // 2. Session Marked as Completed -> Auto trigger Feedback & Post-session email
        if (session.status === "COMPLETED" && previousSessionState?.status !== "COMPLETED") {
          void sendSessionCompletedFeedbackEmail({
            to: pair.mentee.email,
            name: pair.mentee.name,
            counterpartName: pair.mentor.name,
            counterpartRole: "MENTOR",
            weekNumber: session.weekNumber,
            discussionPoints: session.discussionPoints,
            commitments: session.commitments,
            pairId,
          });
          void sendSessionCompletedFeedbackEmail({
            to: pair.mentor.email,
            name: pair.mentor.name,
            counterpartName: pair.mentee.name,
            counterpartRole: "MENTEE",
            weekNumber: session.weekNumber,
            discussionPoints: session.discussionPoints,
            commitments: session.commitments,
            pairId,
          });
        }
      }
    } catch (mailErr) {
      console.warn("Could not dispatch session notification email:", mailErr);
    }

    return NextResponse.json({ success: true, session });
  },
);

