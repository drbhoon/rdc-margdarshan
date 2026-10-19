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

      const menteeQaKeys = [
        "agenda",
        "preSessionNotes",
        "discussionPoints",
        "insights",
        "commitments",
        "supportNeeded",
        "postSessionReflectionMentee",
      ] as const;

      const mentorQaKeys = [
        "mentorComments",
        "postSessionReflectionMentor",
      ] as const;

      const wasMenteeQaRecorded = menteeQaKeys.every(
        (k) => (previous[k] ?? "").trim().length > 0,
      );
      const wasMentorQaRecorded = mentorQaKeys.every(
        (k) => (previous[k] ?? "").trim().length > 0,
      );

      const isSubmittingMenteeQa = menteeQaKeys.some(
        (k) => body[k] !== undefined,
      );
      if (isSubmittingMenteeQa) {
        if (wasMenteeQaRecorded) {
          const isModified = menteeQaKeys.some(
            (k) =>
              body[k] !== undefined &&
              textValue(body[k]) !== (previous[k] ?? ""),
          );
          if (isModified) {
            throw new AccessError(
              403,
              "Your Q&A are Recorded. No editing is allowed.",
            );
          }
        } else {
          for (const k of menteeQaKeys) {
            const val =
              body[k] !== undefined ? textValue(body[k]) : (previous[k] ?? "");
            if (!val.trim()) {
              throw new AccessError(
                400,
                "All Mentee Q&A boxes are mandatory to fill (you may write NIL).",
              );
            }
          }
        }
      }

      const isSubmittingMentorQa = mentorQaKeys.some(
        (k) => body[k] !== undefined,
      );
      if (isSubmittingMentorQa) {
        if (wasMentorQaRecorded) {
          const isModified = mentorQaKeys.some(
            (k) =>
              body[k] !== undefined &&
              textValue(body[k]) !== (previous[k] ?? ""),
          );
          if (isModified) {
            throw new AccessError(
              403,
              "Your Q&A are Recorded. No editing is allowed.",
            );
          }
        } else {
          for (const k of mentorQaKeys) {
            const val =
              body[k] !== undefined ? textValue(body[k]) : (previous[k] ?? "");
            if (!val.trim()) {
              throw new AccessError(
                400,
                "All Mentor Q&A boxes are mandatory to fill (you may write NIL).",
              );
            }
          }
        }
      }

      const data: Prisma.SessionUpdateInput = { version: { increment: 1 } };
      for (const key of [
        "agenda",
        "preSessionNotes",
        "discussionPoints",
        "insights",
        "commitments",
        "supportNeeded",
        "meetingNotes",
        "transcriptionNotes",
      ] as const)
        if (body[key] !== undefined) data[key] = textValue(body[key]);

      if (body.mentorComments !== undefined) {
        if (user.role !== "ADMIN" && user.employeeCode !== pair.mentorCode) {
          throw new AccessError(403, "Only the mentor or administrator can write mentor guidance comments.");
        }
        data.mentorComments = textValue(body.mentorComments);
      }

      for (const [key, owner] of [
        ["postSessionReflectionMentee", pair.menteeCode],
        ["postSessionReflectionMentor", pair.mentorCode],
      ] as const) {
        if (body[key] !== undefined) {
          const nextVal = textValue(body[key]);
          const prevVal = previous[key] ?? "";
          if (nextVal !== prevVal) {
            if (user.employeeCode !== owner && user.role !== "ADMIN")
              throw new AccessError(
                403,
                "Only the author can change their reflection.",
              );
            data[key] = nextVal;
          }
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
      if (body.recordingUrl !== undefined) {
        const value = textValue(body.recordingUrl, 2000);
        if (value) {
          let url: URL;
          try {
            url = new URL(value);
          } catch {
            throw new AccessError(400, "Invalid recording link.");
          }
          if (url.protocol !== "https:" && url.protocol !== "http:")
            throw new AccessError(400, "Use a valid web link for the recording.");
        }
        data.recordingUrl = value || null;
      }
      if (body.isRecordingConsentGranted !== undefined) {
        data.isRecordingConsentGranted = Boolean(body.isRecordingConsentGranted);
      }
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

