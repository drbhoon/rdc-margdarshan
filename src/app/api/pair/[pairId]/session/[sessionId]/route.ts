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

const MENTOR_MARKER = "=== [MENTOR TRANSCRIPTION] ===";
const MENTEE_MARKER = "=== [MENTEE TRANSCRIPTION] ===";
const LEGACY_MARKER = "=== [SHARED TRANSCRIPTION] ===";

function parseDualTranscription(raw: string | null | undefined): {
  mentor: string;
  mentee: string;
  legacy: string;
} {
  const text = (raw ?? "").trim();
  if (!text) return { mentor: "", mentee: "", legacy: "" };
  if (
    !text.includes(MENTOR_MARKER) &&
    !text.includes(MENTEE_MARKER) &&
    !text.includes(LEGACY_MARKER)
  ) {
    return { mentor: "", mentee: "", legacy: text };
  }

  let mentor = "";
  let mentee = "";
  let legacy = "";

  const extractSection = (marker: string) => {
    const startIdx = text.indexOf(marker);
    if (startIdx === -1) return "";
    const contentStart = startIdx + marker.length;
    const nextIndices = [MENTOR_MARKER, MENTEE_MARKER, LEGACY_MARKER]
      .map((m) => text.indexOf(m, contentStart))
      .filter((idx) => idx !== -1);
    const endIdx =
      nextIndices.length > 0 ? Math.min(...nextIndices) : text.length;
    return text.slice(contentStart, endIdx).trim();
  };

  mentor = extractSection(MENTOR_MARKER);
  mentee = extractSection(MENTEE_MARKER);
  legacy = extractSection(LEGACY_MARKER);
  return { mentor, mentee, legacy };
}

function formatDualTranscription(parts: {
  mentor: string;
  mentee: string;
  legacy: string;
}): string {
  const blocks: string[] = [];
  if (parts.mentor.trim()) {
    blocks.push(`${MENTOR_MARKER}\n${parts.mentor.trim()}`);
  }
  if (parts.mentee.trim()) {
    blocks.push(`${MENTEE_MARKER}\n${parts.mentee.trim()}`);
  }
  if (parts.legacy.trim()) {
    blocks.push(`${LEGACY_MARKER}\n${parts.legacy.trim()}`);
  }
  return blocks.join("\n\n");
}

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

      const isMergeableUpdate =
        body.mentorTranscription !== undefined ||
        body.menteeTranscription !== undefined ||
        body.markMeetingJoined === true;

      if (!isMergeableUpdate && body.version !== previous.version)
        throw new AccessError(
          409,
          "Someone updated this session. Reload and merge your changes.",
        );

      const isReopeningWeek =
        body.status === "SCHEDULED" &&
        (previous.status === "COMPLETED" || previous.status === "MISSED");

      // Sequential Week Restriction: Cannot jump ahead to schedule/complete Week N while an earlier week < N is still pending
      if (previous.weekNumber > 1 && !isReopeningWeek && ! body.markMeetingJoined) {
        const earlierSessions = await tx.session.findMany({
          where: {
            pairId,
            weekNumber: { lt: previous.weekNumber },
          },
          orderBy: { weekNumber: "asc" },
        });
        const earliestIncomplete = earlierSessions.find(
          (s) => s.status !== "COMPLETED" && s.status !== "MISSED",
        );
        if (earliestIncomplete) {
          throw new AccessError(
            400,
            `Week ${earliestIncomplete.weekNumber} is still in progress. Please complete Week ${earliestIncomplete.weekNumber} (or mark it as Missed for a genuine reason) before proceeding to Week ${previous.weekNumber}.`,
          );
        }
      }

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
        if (user.employeeCode !== pair.menteeCode && user.role !== "ADMIN") {
          throw new AccessError(
            403,
            "Only the Mentee can enter or submit Mentee Q&A responses.",
          );
        }
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
        if (!wasMenteeQaRecorded && !isSubmittingMenteeQa) {
          throw new AccessError(
            403,
            "Mentor comments can only be entered after the Mentee has submitted their Q&A responses.",
          );
        }
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
      ] as const)
        if (body[key] !== undefined) data[key] = textValue(body[key]);

      // Merge Mentor and Mentee Speech Transcriptions independently so both are preserved and shared
      if (
        body.mentorTranscription !== undefined ||
        body.menteeTranscription !== undefined
      ) {
        const parsed = parseDualTranscription(previous.transcriptionNotes);
        if (body.mentorTranscription !== undefined) {
          parsed.mentor = textValue(body.mentorTranscription);
        }
        if (body.menteeTranscription !== undefined) {
          if (
            !parsed.mentee &&
            parsed.legacy &&
            user.employeeCode === pair.menteeCode
          ) {
            // Migrate legacy plain-text transcript into Mentee's slot seamlessly
            parsed.legacy = "";
          }
          parsed.mentee = textValue(body.menteeTranscription);
        }
        data.transcriptionNotes = formatDualTranscription(parsed);
      } else if (body.transcriptionNotes !== undefined) {
        data.transcriptionNotes = textValue(body.transcriptionNotes);
      }

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
      if (body.isRecordingConsentGranted !== undefined || body.markMeetingJoined === true) {
        data.isRecordingConsentGranted =
          body.markMeetingJoined === true
            ? true
            : Boolean(body.isRecordingConsentGranted);
      }

      if (body.status !== undefined) {
        if (
          !["SCHEDULED", "COMPLETED", "MISSED", "RESCHEDULED"].includes(
            body.status,
          )
        )
          throw new AccessError(400, "Invalid session status.");

        if (body.status === "COMPLETED") {
          const effectiveScheduledTime =
            data.scheduledTime !== undefined
              ? data.scheduledTime
              : previous.scheduledTime;
          const effectiveMeetingJoined =
            data.isRecordingConsentGranted !== undefined
              ? Boolean(data.isRecordingConsentGranted)
              : Boolean(previous.isRecordingConsentGranted);

          if (!effectiveScheduledTime) {
            throw new AccessError(
              400,
              `Cannot mark Week ${previous.weekNumber} as Completed yet: Please select and save the Meeting Date & Time first.`,
            );
          }
          if (!effectiveMeetingJoined && user.role !== "ADMIN") {
            throw new AccessError(
              400,
              `Cannot mark Week ${previous.weekNumber} as Completed without launching/joining the Video Meeting. Please click "📹 Join / Launch Video Meeting" first (or if the session was missed for a genuine reason, click "Mark Week as Missed").`,
            );
          }
          if (!wasMenteeQaRecorded && !isSubmittingMenteeQa && user.role !== "ADMIN") {
            throw new AccessError(
              400,
              `Cannot mark Week ${previous.weekNumber} as Completed yet: Mentee Q&A responses must be submitted first.`,
            );
          }
        }

        if (body.status === "MISSED") {
          const reason = textValue(body.missedReason ?? "", 2000).trim();
          if (reason) {
            const existingNotes = (previous.meetingNotes ?? "").trim();
            const stamp = new Date().toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            });
            data.meetingNotes = existingNotes
              ? `${existingNotes}\n\n[MISSED WEEK REASON (${stamp} IST)]: ${reason}`
              : `[MISSED WEEK REASON (${stamp} IST)]: ${reason}`;
          }
        }

        data.status = body.status;
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

