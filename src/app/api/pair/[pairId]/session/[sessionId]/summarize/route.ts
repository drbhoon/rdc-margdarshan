import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  protectedRoute,
  pairWrite,
  AccessError,
  logChange,
} from "@/lib/access";

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

function parseDualTranscript(raw?: string | null): {
  mentor: string;
  mentee: string;
  legacy: string;
} {
  const value = (raw || "").trim();
  if (!value) return { mentor: "", mentee: "", legacy: "" };
  const mentorTag = "=== [MENTOR TRANSCRIPTION] ===";
  const menteeTag = "=== [MENTEE TRANSCRIPTION] ===";
  const mIdx = value.indexOf(mentorTag);
  const eIdx = value.indexOf(menteeTag);
  if (mIdx === -1 && eIdx === -1) {
    return { mentor: "", mentee: "", legacy: value };
  }
  let mentor = "";
  let mentee = "";
  if (mIdx !== -1 && eIdx !== -1) {
    if (mIdx < eIdx) {
      mentor = value.slice(mIdx + mentorTag.length, eIdx).trim();
      mentee = value.slice(eIdx + menteeTag.length).trim();
    } else {
      mentee = value.slice(eIdx + menteeTag.length, mIdx).trim();
      mentor = value.slice(mIdx + mentorTag.length).trim();
    }
  } else if (mIdx !== -1) {
    mentor = value.slice(mIdx + mentorTag.length).trim();
  } else if (eIdx !== -1) {
    mentee = value.slice(eIdx + menteeTag.length).trim();
  }
  return { mentor, mentee, legacy: "" };
}

function buildDeterministicMinutes({
  weekNumber,
  mentorName,
  menteeName,
  mentorSpeech,
  menteeSpeech,
  mentorComments,
  menteeNotes,
}: {
  weekNumber: number;
  mentorName: string;
  menteeName: string;
  mentorSpeech: string;
  menteeSpeech: string;
  mentorComments: string;
  menteeNotes: string;
}): string {
  const theme = weekThemes[weekNumber] || `Week ${weekNumber}`;
  const cleanSentences = (txt: string, maxItems = 4) =>
    txt
      .split(/(?<=[.!?।])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 8)
      .slice(0, maxItems);

  const lines: string[] = [
    `Week ${weekNumber} (${theme}) — Meeting Minutes & Decisions`,
    `Participants: ${mentorName} (Mentor) & ${menteeName} (Mentee)`,
    "",
    "Key Discussion Points:",
  ];

  const mentorPoints = cleanSentences(mentorSpeech, 3);
  const menteePoints = cleanSentences(menteeSpeech, 3);

  if (mentorPoints.length > 0) {
    mentorPoints.forEach((p) => lines.push(`• [Mentor] ${p}`));
  }
  if (menteePoints.length > 0) {
    menteePoints.forEach((p) => lines.push(`• [Mentee] ${p}`));
  }
  if (mentorPoints.length === 0 && menteePoints.length === 0) {
    if (menteeNotes.trim()) {
      lines.push(`• [Mentee Preparation] ${menteeNotes.trim().slice(0, 280)}`);
    } else {
      lines.push(`• Discussed Week ${weekNumber} focus area: ${theme}.`);
    }
  }

  lines.push("", "Decisions & Action Points:");
  if (mentorComments.trim()) {
    lines.push(`• Mentor Guidance & Decision: ${mentorComments.trim().slice(0, 320)}`);
  } else {
    lines.push(
      `• Follow up on practical workplace actions for "${theme}" before the next weekly check-in.`,
    );
  }

  return lines.join("\n");
}

export const POST = protectedRoute(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ pairId: string; sessionId: string }> },
  ) => {
    const user = (await getSession())!;
    const { pairId, sessionId } = await params;
    const body = await req.json().catch(() => ({}));

    const context = await pairWrite(pairId, user, async (tx, pair) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
      });
      if (!session || session.pairId !== pairId) {
        throw new AccessError(404, "Session record not found.");
      }
      const [mentor, mentee] = await Promise.all([
        tx.employee.findUnique({ where: { employeeCode: pair.mentorCode } }),
        tx.employee.findUnique({ where: { employeeCode: pair.menteeCode } }),
      ]);
      return {
        session,
        mentorName: mentor?.name || "Mentor",
        menteeName: mentee?.name || "Mentee",
      };
    });

    const parsedSaved = parseDualTranscript(context.session.transcriptionNotes);
    const mentorSpeech =
      (typeof body.mentorTranscription === "string"
        ? body.mentorTranscription.trim()
        : "") || parsedSaved.mentor;
    const menteeSpeech =
      (typeof body.menteeTranscription === "string"
        ? body.menteeTranscription.trim()
        : "") ||
      parsedSaved.mentee ||
      parsedSaved.legacy;

    const mentorComments = context.session.mentorComments || "";
    const menteeNotes = [
      context.session.agenda,
      context.session.discussionPoints,
      context.session.insights,
      context.session.commitments,
    ]
      .filter(Boolean)
      .join(" | ");

    if (
      !mentorSpeech &&
      !menteeSpeech &&
      !mentorComments.trim() &&
      !menteeNotes.trim()
    ) {
      throw new AccessError(
        400,
        "No speech transcription or Q&A notes found yet. Record speech using Start Auto-Transcribe or fill Q&A first.",
      );
    }

    let generatedMinutes = buildDeterministicMinutes({
      weekNumber: context.session.weekNumber,
      mentorName: context.mentorName,
      menteeName: context.menteeName,
      mentorSpeech,
      menteeSpeech,
      mentorComments,
      menteeNotes,
    });
    let mode: "AI" | "STRUCTURED" = "STRUCTURED";

    const key = process.env.GEMINI_API_KEY;
    if (key && (mentorSpeech || menteeSpeech)) {
      try {
        const theme =
          weekThemes[context.session.weekNumber] ||
          `Week ${context.session.weekNumber}`;
        const prompt =
          `Summarize the following Margdarshan 1-on-1 mentoring session into concise, actionable "Live Meeting Minutes & Decisions".\n` +
          `Week ${context.session.weekNumber} Theme: ${theme}\n` +
          `Mentor: ${context.mentorName}\nMentee: ${context.menteeName}\n\n` +
          `Mentor Speech Transcription:\n${mentorSpeech || "(Not recorded)"}\n\n` +
          `Mentee Speech Transcription:\n${menteeSpeech || "(Not recorded)"}\n\n` +
          `Mentee Q&A Notes:\n${menteeNotes.slice(0, 1200) || "(None)"}\n\n` +
          `Mentor Feedback:\n${mentorComments.slice(0, 800) || "(None)"}\n\n` +
          `Format cleanly as plain text (no markdown # headers, use bullet points •) with 3 short sections:\n` +
          `1) Key Discussion Summary\n2) Decisions Agreed\n3) Next Action Points`;

        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" +
            encodeURIComponent(process.env.GEMINI_MODEL || "gemini-2.5-flash") +
            ":generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": key,
            },
            signal: AbortSignal.timeout(20000),
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: 2048,
                thinkingConfig: { thinkingBudget: 0 },
              },
            }),
          },
        );
        if (response.ok) {
          const json = await response.json();
          const text = json.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text ?? "")
            .join("")
            .trim();
          if (text) {
            generatedMinutes = text;
            mode = "AI";
          }
        }
      } catch {
        // Keep deterministic structured summary
      }
    }

    await pairWrite(pairId, user, async (tx) => {
      await tx.session.update({
        where: { id: sessionId },
        data: {
          meetingNotes: generatedMinutes,
          version: { increment: 1 },
        },
      });
      await logChange(tx, user, "GENERATE_MEETING_MINUTES", {
        pairId,
        sessionId,
        weekNumber: context.session.weekNumber,
        mode,
      });
    });

    return NextResponse.json({ meetingNotes: generatedMinutes, mode });
  },
);
