"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getDiscDetails, getHarmonyAdvice } from "@/lib/disc-guide";
import { ProgressRing } from "@/components/progress-ring";
import { CollapsibleCard } from "@/components/collapsible-card";

type Person = {
  employeeCode: string;
  name: string;
  designation: string;
  department?: string | null;
  discStyle?: string | null;
  highestQualification?: string | null;
  location?: string | null;
  email?: string;
  topics?: string[];
  challenges?: string[];
  availability?: string | null;
};

type SessionRecord = {
  id: string;
  weekNumber: number;
  version: number;
  status: string;
  scheduledTime: string | null;
  googleMeetLink: string | null;
  agenda: string | null;
  preSessionNotes: string | null;
  discussionPoints: string | null;
  insights: string | null;
  commitments: string | null;
  supportNeeded: string | null;
  mentorComments?: string | null;
  meetingNotes?: string | null;
  transcriptionNotes?: string | null;
  recordingUrl?: string | null;
  isRecordingConsentGranted?: boolean;
  postSessionReflectionMentee: string | null;
  postSessionReflectionMentor: string | null;
};

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

  return {
    mentor: extractSection(MENTOR_MARKER),
    mentee: extractSection(MENTEE_MARKER),
    legacy: extractSection(LEGACY_MARKER),
  };
}

type Action = {
  id: string;
  sessionId: string;
  employeeCode: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string;
  updatedAt: string;
  evidence: string | null;
};

type Note = {
  id: string;
  content: string;
  employeeCode?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Survey = {
  id: string;
  employeeCode: string;
  weekNumber: number;
  growthRating: number;
  feedbackText: string;
};

type Chat = {
  id: string;
  employeeCode: string;
  weekNumber: number;
  question: string;
  answer: string;
  mode: string;
  createdAt: string;
};

type Pair = {
  id: string;
  version: number;
  status: string;
  mentor: Person;
  mentee: Person;
  mentorCode: string;
  menteeCode: string;
  mentorAcceptedAt?: string | null;
  menteeAcceptedAt?: string | null;
  isOffRecord: boolean;
  resumeMentor: boolean;
  resumeMentee: boolean;
  sharedGoals: string | null;
  sessions: SessionRecord[];
  notebooks: Note[];
  learningNotes: Note[];
  surveys: Survey[];
  coachingMessages: Chat[];
};

type Space = { pair: Pair; actionItems: Action[] };

const themes: Record<number, string> = {
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

const fields = [
  ["agenda", "Agenda / चर्चा की योजना"],
  ["preSessionNotes", "Preparation / तैयारी"],
  ["discussionPoints", "What we discussed / चर्चा के मुख्य बिंदु"],
  ["insights", "Learning & insights / सीख"],
  ["commitments", "Commitments / संकल्प"],
  ["supportNeeded", "Support needed / सहयोग"],
] as const;

const displayTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }) + " IST";

const istInput = (value: string | null) =>
  value
    ? new Date(new Date(value).getTime() + 19800000).toISOString().slice(0, 16)
    : "";

type Send = (path: string, method: string, body: unknown) => Promise<boolean>;

function SessionEditor({
  record,
  pair,
  userCode,
  userRole,
  blocked,
  firstPendingWeek,
  send,
  dirtyChanged,
  onAdvanceWeek,
  onOpenJourneyReview,
}: {
  record: SessionRecord;
  pair: Pair;
  userCode: string;
  userRole: string;
  blocked: boolean;
  firstPendingWeek: number;
  send: Send;
  dirtyChanged: (id: string, dirty: boolean) => void;
  onAdvanceWeek: (nextWeek: number) => void;
  onOpenJourneyReview: () => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const statusCardRef = useRef<HTMLDivElement>(null);
  const mentorSectionRef = useRef<HTMLElement>(null);

  const isMentor = userCode === pair.mentorCode || userRole === "ADMIN";
  const isMentee = userCode === pair.menteeCode;

  const parsedSavedTranscript = parseDualTranscription(record.transcriptionNotes);
  const mySavedTranscript = isMentor
    ? parsedSavedTranscript.mentor
    : parsedSavedTranscript.mentee || parsedSavedTranscript.legacy;

  const [base, setBase] = useState(record);
  const [dirty, setDirty] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionDraft, setTranscriptionDraft] = useState(
    mySavedTranscript || "",
  );
  const [meetingNotesDraft, setMeetingNotesDraft] = useState(
    record.meetingNotes || "",
  );
  const [summarizingMinutes, setSummarizingMinutes] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [localMeetingJoined, setLocalMeetingJoined] = useState(
    Boolean(record.isRecordingConsentGranted),
  );
  const [showMissedPrompt, setShowMissedPrompt] = useState(false);
  const [missedReasonDraft, setMissedReasonDraft] = useState("");

  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptionRef = useRef<string>(mySavedTranscript || "");
  const interimRef = useRef<string>("");
  const isTranscribingRef = useRef<boolean>(false);
  const lastRecordIdRef = useRef<string>(record.id);

  const [confirmMenteeSubmit, setConfirmMenteeSubmit] = useState(false);
  const [confirmMentorSubmit, setConfirmMentorSubmit] = useState(false);
  const [menteeQaError, setMenteeQaError] = useState<string | null>(null);
  const [mentorQaError, setMentorQaError] = useState<string | null>(null);
  const [editorFeedback, setEditorFeedback] = useState<{
    section: "status" | "logistics" | "mentee" | "mentor" | "minutes";
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [nextStepPrompt, setNextStepPrompt] = useState<{
    title: string;
    subtitle: string;
    steps: string[];
    onOk?: () => void;
  } | null>(null);

  const isFutureLockedWeek =
    record.weekNumber > firstPendingWeek &&
    record.status !== "COMPLETED" &&
    record.status !== "MISSED";
  const effectiveBlocked = blocked || isFutureLockedWeek;
  const hasJoinedMeeting = Boolean(
    record.isRecordingConsentGranted || localMeetingJoined,
  );

  const isMenteeQaRecorded = Boolean(
    record.agenda?.trim() &&
      record.preSessionNotes?.trim() &&
      record.discussionPoints?.trim() &&
      record.insights?.trim() &&
      record.commitments?.trim() &&
      record.supportNeeded?.trim() &&
      record.postSessionReflectionMentee?.trim(),
  );

  const isMentorQaRecorded = Boolean(
    record.mentorComments?.trim() &&
      record.postSessionReflectionMentor?.trim(),
  );

  const isMenteeBoxLocked = !isMentee || isMenteeQaRecorded || isFutureLockedWeek;
  const isMentorBoxLocked =
    !isMenteeQaRecorded || isMentorQaRecorded || isFutureLockedWeek;

  if (!dirty && !isTranscribing && base.version !== record.version) {
    setBase(record);
    if (mySavedTranscript && mySavedTranscript !== transcriptionRef.current) {
      transcriptionRef.current = mySavedTranscript;
      setTranscriptionDraft(mySavedTranscript);
    }
    if ((record.meetingNotes || "") !== meetingNotesDraft) {
      setMeetingNotesDraft(record.meetingNotes || "");
    }
  }

  useEffect(() => {
    if (record.isRecordingConsentGranted) {
      setLocalMeetingJoined(true);
    }
  }, [record.isRecordingConsentGranted]);

  useEffect(() => {
    if (record.id !== lastRecordIdRef.current) {
      lastRecordIdRef.current = record.id;
      const initialNotes = mySavedTranscript || "";
      transcriptionRef.current = initialNotes;
      interimRef.current = "";
      setTranscriptionDraft(initialNotes);
      setMeetingNotesDraft(record.meetingNotes || "");
      setInterimTranscript("");
      setLocalMeetingJoined(Boolean(record.isRecordingConsentGranted));
      form.current?.reset();
      return;
    }

    if (!dirty && !isTranscribingRef.current) {
      form.current?.reset();
      if (mySavedTranscript && mySavedTranscript !== transcriptionRef.current) {
        transcriptionRef.current = mySavedTranscript;
        setTranscriptionDraft(mySavedTranscript);
      }
      if ((record.meetingNotes || "") !== meetingNotesDraft) {
        setMeetingNotesDraft(record.meetingNotes || "");
      }
    }
  }, [
    base,
    dirty,
    mySavedTranscript,
    meetingNotesDraft,
    record.id,
    record.meetingNotes,
    record.isRecordingConsentGranted,
  ]);

  useEffect(() => {
    return () => {
      isTranscribingRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore cleanup error
      }
    };
  }, []);

  const displayedTranscript = interimTranscript
    ? transcriptionDraft
      ? `${transcriptionRef.current || transcriptionDraft} ${interimTranscript}`
      : interimTranscript
    : transcriptionDraft;

  // Background silent sync of speaker's own transcript so long calls never lose progress
  const syncMyTranscriptSilently = async (textToSave: string) => {
    if (!textToSave.trim()) return;
    try {
      await fetch(`/api/pair/${pair.id}/session/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: record.version,
          ...(isMentor
            ? { mentorTranscription: textToSave }
            : { menteeTranscription: textToSave }),
        }),
      });
    } catch {
      // ignore transient network blip during background auto-sync
    }
  };

  // Generate structured Live Meeting Minutes & Decisions from recorded Mentor/Mentee speech & Q&A
  const generateMinutesFromSpeech = async (autoTriggered = false) => {
    setSummarizingMinutes(true);
    try {
      const liveOwnSpeech =
        (transcriptionRef.current || transcriptionDraft || "").trim();
      const mentorSpeech = isMentor
        ? liveOwnSpeech || parsedSavedTranscript.mentor
        : parsedSavedTranscript.mentor;
      const menteeSpeech = !isMentor
        ? liveOwnSpeech ||
          parsedSavedTranscript.mentee ||
          parsedSavedTranscript.legacy
        : parsedSavedTranscript.mentee || parsedSavedTranscript.legacy;

      const res = await fetch(
        `/api/pair/${pair.id}/session/${record.id}/summarize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mentorTranscription: mentorSpeech,
            menteeTranscription: menteeSpeech,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        if (!autoTriggered) {
          setEditorFeedback({
            section: "minutes",
            type: "error",
            text: `⚠️ ${json.error || "Unable to generate meeting minutes."}`,
          });
        }
        return;
      }
      if (json.meetingNotes) {
        setMeetingNotesDraft(json.meetingNotes);
        setEditorFeedback({
          section: "minutes",
          type: "success",
          text: autoTriggered
            ? "✓ Saved Confirmation: Speech transcription saved & Live Meeting Minutes & Decisions generated automatically!"
            : "✓ Live Meeting Minutes & Decisions generated and saved from speech transcription!",
        });
      }
    } catch {
      if (!autoTriggered) {
        setEditorFeedback({
          section: "minutes",
          type: "error",
          text: "⚠️ Failed to generate minutes from speech. Please try again.",
        });
      }
    } finally {
      setSummarizingMinutes(false);
    }
  };

  // Handle Speech-to-Text Auto-Transcription (Unlimited Duration — Auto-Recovers Across Browser Segment Limits)
  const toggleSpeechRecognition = async () => {
    if (isTranscribing) {
      isTranscribingRef.current = false;
      setIsTranscribing(false);
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      // Flush any live interim speech into the permanent transcript immediately
      if (interimRef.current.trim()) {
        const merged = transcriptionRef.current
          ? `${transcriptionRef.current.trim()} ${interimRef.current.trim()}`
          : interimRef.current.trim();
        transcriptionRef.current = merged;
        setTranscriptionDraft(merged);
        interimRef.current = "";
        setInterimTranscript("");
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore if already stopped
        }
      }

      // Allow browser a brief moment to emit any final speech chunk on stop
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (interimRef.current.trim()) {
        const merged = transcriptionRef.current
          ? `${transcriptionRef.current.trim()} ${interimRef.current.trim()}`
          : interimRef.current.trim();
        transcriptionRef.current = merged;
        setTranscriptionDraft(merged);
        interimRef.current = "";
        setInterimTranscript("");
      }

      await saveLogisticsAndMinutes(
        undefined,
        "minutes",
        transcriptionRef.current,
      );
      if (transcriptionRef.current.trim() && !meetingNotesDraft.trim()) {
        await generateMinutesFromSpeech(true);
      }
      return;
    }

    const SpeechRec =
      (
        window as unknown as {
          SpeechRecognition?: any;
          webkitSpeechRecognition?: any;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          SpeechRecognition?: any;
          webkitSpeechRecognition?: any;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRec) {
      alert(
        "Live auto-transcription uses Web Speech API. Please use Google Chrome or Microsoft Edge for live voice recognition.",
      );
      return;
    }

    const startRecognitionSegment = () => {
      if (!isTranscribingRef.current) return;
      try {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-IN";

        rec.onresult = (event: any) => {
          let finalChunk = "";
          let liveInterim = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcriptPiece = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) {
              finalChunk += transcriptPiece + " ";
            } else {
              liveInterim += transcriptPiece + " ";
            }
          }

          if (finalChunk.trim()) {
            const updated = transcriptionRef.current
              ? `${transcriptionRef.current.trim()} ${finalChunk.trim()}`
              : finalChunk.trim();
            transcriptionRef.current = updated;
            setTranscriptionDraft(updated);
            setDirty(true);
            dirtyChanged(record.id, true);
          }

          const cleanInterim = liveInterim.trim();
          interimRef.current = cleanInterim;
          setInterimTranscript(cleanInterim);
          if (cleanInterim) {
            setDirty(true);
            dirtyChanged(record.id, true);
          }
        };

        rec.onerror = (event: any) => {
          console.warn("Speech recognition segment notice:", event.error);
          if (
            event.error === "not-allowed" ||
            event.error === "service-not-allowed"
          ) {
            isTranscribingRef.current = false;
            setIsTranscribing(false);
            if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
            if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
          }
        };

        rec.onend = () => {
          // Flush any remaining interim words so nothing ever vanishes when browser rotates recognition segments
          if (interimRef.current.trim()) {
            const updated = transcriptionRef.current
              ? `${transcriptionRef.current.trim()} ${interimRef.current.trim()}`
              : interimRef.current.trim();
            transcriptionRef.current = updated;
            setTranscriptionDraft(updated);
            interimRef.current = "";
            setInterimTranscript("");
          }

          // Browser speech API closes segments every ~2-3 minutes or after silence; spawn a fresh instance automatically!
          if (isTranscribingRef.current) {
            if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
            restartTimerRef.current = setTimeout(() => {
              if (isTranscribingRef.current) {
                startRecognitionSegment();
              }
            }, 220);
          } else {
            setIsTranscribing(false);
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err) {
        console.warn("Speech recognition segment restart retry:", err);
        if (isTranscribingRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isTranscribingRef.current) {
              startRecognitionSegment();
            }
          }, 600);
        }
      }
    };

    isTranscribingRef.current = true;
    setIsTranscribing(true);
    startRecognitionSegment();

    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setInterval(() => {
      if (isTranscribingRef.current && transcriptionRef.current.trim()) {
        void syncMyTranscriptSilently(transcriptionRef.current);
      }
    }, 20000);
  };

  const downloadTranscriptFile = () => {
    const liveMinutesInput =
      form.current?.querySelector<HTMLTextAreaElement>(
        'textarea[name="meetingNotes"]',
      )?.value ?? "";
    const effectiveMeetingNotes =
      liveMinutesInput.trim() || record.meetingNotes?.trim() || "(None recorded)";

    const liveOwnTranscript = [
      transcriptionRef.current || transcriptionDraft || mySavedTranscript || "",
      interimRef.current || interimTranscript || "",
    ]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");

    const mentorFinalTranscript = isMentor
      ? liveOwnTranscript || parsedSavedTranscript.mentor
      : parsedSavedTranscript.mentor;
    const menteeFinalTranscript = !isMentor
      ? liveOwnTranscript ||
        parsedSavedTranscript.mentee ||
        parsedSavedTranscript.legacy
      : parsedSavedTranscript.mentee || parsedSavedTranscript.legacy;

    const content = [
      `Margdarshan Mentoring Platform — Session Record & Transcript`,
      `Mentor: ${pair.mentor.name} (#${pair.mentorCode})`,
      `Mentee: ${pair.mentee.name} (#${pair.menteeCode})`,
      `Week: Week ${record.weekNumber} (${themes[record.weekNumber] || ""})`,
      `Exported: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
      `------------------------------------------------------------`,
      ``,
      `LIVE MEETING MINUTES & DECISIONS:`,
      effectiveMeetingNotes,
      ``,
      `MENTOR SPEECH TRANSCRIPTION (${pair.mentor.name}):`,
      mentorFinalTranscript || "(No Mentor speech transcription recorded)",
      ``,
      `MENTEE SPEECH TRANSCRIPTION (${pair.mentee.name}):`,
      menteeFinalTranscript || "(No Mentee speech transcription recorded)",
    ].join("\r\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Margdarshan-Week-${record.weekNumber}-Transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setEditorFeedback({
      section: "minutes",
      type: "success",
      text: `✓ Downloaded "Margdarshan-Week-${record.weekNumber}-Transcript.txt" (including both Mentor & Mentee transcripts)!`,
    });
  };

  const handleJoinVideoMeeting = () => {
    setLocalMeetingJoined(true);
    void send("/session/" + record.id, "PUT", {
      version: record.version,
      markMeetingJoined: true,
    });
  };

  // 1-Click Toggle Session Status (With Sequential Week + Meeting Joined + Q&A Checks)
  const toggleSessionCompletion = async () => {
    const isReopening =
      record.status === "COMPLETED" || record.status === "MISSED";
    const nextStatus = isReopening ? "SCHEDULED" : "COMPLETED";

    if (!isReopening) {
      if (isFutureLockedWeek) {
        setEditorFeedback({
          section: "status",
          type: "error",
          text: `⚠️ Cannot complete Week ${record.weekNumber} while Week ${firstPendingWeek} is still running/pending. Please complete (or mark as Missed) Week ${firstPendingWeek} first.`,
        });
        return;
      }
      if (!record.scheduledTime) {
        setEditorFeedback({
          section: "status",
          type: "error",
          text: `⚠️ Cannot mark Week ${record.weekNumber} as Completed yet: Please select and save the Meeting Date & Time in Meeting Logistics below first.`,
        });
        return;
      }
      if (!hasJoinedMeeting && userRole !== "ADMIN") {
        setEditorFeedback({
          section: "status",
          type: "error",
          text: `⚠️ Cannot mark Week ${record.weekNumber} as Completed without launching/joining the Video Meeting. Please click "📹 Join / Launch Video Meeting" first (or if this week was missed for a genuine reason, click "⚠️ Mark Week as Missed").`,
        });
        return;
      }
      if (!isMenteeQaRecorded && userRole !== "ADMIN") {
        setEditorFeedback({
          section: "status",
          type: "error",
          text: `⚠️ Cannot mark Week ${record.weekNumber} as Completed yet: Mentee Q&A preparation & answers must be submitted first.`,
        });
        return;
      }
    }

    const payload = {
      version: record.version,
      status: nextStatus,
    };
    if (await send("/session/" + record.id, "PUT", payload)) {
      setDirty(false);
      dirtyChanged(record.id, false);
      setEditorFeedback({
        section: "status",
        type: "success",
        text:
          nextStatus === "COMPLETED"
            ? `✓ Saved Confirmation: Week ${record.weekNumber} marked as COMPLETED!`
            : `✓ Saved Confirmation: Week ${record.weekNumber} has been re-opened!`,
      });
      if (nextStatus === "COMPLETED") {
        const isReviewWeek = [6, 12].includes(record.weekNumber);
        const nextWeekNum = record.weekNumber < 12 ? record.weekNumber + 1 : 12;
        setNextStepPrompt({
          title: `🎉 Week ${record.weekNumber} Completed!`,
          subtitle: "Here is what you need to do next:",
          steps: isReviewWeek
            ? [
                `Week ${record.weekNumber} (${themes[record.weekNumber]}) is now marked as COMPLETED.`,
                `Because Week ${record.weekNumber} is a ${record.weekNumber === 6 ? "Midpoint (Week 6)" : "Program Closing (Week 12)"} milestone, please submit your formal Growth Review (1–5 Rating & Feedback) in the Journey tab.`,
                `Click "OK" below to proceed directly to the Growth Review section.`,
              ]
            : [
                `Week ${record.weekNumber} (${themes[record.weekNumber]}) is now marked as COMPLETED.`,
                `Log or update any follow-up tasks in the "Actions" tab if needed.`,
                `Proceed to Week ${nextWeekNum} (${themes[nextWeekNum]}) to schedule your next meeting date & time and begin preparation.`,
                `Click "OK" below to proceed to Week ${nextWeekNum}.`,
              ],
          onOk: () => {
            if (isReviewWeek) {
              onOpenJourneyReview();
            } else if (record.weekNumber < 12) {
              onAdvanceWeek(nextWeekNum);
            }
          },
        });
      }
    } else {
      setEditorFeedback({
        section: "status",
        type: "error",
        text: "⚠️ Could not update session status. Please check the requirements and retry.",
      });
    }
  };

  const confirmMarkAsMissed = async () => {
    if (!missedReasonDraft.trim()) {
      setEditorFeedback({
        section: "status",
        type: "error",
        text: "⚠️ Please enter the genuine reason for missing this week's session before confirming.",
      });
      return;
    }
    const payload = {
      version: record.version,
      status: "MISSED",
      missedReason: missedReasonDraft.trim(),
    };
    if (await send("/session/" + record.id, "PUT", payload)) {
      setShowMissedPrompt(false);
      setMissedReasonDraft("");
      setDirty(false);
      dirtyChanged(record.id, false);
      const nextWeekNum = record.weekNumber < 12 ? record.weekNumber + 1 : 12;
      setEditorFeedback({
        section: "status",
        type: "success",
        text: `✓ Saved Confirmation: Week ${record.weekNumber} recorded as MISSED (with reason) and Week ${nextWeekNum} is now unlocked.`,
      });
      if (record.weekNumber < 12) {
        setNextStepPrompt({
          title: `⚠️ Week ${record.weekNumber} Recorded as Missed`,
          subtitle: "Here is what you need to do next:",
          steps: [
            `Week ${record.weekNumber} has been marked as MISSED with your recorded reason.`,
            `Week ${nextWeekNum} (${themes[nextWeekNum]}) is now unlocked.`,
            `Click "OK" below to proceed to Week ${nextWeekNum} and schedule your upcoming session.`,
          ],
          onOk: () => {
            onAdvanceWeek(nextWeekNum);
          },
        });
      }
    }
  };

  const menteeFieldList: Array<[keyof SessionRecord, string]> = [
    ["agenda", "1. Agenda / चर्चा की योजना"],
    ["preSessionNotes", "2. Preparation / तैयारी"],
    ["discussionPoints", "3. What we discussed / चर्चा के मुख्य बिंदु"],
    ["insights", "4. Learning & insights / सीख"],
    ["commitments", "5. Commitments & Experiments / संकल्प"],
    ["supportNeeded", "6. Support needed / सहयोग"],
    ["postSessionReflectionMentee", "7. Mentee Reflection / मेंटी का आत्मचिंतन"],
  ];

  const requestMenteeSubmit = () => {
    if (!form.current || isMenteeBoxLocked) return;
    const data = new FormData(form.current);
    for (const [key, label] of menteeFieldList) {
      const val = String(data.get(key) ?? "").trim();
      if (!val) {
        setMenteeQaError(
          `Please fill "${label}". All Q&A boxes are mandatory (you may write NIL if not applicable).`,
        );
        const el = form.current.querySelector<HTMLTextAreaElement>(
          `textarea[name="${key}"]`,
        );
        el?.focus();
        return;
      }
    }
    setMenteeQaError(null);
    setConfirmMenteeSubmit(true);
  };

  const executeMenteeSubmit = async () => {
    if (!form.current || isMenteeBoxLocked) return;
    const data = new FormData(form.current);
    const payload: Record<string, unknown> = { version: record.version };
    for (const [key] of menteeFieldList) {
      payload[key] = String(data.get(key) ?? "").trim();
    }
    if (await send("/session/" + record.id, "PUT", payload)) {
      setConfirmMenteeSubmit(false);
      setMenteeQaError(null);
      setDirty(false);
      dirtyChanged(record.id, false);
      setEditorFeedback({
        section: "mentee",
        type: "success",
        text: "✓ Saved Confirmation: Your Mentee Q&A preparation & answers have been permanently recorded! / आपके उत्तर सफलतापूर्वक सहेजे गए।",
      });
      setNextStepPrompt({
        title: `✅ Mentee Q&A Submitted (Week ${record.weekNumber})`,
        subtitle: "Here is what you need to do next:",
        steps: [
          `Your 7 Q&A responses for Week ${record.weekNumber} are permanently saved and shared with your Mentor (${pair.mentor.name}).`,
          `Next, your Mentor (${pair.mentor.name}) will review your answers and record their "Mentor Guidance, Feedback & Comments" in the section right below.`,
          `You can also log agreed action items in the "Actions" tab, and once the session finishes, click "✓ Mark Week as Completed" at the top of this week's page.`,
        ],
        onOk: () => {
          mentorSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        },
      });
    } else {
      setEditorFeedback({
        section: "mentee",
        type: "error",
        text: "⚠️ Failed to save Mentee Q&A. Please check your connection and try again.",
      });
    }
  };

  const requestMentorSubmit = () => {
    if (!form.current || isMentorBoxLocked) return;
    const data = new FormData(form.current);
    const comments = String(data.get("mentorComments") ?? "").trim();
    const reflection = String(data.get("postSessionReflectionMentor") ?? "").trim();
    if (!comments) {
      setMentorQaError(
        'Please fill "Mentor Guidance & Actionable Feedback". All Q&A boxes are mandatory (you may write NIL if not applicable).',
      );
      form.current.querySelector<HTMLTextAreaElement>('textarea[name="mentorComments"]')?.focus();
      return;
    }
    if (!reflection) {
      setMentorQaError(
        'Please fill "My Reflection (Mentor)". All Q&A boxes are mandatory (you may write NIL if not applicable).',
      );
      form.current.querySelector<HTMLTextAreaElement>('textarea[name="postSessionReflectionMentor"]')?.focus();
      return;
    }
    setMentorQaError(null);
    setConfirmMentorSubmit(true);
  };

  const executeMentorSubmit = async () => {
    if (!form.current || isMentorBoxLocked) return;
    const data = new FormData(form.current);
    const payload: Record<string, unknown> = {
      version: record.version,
      mentorComments: String(data.get("mentorComments") ?? "").trim(),
      postSessionReflectionMentor: String(
        data.get("postSessionReflectionMentor") ?? "",
      ).trim(),
    };
    if (await send("/session/" + record.id, "PUT", payload)) {
      setConfirmMentorSubmit(false);
      setMentorQaError(null);
      setDirty(false);
      dirtyChanged(record.id, false);
      setEditorFeedback({
        section: "mentor",
        type: "success",
        text: "✓ Saved Confirmation: Your Mentor feedback, guidance & reflection have been permanently recorded! / आपका मार्गदर्शन सफलतापूर्वक सहेजा गया।",
      });
      setNextStepPrompt({
        title: `✅ Mentor Feedback Submitted (Week ${record.weekNumber})`,
        subtitle: "Here is what you need to do next:",
        steps: [
          `Your Mentor guidance, feedback, and reflection for ${pair.mentee.name} (Mentee) are permanently saved.`,
          `Next Step: Click "✓ Mark Week as Completed" at the top of this Session Record to complete Week ${record.weekNumber} and proceed to the next week.`,
          `Click "OK" below to jump to the "✓ Mark Week as Completed" button.`,
        ],
        onOk: () => {
          statusCardRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        },
      });
    } else {
      setEditorFeedback({
        section: "mentor",
        type: "error",
        text: "⚠️ Failed to save Mentor feedback. Please try again.",
      });
    }
  };

  // Dedicated video room URL for this pair & week
  const roomName = `Margdarshan-Pair-${pair.id}-Week${record.weekNumber}`;
  const fullTabRoomUrl = `https://meet.ffmuc.net/${roomName}#config.prejoinPageEnabled=false&userInfo.displayName=${encodeURIComponent(
    isMentor ? pair.mentor.name : pair.mentee.name,
  )}`;
  const canonicalRoomUrl = `https://meet.ffmuc.net/${roomName}`;

  async function saveLogisticsAndMinutes(
    e?: FormEvent<HTMLFormElement>,
    targetSection: "logistics" | "minutes" = "logistics",
    explicitTranscript?: string,
  ) {
    if (e) e.preventDefault();
    if (!form.current) return;
    if (isFutureLockedWeek) {
      setEditorFeedback({
        section: targetSection,
        type: "error",
        text: `⚠️ Week ${record.weekNumber} is locked while Week ${firstPendingWeek} is still in progress. Please complete Week ${firstPendingWeek} first.`,
      });
      return;
    }

    const data = new FormData(form.current);
    const payload: Record<string, unknown> = { version: record.version };

    if (data.get("meetingNotes") !== null || meetingNotesDraft !== undefined) {
      payload.meetingNotes =
        meetingNotesDraft ?? String(data.get("meetingNotes") ?? "");
    }
    if (record.recordingUrl) {
      payload.recordingUrl = record.recordingUrl;
    }

    const latestTranscript =
      explicitTranscript !== undefined
        ? explicitTranscript
        : [
            transcriptionRef.current || transcriptionDraft || "",
            interimRef.current || interimTranscript || "",
          ]
            .map((s) => s.trim())
            .filter(Boolean)
            .join(" ");

    transcriptionRef.current = latestTranscript;
    setTranscriptionDraft(latestTranscript);
    if (isMentor) {
      payload.mentorTranscription = latestTranscript;
    } else {
      payload.menteeTranscription = latestTranscript;
    }

    payload.status = record.status || base.status;
    const date = String(data.get("scheduledTime") ?? "");
    if (targetSection === "logistics" && !date) {
      setEditorFeedback({
        section: "logistics",
        type: "error",
        text: "⚠️ Please select the Meeting Date & Time (IST) before clicking Save Meeting Schedule.",
      });
      return;
    }
    payload.scheduledTime = date ? date + ":00+05:30" : null;
    payload.googleMeetLink = date
      ? record.googleMeetLink || canonicalRoomUrl
      : record.googleMeetLink || "";

    if (await send("/session/" + record.id, "PUT", payload)) {
      setDirty(false);
      dirtyChanged(record.id, false);
      setEditorFeedback({
        section: targetSection,
        type: "success",
        text:
          targetSection === "minutes"
            ? `✓ Saved Confirmation: Your (${isMentor ? "Mentor" : "Mentee"}) speech transcription & meeting minutes are saved and now visible to both Mentor and Mentee below!`
            : `✓ Saved Confirmation: Week ${record.weekNumber} Meeting Date & Time scheduled! Status is now SCHEDULED.`,
      });
    } else {
      setEditorFeedback({
        section: targetSection,
        type: "error",
        text: "⚠️ Unable to save changes. Please check the fields and try again.",
      });
    }
  }

  const lockedTextareaStyle = {
    backgroundColor: "#f8fafc",
    color: "#334155",
    borderColor: "#cbd5e1",
    cursor: "not-allowed",
  };

  // Compute display status label so unscheduled sessions show "NOT SCHEDULED / PENDING" instead of "SCHEDULED"
  const statusDisplay =
    record.status === "COMPLETED"
      ? { label: "✓ COMPLETED", bg: "#22c55e", color: "#ffffff" }
      : record.status === "MISSED"
        ? { label: "⚠️ MISSED (GENUINE REASON)", bg: "#d97706", color: "#ffffff" }
        : record.scheduledTime
          ? { label: "📅 SCHEDULED", bg: "#4f46e5", color: "#ffffff" }
          : { label: "⏳ NOT SCHEDULED (PENDING)", bg: "#f59e0b", color: "#ffffff" };

  return (
    <form
      ref={form}
      onSubmit={saveLogisticsAndMinutes}
      onChange={() => {
        setDirty(true);
        dirtyChanged(record.id, true);
      }}
      className="space-y-6"
    >
      {dirty && record.version !== base.version && (
        <p className="notice warning">
          A newer version is available. Your draft is still here. Copy any text
          you need, then reload the saved version.
        </p>
      )}

      {isFutureLockedWeek && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            backgroundColor: "#fffbeb",
            border: "2px solid #f59e0b",
            color: "#92400e",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div>
            🔒 <strong>Sequential Week Progression:</strong> Week{" "}
            {firstPendingWeek} is currently running/pending. Jumping ahead to
            schedule or complete Week {record.weekNumber} is restricted until
            Week {firstPendingWeek} is marked as <strong>Completed</strong> (or{" "}
            <strong>Missed</strong> for a genuine reason).
          </div>
          <button
            type="button"
            onClick={() => onAdvanceWeek(firstPendingWeek)}
            style={{
              backgroundColor: "#d97706",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 12,
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            ← Go to Active Week {firstPendingWeek}
          </button>
        </div>
      )}

      {/* Top Session Status & 1-Click Completion Header */}
      <div
        ref={statusCardRef}
        className="record"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          backgroundColor:
            record.status === "COMPLETED"
              ? "#f0fdf4"
              : record.status === "MISSED"
                ? "#fffbeb"
                : "#f8fafc",
          borderColor:
            record.status === "COMPLETED"
              ? "#86efac"
              : record.status === "MISSED"
                ? "#fde68a"
                : "#e2e8f0",
        }}
      >
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: record.status === "COMPLETED" ? "#15803d" : "#64748b",
            }}
          >
            Session Status
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span
              className="pill"
              style={{
                backgroundColor: statusDisplay.bg,
                color: statusDisplay.color,
                fontWeight: 700,
              }}
            >
              {statusDisplay.label}
            </span>
            <span style={{ fontSize: 13, color: "#475569" }}>
              Week {record.weekNumber} of 12 · {themes[record.weekNumber]}
            </span>
            {record.scheduledTime && (
              <span
                className="pill"
                style={{
                  backgroundColor: "#eef2ff",
                  color: "#3730a3",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                🕒 {displayTime(record.scheduledTime)}
              </span>
            )}
            {hasJoinedMeeting && (
              <span
                className="pill"
                style={{
                  backgroundColor: "#dcfce7",
                  color: "#166534",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                ✓ Video Meeting Joined
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {record.status !== "COMPLETED" &&
            record.status !== "MISSED" &&
            !isFutureLockedWeek && (
              <button
                type="button"
                disabled={blocked}
                onClick={() => setShowMissedPrompt((v) => !v)}
                className="secondary"
                style={{
                  fontWeight: 700,
                  padding: "8px 14px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#92400e",
                  borderColor: "#f59e0b",
                  backgroundColor: "#fffbeb",
                }}
              >
                ⚠️ Mark Week as Missed (Genuine Reason)
              </button>
            )}

          <button
            type="button"
            disabled={
              blocked ||
              (isFutureLockedWeek &&
                record.status !== "COMPLETED" &&
                record.status !== "MISSED")
            }
            onClick={toggleSessionCompletion}
            style={{
              backgroundColor:
                record.status === "COMPLETED" || record.status === "MISSED"
                  ? "#e2e8f0"
                  : "#16a34a",
              color:
                record.status === "COMPLETED" || record.status === "MISSED"
                  ? "#334155"
                  : "#ffffff",
              fontWeight: 700,
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: 13,
              border: "none",
            }}
          >
            {record.status === "COMPLETED" || record.status === "MISSED"
              ? "Re-open Week / पुनः खोलें"
              : "✓ Mark Week as Completed / सत्र पूर्ण हुआ"}
          </button>
        </div>

        {showMissedPrompt && (
          <div
            style={{
              width: "100%",
              marginTop: 6,
              padding: "12px 14px",
              borderRadius: 10,
              backgroundColor: "#fffbeb",
              border: "2px solid #f59e0b",
            }}
          >
            <label style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
              Genuine Reason for Missing Week {record.weekNumber} (Mandatory):
              <textarea
                value={missedReasonDraft}
                onChange={(e) => setMissedReasonDraft(e.target.value)}
                placeholder="e.g. Plant dispatch emergency / medical leave / official outstation audit..."
                rows={2}
                style={{ marginTop: 6, backgroundColor: "#ffffff" }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => void confirmMarkAsMissed()}
                style={{
                  backgroundColor: "#d97706",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ✓ Confirm Missed Week &amp; Unlock Next Week
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setShowMissedPrompt(false);
                  setMissedReasonDraft("");
                }}
                style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {editorFeedback?.section === "status" && (
          <div
            role="status"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              backgroundColor:
                editorFeedback.type === "error" ? "#fef2f2" : "#dcfce7",
              border: `1px solid ${
                editorFeedback.type === "error" ? "#fecaca" : "#86efac"
              }`,
              color: editorFeedback.type === "error" ? "#b91c1c" : "#166534",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {editorFeedback.text}
          </div>
        )}
      </div>

      <fieldset disabled={effectiveBlocked} className="space-y-6">
        {/* ========================================================================= */}
        {/* MEETING LOGISTICS & VIDEO CALL (SINGLE UNIFIED MEETING OPTION)            */}
        {/* ========================================================================= */}
        <section className="record" style={{ backgroundColor: "#f8fafc" }}>
          <h3 style={{ marginTop: 0 }}>
            Meeting Logistics & Video Call / बैठक और वीडियो कॉल
          </h3>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              gap: 12,
            }}
          >
            <label style={{ flex: "1 1 260px", marginBottom: 0 }}>
              Meeting Date &amp; Time (IST) / बैठक का दिनांक और समय
              <input
                type="datetime-local"
                name="scheduledTime"
                defaultValue={istInput(base.scheduledTime)}
              />
            </label>

            <button
              type="button"
              onClick={() => void saveLogisticsAndMinutes(undefined, "logistics")}
              className="secondary"
              style={{
                fontSize: 13,
                fontWeight: 700,
                padding: "9px 16px",
                borderRadius: 8,
              }}
            >
              💾 Save Meeting Schedule
            </button>

            <a
              href={fullTabRoomUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleJoinVideoMeeting}
              className="button"
              style={{
                fontSize: 13,
                fontWeight: 700,
                padding: "9px 18px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: "#4f46e5",
                color: "#ffffff",
                borderRadius: 8,
              }}
            >
              📹 Join / Launch Video Meeting (Full Tab)
            </a>
          </div>

          <p className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
            Step 1: Select &amp; save your Meeting Date &amp; Time above (changes status from <em>Not Scheduled</em> to <em>Scheduled</em>). Step 2: Click <strong>📹 Join / Launch Video Meeting</strong> to open your pair&apos;s video room.
          </p>

          {editorFeedback?.section === "logistics" && (
            <div
              role="status"
              style={{
                marginTop: 10,
                padding: "8px 12px",
                borderRadius: 8,
                backgroundColor:
                  editorFeedback.type === "error" ? "#fef2f2" : "#dcfce7",
                border: `1px solid ${
                  editorFeedback.type === "error" ? "#fecaca" : "#86efac"
                }`,
                color:
                  editorFeedback.type === "error" ? "#b91c1c" : "#166534",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {editorFeedback.text}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* MENTEE PREPARATION & WEEKLY Q&A RESPONSES                                 */}
        {/* ========================================================================= */}
        <section className="record" style={{ backgroundColor: "#ffffff" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: 8,
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#1e293b" }}>
                Mentee Q&A Preparation & Learning / मेंटी के उत्तर
              </h3>
              <p className="muted" style={{ fontSize: 12, margin: "2px 0 0 0" }}>
                Mentee: <strong>{pair.mentee.name}</strong> ({pair.mentee.designation})
              </p>
            </div>
            <span
              className="pill"
              style={{
                backgroundColor: isMenteeQaRecorded
                  ? "#dcfce7"
                  : isMentee
                  ? "#e0e7ff"
                  : "#f1f5f9",
                color: isMenteeQaRecorded
                  ? "#166534"
                  : isMentee
                  ? "#3730a3"
                  : "#475569",
                fontWeight: 700,
              }}
            >
              {isMenteeQaRecorded
                ? "✓ Q&A Recorded"
                : isMentee
                ? "You (Mentee Author)"
                : `${pair.mentee.name}'s Submission (Read-Only for Mentor)`}
            </span>
          </div>

          {!isMenteeQaRecorded && isMentee && (
            <div
              style={{
                padding: "8px 12px",
                marginBottom: 14,
                borderRadius: 8,
                backgroundColor: "#eef2ff",
                border: "1px solid #c7d2fe",
                fontSize: 12,
                color: "#3730a3",
              }}
            >
              <strong>Mandatory Q&A:</strong> All 7 boxes below are mandatory to fill before saving. You may write <strong>NIL</strong> if not applicable. Once submitted, no editing is allowed.
            </div>
          )}

          {!isMenteeQaRecorded && !isMentee && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: 14,
                borderRadius: 8,
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                fontSize: 12,
                color: "#92400e",
                fontWeight: 600,
              }}
            >
              🔒 <strong>Mentee Section (Read-Only for Mentor):</strong> Only Mentee (<strong>{pair.mentee.name}</strong>) can enter comments in these 7 boxes. Waiting for {pair.mentee.name} to submit their Q&amp;A responses for Week {record.weekNumber}.
            </div>
          )}

          <div className="space-y-4">
            <label>
              <span>
                1. Agenda / चर्चा की योजना <span style={{ color: "#dc2626" }}>*</span>
              </span>
              <textarea
                name="agenda"
                defaultValue={base.agenda ?? ""}
                readOnly={isMenteeBoxLocked}
                onChange={() => setMenteeQaError(null)}
                placeholder={
                  isMentee
                    ? "Key topics to cover in this session... (Mandatory — write NIL if not applicable)"
                    : `Waiting for Mentee (${pair.mentee.name}) to enter Agenda...`
                }
                maxLength={20000}
                style={isMenteeBoxLocked ? lockedTextareaStyle : undefined}
              />
            </label>

            <label>
              <span>
                2. Preparation / तैयारी <span style={{ color: "#dc2626" }}>*</span>
              </span>
              <textarea
                name="preSessionNotes"
                defaultValue={base.preSessionNotes ?? ""}
                readOnly={isMenteeBoxLocked}
                onChange={() => setMenteeQaError(null)}
                placeholder={
                  isMentee
                    ? "What have you studied, observed, or prepared before this discussion? (Mandatory — write NIL if not applicable)"
                    : `Waiting for Mentee (${pair.mentee.name}) to enter Preparation notes...`
                }
                maxLength={20000}
                style={isMenteeBoxLocked ? lockedTextareaStyle : undefined}
              />
            </label>

            <label>
              <span>
                3. What we discussed / चर्चा के मुख्य बिंदु <span style={{ color: "#dc2626" }}>*</span>
              </span>
              <textarea
                name="discussionPoints"
                defaultValue={base.discussionPoints ?? ""}
                readOnly={isMenteeBoxLocked}
                onChange={() => setMenteeQaError(null)}
                placeholder={
                  isMentee
                    ? "Key points and insights explored during the conversation... (Mandatory — write NIL if not applicable)"
                    : `Waiting for Mentee (${pair.mentee.name}) to enter Discussion Points...`
                }
                maxLength={20000}
                style={isMenteeBoxLocked ? lockedTextareaStyle : undefined}
              />
            </label>

            <label>
              <span>
                4. Learning & insights / सीख <span style={{ color: "#dc2626" }}>*</span>
              </span>
              <textarea
                name="insights"
                defaultValue={base.insights ?? ""}
                readOnly={isMenteeBoxLocked}
                onChange={() => setMenteeQaError(null)}
                placeholder={
                  isMentee
                    ? "What was your biggest takeaway from this session? (Mandatory — write NIL if not applicable)"
                    : `Waiting for Mentee (${pair.mentee.name}) to enter Learning & Insights...`
                }
                maxLength={20000}
                style={isMenteeBoxLocked ? lockedTextareaStyle : undefined}
              />
            </label>

            <label>
              <span>
                5. Commitments & Experiments / संकल्प <span style={{ color: "#dc2626" }}>*</span>
              </span>
              <textarea
                name="commitments"
                defaultValue={base.commitments ?? ""}
                readOnly={isMenteeBoxLocked}
                onChange={() => setMenteeQaError(null)}
                placeholder={
                  isMentee
                    ? "Specific actions you will take on the plant/site before the next week... (Mandatory — write NIL if not applicable)"
                    : `Waiting for Mentee (${pair.mentee.name}) to enter Commitments...`
                }
                maxLength={20000}
                style={isMenteeBoxLocked ? lockedTextareaStyle : undefined}
              />
            </label>

            <label>
              <span>
                6. Support needed / सहयोग <span style={{ color: "#dc2626" }}>*</span>
              </span>
              <textarea
                name="supportNeeded"
                defaultValue={base.supportNeeded ?? ""}
                readOnly={isMenteeBoxLocked}
                onChange={() => setMenteeQaError(null)}
                placeholder={
                  isMentee
                    ? "Support, telemetry access, or coaching needed from mentor/leadership... (Mandatory — write NIL if not applicable)"
                    : `Waiting for Mentee (${pair.mentee.name}) to enter Support Needed...`
                }
                maxLength={20000}
                style={isMenteeBoxLocked ? lockedTextareaStyle : undefined}
              />
            </label>

            <label>
              <span>
                7. Mentee Reflection / मेंटी का आत्मचिंतन <span style={{ color: "#dc2626" }}>*</span>
              </span>
              <textarea
                name="postSessionReflectionMentee"
                defaultValue={base.postSessionReflectionMentee ?? ""}
                readOnly={isMenteeBoxLocked}
                onChange={() => setMenteeQaError(null)}
                placeholder={
                  isMentee
                    ? "Personal reflection on your progress and growth this week... (Mandatory — write NIL if not applicable)"
                    : `Waiting for Mentee (${pair.mentee.name}) to enter Mentee Reflection...`
                }
                maxLength={20000}
                style={isMenteeBoxLocked ? lockedTextareaStyle : undefined}
              />
            </label>

            {menteeQaError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ⚠️ {menteeQaError}
              </div>
            )}

            {isMenteeQaRecorded ? (
              <div
                style={{
                  width: "100%",
                  padding: "12px 18px",
                  borderRadius: 10,
                  backgroundColor: "#dcfce7",
                  border: "1px solid #86efac",
                  color: "#166534",
                  fontWeight: 800,
                  fontSize: 14,
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>✓ Mentee Q&A are Recorded</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d" }}>
                  (No Editing Allowed)
                </span>
              </div>
            ) : !isMentee ? (
              <div
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                ⏳ Waiting for Mentee ({pair.mentee.name}) to enter and submit their Q&amp;A responses.
              </div>
            ) : confirmMenteeSubmit ? (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  backgroundColor: "#fffbeb",
                  border: "2px solid #f59e0b",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#92400e" }}>
                    ⚠️ Do you Wish to Submit Now?
                  </p>
                  <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#b45309" }}>
                    Once submitted, your Q&A are recorded and no further editing is allowed.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={executeMenteeSubmit}
                    style={{
                      backgroundColor: "#16a34a",
                      color: "#ffffff",
                      fontWeight: 700,
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    ✓ Yes, Submit Now
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setConfirmMenteeSubmit(false)}
                    style={{ padding: "8px 14px", borderRadius: 8 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={requestMenteeSubmit}
                style={{
                  width: "100%",
                  backgroundColor: "#4f46e5",
                  color: "#fff",
                  fontWeight: 700,
                  padding: "10px 18px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                💾 Save Preparation & Answers / उत्तर सहेजें
              </button>
            )}

            {editorFeedback?.section === "mentee" && (
              <div
                role="status"
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  backgroundColor:
                    editorFeedback.type === "error" ? "#fef2f2" : "#dcfce7",
                  border: `1px solid ${
                    editorFeedback.type === "error" ? "#fecaca" : "#86efac"
                  }`,
                  color:
                    editorFeedback.type === "error" ? "#b91c1c" : "#166534",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {editorFeedback.text}
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* MENTOR GUIDANCE & COMMENTS (DIRECTLY BELOW MENTEE ANSWERS)               */}
        {/* ========================================================================= */}
        <section
          ref={mentorSectionRef}
          className="record"
          style={{
            backgroundColor: "#f0fdf4",
            borderColor: "#bbf7d0",
            borderWidth: 2,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#166534" }}>
                Mentor Guidance, Feedback & Comments / मेंटर की टिप्पणियां और मार्गदर्शन
              </h3>
              <p style={{ fontSize: 12, color: "#15803d", margin: "2px 0 0 0" }}>
                Mentor: <strong>{pair.mentor.name}</strong> ({pair.mentor.designation})
              </p>
            </div>
            <span
              className="pill"
              style={{
                backgroundColor: "#dcfce7",
                color: "#166534",
                fontWeight: 700,
              }}
            >
              {isMentorQaRecorded
                ? "✓ Q&A Recorded"
                : !isMenteeQaRecorded
                  ? "🔒 Awaiting Mentee Q&A"
                  : "Mentor Review"}
            </span>
          </div>

          {/* If Mentor: Rich Editor for Mentor Comments */}
          {isMentor ? (
            <div className="space-y-4">
              {!isMenteeQaRecorded ? (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    backgroundColor: "#fffbeb",
                    border: "1px solid #f59e0b",
                    fontSize: 13,
                    color: "#92400e",
                    fontWeight: 600,
                  }}
                >
                  🔒 <strong>Waiting for Mentee Submission:</strong> Mentor comment boxes unlock once Mentee (<strong>{pair.mentee.name}</strong>) has entered and submitted their Q&amp;A responses above.
                </div>
              ) : (
                !isMentorQaRecorded && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      backgroundColor: "#dcfce7",
                      border: "1px solid #86efac",
                      fontSize: 12,
                      color: "#166534",
                    }}
                  >
                    <strong>Mandatory Q&A:</strong> Both Mentor Q&A boxes below are mandatory to fill before saving. You may write <strong>NIL</strong> if not applicable. Once submitted, no editing is allowed.
                  </div>
                )
              )}

              <label>
                <span>
                  1. Mentor Guidance & Actionable Feedback for {pair.mentee.name}{" "}
                  <span style={{ color: "#dc2626" }}>*</span>
                </span>
                <textarea
                  name="mentorComments"
                  defaultValue={base.mentorComments ?? ""}
                  readOnly={isMentorBoxLocked}
                  onChange={() => setMentorQaError(null)}
                  placeholder={
                    !isMenteeQaRecorded
                      ? `Unlocks after Mentee (${pair.mentee.name}) submits their Q&A comments above...`
                      : "Share feedback on mentee's answers, praise for initiative, guidance on RDC plant operations, and agreed next steps... (Mandatory — write NIL if not applicable)"
                  }
                  rows={4}
                  maxLength={20000}
                  style={
                    isMentorBoxLocked
                      ? lockedTextareaStyle
                      : {
                          borderColor: "#86efac",
                          backgroundColor: "#ffffff",
                          fontSize: 13,
                        }
                  }
                />
              </label>

              <label>
                <span>
                  2. My Reflection (Mentor) / मेरा आत्मचिंतन (मेंटर){" "}
                  <span style={{ color: "#dc2626" }}>*</span>
                </span>
                <textarea
                  name="postSessionReflectionMentor"
                  defaultValue={base.postSessionReflectionMentor ?? ""}
                  readOnly={isMentorBoxLocked}
                  onChange={() => setMentorQaError(null)}
                  placeholder={
                    !isMenteeQaRecorded
                      ? `Unlocks after Mentee (${pair.mentee.name}) submits their Q&A comments above...`
                      : "Reflect on your coaching style, listening balance, and progress observed... (Mandatory — write NIL if not applicable)"
                  }
                  rows={2}
                  maxLength={20000}
                  style={
                    isMentorBoxLocked
                      ? lockedTextareaStyle
                      : {
                          borderColor: "#86efac",
                          backgroundColor: "#ffffff",
                          fontSize: 13,
                        }
                  }
                />
              </label>

              {mentorQaError && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  ⚠️ {mentorQaError}
                </div>
              )}

              {isMentorQaRecorded ? (
                <div
                  style={{
                    width: "100%",
                    padding: "12px 18px",
                    borderRadius: 10,
                    backgroundColor: "#dcfce7",
                    border: "1px solid #86efac",
                    color: "#166534",
                    fontWeight: 800,
                    fontSize: 14,
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span>✓ Your Q&A are Recorded</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d" }}>
                    (No Editing Allowed)
                  </span>
                </div>
              ) : !isMenteeQaRecorded ? (
                <div
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    backgroundColor: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  🔒 Mentor feedback submission will unlock once {pair.mentee.name} (Mentee) submits their Q&amp;A responses above.
                </div>
              ) : confirmMentorSubmit ? (
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 10,
                    backgroundColor: "#fffbeb",
                    border: "2px solid #f59e0b",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#92400e" }}>
                      ⚠️ Do you Wish to Submit Now?
                    </p>
                    <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#b45309" }}>
                      Once submitted, your Q&A are recorded and no further editing is allowed.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={executeMentorSubmit}
                      style={{
                        backgroundColor: "#16a34a",
                        color: "#ffffff",
                        fontWeight: 700,
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      ✓ Yes, Submit Now
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setConfirmMentorSubmit(false)}
                      style={{ padding: "8px 14px", borderRadius: 8 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={requestMentorSubmit}
                  style={{
                    width: "100%",
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    fontWeight: 700,
                    padding: "10px 18px",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  💾 Save Mentor Feedback & Comments / मार्गदर्शन सहेजें
                </button>
              )}

              {editorFeedback?.section === "mentor" && (
                <div
                  role="status"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    backgroundColor:
                      editorFeedback.type === "error" ? "#fef2f2" : "#dcfce7",
                    border: `1px solid ${
                      editorFeedback.type === "error" ? "#fecaca" : "#86efac"
                    }`,
                    color:
                      editorFeedback.type === "error" ? "#b91c1c" : "#166534",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {editorFeedback.text}
                </div>
              )}
            </div>
          ) : (
            /* If Mentee: High-Visibility View of Mentor's Feedback */
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: 14,
                borderRadius: 8,
                border: "1px solid #bbf7d0",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    backgroundColor: "#dcfce7",
                    color: "#166534",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {pair.mentor.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: "0 0 6px 0",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#166534",
                    }}
                  >
                    Feedback from {pair.mentor.name}:
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "#1e293b",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.5,
                    }}
                  >
                    {base.mentorComments ||
                      "Your mentor has not added guidance comments for this week yet. They will appear here once saved."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* IN-PORTAL MEETING NOTES & AUTO-TRANSCRIBE                                 */}
        {/* ========================================================================= */}
        <section className="record" style={{ backgroundColor: "#f8fafc" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>
                In-Portal Meeting Minutes &amp; Dual Speech Transcription (Mentor &amp; Mentee)
              </h3>
              <p className="muted" style={{ fontSize: 12, margin: "2px 0 0 0" }}>
                Your microphone records <strong>{isMentor ? `Mentor (${pair.mentor.name})` : `Mentee (${pair.mentee.name})`}</strong> speech on your page without time limits (auto-saves every 20s). After saving, <strong>both Mentor &amp; Mentee can view and download both speech transcriptions</strong> below.
              </p>
            </div>
            <button
              type="button"
              disabled={isFutureLockedWeek}
              onClick={() => void toggleSpeechRecognition()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: isTranscribing ? "#ef4444" : "#4f46e5",
                color: "#ffffff",
                border: "none",
                cursor: isFutureLockedWeek ? "not-allowed" : "pointer",
              }}
            >
              {isTranscribing
                ? "⏹️ Stop & Auto-Save Voice Transcribe"
                : `🎙️ Start Auto-Transcribe (${isMentor ? "Mentor Speech" : "Mentee Speech"})`}
            </button>
          </div>

          <div
            style={{
              padding: "8px 12px",
              marginBottom: 10,
              borderRadius: 8,
              backgroundColor: "#eef2ff",
              border: "1px solid #c7d2fe",
              fontSize: 12,
              color: "#3730a3",
            }}
          >
            📍 <strong>How Dual Mentor &amp; Mentee Speech Transcription Works:</strong> Because browser microphones capture the local speaker, turning on <strong>🎙️ Start Auto-Transcribe</strong> on the <strong>Mentor&apos;s page</strong> records the Mentor&apos;s speech, and turning it on on the <strong>Mentee&apos;s page</strong> records the Mentee&apos;s speech. It runs continuously with <strong>no time limit</strong> and auto-syncs every 20 seconds. Once saved, <strong>both Mentor &amp; Mentee can read and download both recorded transcriptions</strong> in the <em>Shared Speech Transcription Record</em> card below!
          </div>

          {isTranscribing && (
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                borderRadius: 6,
                fontSize: 12,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                  display: "inline-block",
                }}
              />
              Listening continuously via microphone (unlimited duration — auto-saving every 20s)... Your spoken words ({isMentor ? pair.mentor.name : pair.mentee.name}) are appearing below. Click &ldquo;Stop &amp; Auto-Save&rdquo; when finished.
            </div>
          )}

          <div className="grid">
            <label>
              Live Meeting Minutes &amp; Decisions / बैठक के मुख्य बिंदु
              <textarea
                name="meetingNotes"
                value={meetingNotesDraft}
                onChange={(e) => {
                  setMeetingNotesDraft(e.target.value);
                  setDirty(true);
                  dirtyChanged(record.id, true);
                }}
                placeholder="Minutes & decisions auto-generate when you stop voice transcription (or click 'Generate Minutes from Speech' below), or you can type/edit directly..."
                rows={4}
                maxLength={20000}
              />
            </label>

            <label>
              🎙️ Your Speech Transcription ({isMentor ? `Mentor: ${pair.mentor.name}` : `Mentee: ${pair.mentee.name}`}) / आपका ट्रांसक्रिप्शन
              <textarea
                value={displayedTranscript}
                onChange={(e) => {
                  const val = e.target.value;
                  transcriptionRef.current = val;
                  setTranscriptionDraft(val);
                  interimRef.current = "";
                  setInterimTranscript("");
                  setDirty(true);
                  dirtyChanged(record.id, true);
                }}
                placeholder={`Click "Start Auto-Transcribe" to capture ${isMentor ? `${pair.mentor.name}'s (Mentor)` : `${pair.mentee.name}'s (Mentee)`} speech here (unlimited duration), or type/edit directly...`}
                rows={4}
                maxLength={20000}
              />
            </label>
          </div>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => void saveLogisticsAndMinutes(undefined, "minutes")}
              style={{ fontSize: 12, padding: "6px 14px" }}
            >
              💾 Save Meeting Notes &amp; Transcription
            </button>
            <button
              type="button"
              disabled={summarizingMinutes}
              onClick={() => void generateMinutesFromSpeech(false)}
              style={{
                fontSize: 12,
                padding: "6px 14px",
                backgroundColor: "#0f766e",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                fontWeight: 700,
                cursor: summarizingMinutes ? "wait" : "pointer",
              }}
            >
              {summarizingMinutes
                ? "⏳ Generating Minutes..."
                : "✨ Generate Minutes & Decisions from Speech"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={downloadTranscriptFile}
              style={{ fontSize: 12, padding: "6px 14px" }}
            >
              ⬇️ Download Full Transcript (Mentor + Mentee .txt)
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  const mentorSpeech = isMentor
                    ? displayedTranscript.trim() || parsedSavedTranscript.mentor
                    : parsedSavedTranscript.mentor;
                  const menteeSpeech = !isMentor
                    ? displayedTranscript.trim() ||
                      parsedSavedTranscript.mentee ||
                      parsedSavedTranscript.legacy
                    : parsedSavedTranscript.mentee || parsedSavedTranscript.legacy;
                  const combinedText = [
                    `=== Mentor (${pair.mentor.name}) Speech Transcription ===\n${mentorSpeech || "(None recorded yet)"}`,
                    `=== Mentee (${pair.mentee.name}) Speech Transcription ===\n${menteeSpeech || "(None recorded yet)"}`,
                  ].join("\n\n");
                  void navigator.clipboard.writeText(combinedText);
                  setCopiedTranscript(true);
                  setTimeout(() => setCopiedTranscript(false), 2500);
                }
              }}
              style={{ fontSize: 12, padding: "6px 14px" }}
            >
              {copiedTranscript ? "✓ Copied Both Transcripts!" : "📋 Copy Full Transcript"}
            </button>
          </div>

          {editorFeedback?.section === "minutes" && (
            <div
              role="status"
              style={{
                marginTop: 10,
                padding: "8px 12px",
                borderRadius: 8,
                backgroundColor:
                  editorFeedback.type === "error" ? "#fef2f2" : "#dcfce7",
                border: `1px solid ${
                  editorFeedback.type === "error" ? "#fecaca" : "#86efac"
                }`,
                color: editorFeedback.type === "error" ? "#b91c1c" : "#166534",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {editorFeedback.text}
            </div>
          )}

          {/* Shared Access Card: Always shows both Mentor & Mentee saved speech transcriptions */}
          <div
            style={{
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 8,
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
            }}
          >
            <strong style={{ fontSize: 12, color: "#1e293b", display: "block", marginBottom: 8 }}>
              📁 Shared Session Record — Both Mentor &amp; Mentee Speech Transcriptions (Week {record.weekNumber}):
            </strong>

            {record.meetingNotes?.trim() && (
              <div style={{ marginBottom: 10, padding: "8px 10px", backgroundColor: "#f8fafc", borderRadius: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>
                  📝 Saved Meeting Minutes:
                </span>
                <pre style={{ margin: "4px 0 0", fontSize: 12, whiteSpace: "pre-wrap" }}>
                  {record.meetingNotes}
                </pre>
              </div>
            )}

            <div className="grid" style={{ gap: 10 }}>
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "#166534" }}>
                  🎙️ Mentor&apos;s Recorded Speech ({pair.mentor.name}):
                </span>
                <pre
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                    color: parsedSavedTranscript.mentor ? "#1e293b" : "#64748b",
                  }}
                >
                  {parsedSavedTranscript.mentor ||
                    "No Mentor speech transcription saved yet. (Recorded when Mentor turns on Start Auto-Transcribe on the Mentor page and saves.)"}
                </pre>
              </div>

              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "#1e40af" }}>
                  🎙️ Mentee&apos;s Recorded Speech ({pair.mentee.name}):
                </span>
                <pre
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                    color:
                      parsedSavedTranscript.mentee || parsedSavedTranscript.legacy
                        ? "#1e293b"
                        : "#64748b",
                  }}
                >
                  {parsedSavedTranscript.mentee ||
                    parsedSavedTranscript.legacy ||
                    "No Mentee speech transcription saved yet. (Recorded when Mentee turns on Start Auto-Transcribe on the Mentee page and saves.)"}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </fieldset>

      {/* Dirty Draft Controls */}
      {dirty && (
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (
                window.confirm(
                  "Discard unsaved changes and reload the saved record?",
                )
              ) {
                setDirty(false);
                dirtyChanged(record.id, false);
                setBase(record);
                const savedTranscript = mySavedTranscript || "";
                transcriptionRef.current = savedTranscript;
                interimRef.current = "";
                setTranscriptionDraft(savedTranscript);
                setMeetingNotesDraft(record.meetingNotes || "");
                setInterimTranscript("");
                form.current?.reset();
              }
            }}
          >
            Reload saved version
          </button>
        </div>
      )}

      {/* Historical Reflections Accordion (Mentor First, Then Mentee) */}
      <details className="record" style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          View saved reflections from both participants ({pair.mentor.name} &amp; {pair.mentee.name})
        </summary>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <div style={{ padding: 10, backgroundColor: "#f8fafc", borderRadius: 6 }}>
            <strong style={{ fontSize: 12, color: "#64748b" }}>
              {pair.mentor.name} (Mentor):
            </strong>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#1e293b" }}>
              {record.postSessionReflectionMentor || "No reflection saved yet."}
            </p>
          </div>

          <div style={{ padding: 10, backgroundColor: "#f8fafc", borderRadius: 6 }}>
            <strong style={{ fontSize: 12, color: "#64748b" }}>
              {pair.mentee.name} (Mentee):
            </strong>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#1e293b" }}>
              {record.postSessionReflectionMentee || "No reflection saved yet."}
            </p>
          </div>
        </div>
      </details>

      {/* Next-Step Guidance Modal ("OK" to Proceed) */}
      {nextStepPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              maxWidth: "520px",
              width: "100%",
              padding: "1.5rem",
              boxShadow: "0 20px 45px rgba(15, 23, 42, 0.3)",
              border: "2px solid #22c55e",
            }}
          >
            <h3 style={{ margin: "0 0 0.4rem 0", color: "#14532d", fontSize: "1.15rem" }}>
              {nextStepPrompt.title}
            </h3>
            <p
              style={{
                margin: "0 0 0.75rem 0",
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "#15803d",
              }}
            >
              {nextStepPrompt.subtitle}
            </p>
            <ol
              style={{
                margin: "0 0 1.25rem 0",
                paddingLeft: "1.25rem",
                color: "#1e293b",
                fontSize: "0.9rem",
                lineHeight: 1.55,
              }}
            >
              {nextStepPrompt.steps.map((step, idx) => (
                <li key={idx} style={{ marginBottom: "0.45rem" }}>
                  {step}
                </li>
              ))}
            </ol>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  const action = nextStepPrompt.onOk;
                  setNextStepPrompt(null);
                  action?.();
                }}
                style={{
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  padding: "0.65rem 1.75rem",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ✓ OK, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

export default function MentoringSpace() {
  const { pairId } = useParams<{ pairId: string }>();
  const { user, loading } = useAuth();
  const [data, setData] = useState<Space | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastActionPath, setLastActionPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [week, setWeek] = useState(1);
  const [tab, setTab] = useState("Session");
  const [spaceNextStepPrompt, setSpaceNextStepPrompt] = useState<{
    title: string;
    subtitle: string;
    steps: string[];
    onOk?: () => void;
  } | null>(null);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      action: string;
      performedByCode: string;
      timestamp: string;
      details: string;
    }>
  >([]);
  const dirty = useRef(new Set<string>());

  const reload = useCallback(async () => {
    const res = await fetch("/api/pair/" + pairId, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Unable to load records.");
    setData(json);
  }, [pairId]);

  useEffect(() => {
    if (!user) return;
    void reload().catch((e) => setError(e.message));
    const timer = setInterval(
      () =>
        void reload().catch(() =>
          setError("Connection interrupted. Saving may be unavailable."),
        ),
      10000,
    );
    return () => clearInterval(timer);
  }, [user, reload]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current.size) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const send: Send = async (path, method, body) => {
    setBusy(true);
    setError("");
    setNotice("");
    setLastActionPath(path);
    try {
      const res = await fetch("/api/pair/" + pairId + path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Save failed.");
      await reload();
      setNotice(
        path === "/respond"
          ? result.status === "ACTIVE"
            ? "✓ Saved Confirmation: Pairing invitation accepted! All 12 weekly sessions are now unlocked."
            : "✓ Saved Confirmation: Your pairing acceptance has been recorded! Waiting for your counterpart to accept."
          : "✓ Saved Confirmation: Your input has been saved successfully! / सहेजा गया",
      );
      if (path === "/respond" && (body as { action?: string })?.action === "ACCEPT") {
        const isActive = result.status === "ACTIVE";
        setSpaceNextStepPrompt({
          title: isActive
            ? "🎉 Pairing Active — 12-Week Sessions Unlocked!"
            : "✅ Pairing Invitation Accepted!",
          subtitle: "Here is what you need to do next:",
          steps: isActive
            ? [
                "Both Mentor and Mentee have accepted the pairing invitation. All 12 weekly sessions are now unlocked!",
                'Agree on and save your "Shared growth goals" at the top of this page.',
                "Proceed to Week 1 Session Record to schedule your first meeting time and fill your Week 1 Q&A.",
                'Click "OK" below to proceed to Week 1.',
              ]
            : [
                "Your acceptance of this mentoring relationship has been saved.",
                "As soon as your mentoring counterpart accepts their invitation, all 12 weekly sessions will unlock automatically.",
                "Meanwhile, you can review your profile or add Shared Growth Goals.",
                'Click "OK" below to proceed.',
              ],
          onOk: () => {
            setTab("Session");
            setWeek(1);
          },
        });
      } else if (path === "/goals") {
        setSpaceNextStepPrompt({
          title: "✅ Shared Growth Goals Saved!",
          subtitle: "Here is what you need to do next:",
          steps: [
            "Your shared mentoring goals and target outcomes have been saved.",
            `Proceed to your Week ${week} Session Record to schedule your meeting time and complete your weekly Q&A.`,
            'Click "OK" below to proceed.',
          ],
          onOk: () => {
            setTab("Session");
          },
        });
      } else if (path === "/survey") {
        setSpaceNextStepPrompt({
          title: `🎉 Week ${week} Growth Review Submitted!`,
          subtitle: "Here is what you need to do next:",
          steps:
            week === 6
              ? [
                  "Your Week 6 Midpoint Growth Review has been permanently recorded.",
                  "Proceed to Week 7 in the Session tab to continue the second half of your 12-week mentoring journey.",
                  'Click "OK" below to proceed to Week 7.',
                ]
              : [
                  "Your Week 12 Closing Growth Review has been permanently recorded.",
                  "Congratulations on completing the 12-Week Margdarshan Mentoring Journey!",
                  'Click "OK" below to view your completed space.',
                ],
          onOk: () => {
            if (week === 6) {
              setTab("Session");
              setWeek(7);
            }
          },
        });
      }
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Connection failed. Your draft has not been cleared.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return <main className="coach">Checking sign-in…</main>;
  if (!data)
    return (
      <main className="coach">
        <Link href="/dashboard">Dashboard</Link>
        <p role="alert">{error || "Loading mentoring records…"}</p>
      </main>
    );

  const pair = data.pair;
  const session = pair.sessions.find((s) => s.weekNumber === week);
  const participant = [pair.mentorCode, pair.menteeCode].includes(
    user.employeeCode,
  );
  const isMeMentor = user.employeeCode === pair.mentorCode;
  const isMeMentee = user.employeeCode === pair.menteeCode;
  const isMentor = isMeMentor || user.role === "ADMIN";
  const ended = ["TERMINATED", "DECLINED"].includes(pair.status);
  const blocked = busy || pair.isOffRecord || ended;
  const awaitingAcceptance = [
    "PROPOSED",
    "PENDING_ACCEPTANCE",
    "ACCEPTED",
  ].includes(pair.status);
  const hasUserAccepted = isMeMentor
    ? Boolean(pair.mentorAcceptedAt)
    : isMeMentee
      ? Boolean(pair.menteeAcceptedAt)
      : false;

  const handlePairResponse = async (action: "ACCEPT" | "DECLINE") => {
    let declineReason = "";
    if (action === "DECLINE") {
      const input = window.prompt(
        "Optional reason for declining this pairing invitation:",
      );
      if (input === null) return;
      declineReason = input;
    }
    await send("/respond", "POST", { action, declineReason });
  };

  const renderInlineFeedback = (targetPath: string) => {
    if (lastActionPath !== targetPath || (!notice && !error)) return null;
    return (
      <div
        role={error ? "alert" : "status"}
        style={{
          marginTop: "0.75rem",
          padding: "0.7rem 1rem",
          borderRadius: "8px",
          backgroundColor: error ? "#fef2f2" : "#dcfce7",
          border: `1px solid ${error ? "#fecaca" : "#86efac"}`,
          color: error ? "#b91c1c" : "#166534",
          fontWeight: 700,
          fontSize: "0.88rem",
        }}
      >
        {error || notice}
      </div>
    );
  };

  const name = (code?: string) =>
    code === pair.mentorCode
      ? pair.mentor.name
      : code === pair.menteeCode
        ? pair.mentee.name
        : code ?? "Unknown author";

  const dirtyChanged = (id: string, value: boolean) => {
    if (value) dirty.current.add(id);
    else dirty.current.delete(id);
  };

  async function simpleSubmit(
    e: FormEvent<HTMLFormElement>,
    path: string,
    method: string,
    extra: Record<string, unknown> = {},
  ) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = { ...Object.fromEntries(new FormData(form)), ...extra };
    if (await send(path, method, body)) {
      form.reset();
      dirty.current.delete(path);
    }
  }

  const completedSessionsCount = pair.sessions.filter(
    (s) => s.status === "COMPLETED",
  ).length;
  const progressPct = Math.round((completedSessionsCount / 12) * 100);
  const firstPendingWeek =
    pair.sessions
      .slice()
      .sort((a, b) => a.weekNumber - b.weekNumber)
      .find((s) => s.status !== "COMPLETED" && s.status !== "MISSED")
      ?.weekNumber ?? 12;

  const renderAcceptanceBanner = () => (
    <div
      className="record"
      style={{
        backgroundColor: "#fffbeb",
        border: "2px solid #f59e0b",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 0.3rem 0", color: "#92400e" }}>
            🔔 Pairing Invitation — Accept to Unlock 12-Week Sessions
          </h3>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "#78350f" }}>
            <strong>Mentor:</strong> {pair.mentor.name} (
            {pair.mentorAcceptedAt ? "✓ Accepted" : "⏳ Pending"}) ·{" "}
            <strong>Mentee:</strong> {pair.mentee.name} (
            {pair.menteeAcceptedAt ? "✓ Accepted" : "⏳ Pending"})
          </p>
        </div>

        {(participant || user.role === "ADMIN") && !ended && (
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {user.role === "ADMIN" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handlePairResponse("ACCEPT")}
                style={{
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  fontWeight: 700,
                }}
              >
                ✓ Activate Pair &amp; Unlock Sessions Now
              </button>
            ) : !hasUserAccepted ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handlePairResponse("ACCEPT")}
                  style={{
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                >
                  ✓ Accept Pairing Invitation / आमंत्रण स्वीकार करें
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => void handlePairResponse("DECLINE")}
                >
                  ✕ Decline Invitation
                </button>
              </>
            ) : (
              <span
                style={{
                  padding: "0.5rem 0.85rem",
                  borderRadius: "8px",
                  backgroundColor: "#dcfce7",
                  border: "1px solid #86efac",
                  color: "#166534",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                }}
              >
                ✓ You have accepted this invitation. Waiting for your counterpart to accept.
              </span>
            )}
          </div>
        )}
      </div>
      {renderInlineFeedback("/respond")}
    </div>
  );

  return (
    <main className="coach">
      <section className="resume-card">
        <ProgressRing
          percent={progressPct}
          size={72}
          stroke={8}
          label={`${completedSessionsCount} of 12 weeks completed`}
        />
        <div className="resume-text">
          <span className="resume-kicker">
            {pair.status} · 12-Week Mentoring Space
          </span>
          <strong>
            {pair.mentor.name} (Mentor) &amp; {pair.mentee.name} (Mentee)
          </strong>
          <span>
            Mentor: {pair.mentor.designation} ({pair.mentor.department}) · Mentee:{" "}
            {pair.mentee.designation} ({pair.mentee.department}) ·{" "}
            {completedSessionsCount} of 12 weeks completed
          </span>
        </div>
        {participant && !ended && (
          <button
            type="button"
            className={pair.isOffRecord ? "secondary" : "danger"}
            disabled={busy}
            onClick={() => {
              if (
                !pair.isOffRecord &&
                dirty.current.size &&
                !window.confirm(
                  "You have unsaved drafts. Going off record pauses saving; drafts stay in this tab. Continue?",
                )
              )
                return;
              void send("/mode", "PUT", {
                action: pair.isOffRecord ? "RESUME" : "PAUSE",
                version: pair.version,
              });
            }}
          >
            {pair.isOffRecord
              ? "Resume recording / सहमति दें"
              : "Go off record / रिकॉर्ड रोकें"}
          </button>
        )}
      </section>

      {awaitingAcceptance && renderAcceptanceBanner()}

      {pair.isOffRecord && (
        <div className="notice warning">
          <strong>Off record / ऑफ द रिकॉर्ड</strong>
          <p>
            Saving and new AI requests are paused. Continue your conversation
            outside the app. Both participants must agree to resume.
          </p>
          <p className="muted">
            Resume agreement: Mentor {pair.resumeMentor ? "✓" : "pending"} ·
            Mentee {pair.resumeMentee ? "✓" : "pending"}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      {/* Shared Goals Section */}
      <CollapsibleCard
        title="Shared growth goals / साझा विकास लक्ष्य"
        summary={pair.sharedGoals ? "Goals recorded" : "Add outcomes & review date"}
        defaultOpen={!pair.sharedGoals}
      >
        <pre>
          {pair.sharedGoals ||
            "Agree on specific outcomes, evidence of progress and a review date."}
        </pre>
        <form
          className="form"
          onChange={() => dirty.current.add("/goals")}
          onSubmit={(e) =>
            void simpleSubmit(e, "/goals", "PUT", { version: pair.version })
          }
        >
          <fieldset
            disabled={blocked}
            style={{ border: 0, padding: 0, margin: 0 }}
          >
            <label>
              Add or revise the goals
              <textarea
                name="sharedGoals"
                required
                placeholder="Outcome · Evidence · Target date · Support"
                maxLength={20000}
              />
            </label>
            <div style={{ marginTop: "0.75rem" }}>
              <button>Save goals</button>
              {renderInlineFeedback("/goals")}
            </div>
          </fieldset>
        </form>
      </CollapsibleCard>

      {/* Main Navigation Tabs */}
      <div className="report-tabs" role="tablist" aria-label="Space views">
        {["Session", "Actions", "Journey"].map((t) => (
          <button
            key={t}
            type="button"
            className={`tab-button${tab === t ? " active" : ""}`}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              if (t === "Journey")
                void fetch("/api/pair/" + pairId + "/history")
                  .then(async (r) => {
                    const j = await r.json();
                    if (!r.ok) throw new Error(j.error);
                    setHistory(j.history);
                  })
                  .catch((e) => setError(e.message));
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 12-Week Roadmap Bar */}
      <div className="module-tab-list" role="tablist" aria-label="Programme weeks">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
          const s = pair.sessions.find((sess) => sess.weekNumber === w);
          const isDone = s?.status === "COMPLETED";
          const isMissed = s?.status === "MISSED";
          const isLocked =
            w > firstPendingWeek && !isDone && !isMissed;
          return (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={week === w}
              className={`module-tab${
                week === w ? " module-tab-active" : ""
              }`}
              onClick={() => setWeek(w)}
              title={
                isLocked
                  ? `Week ${w} is locked until Week ${firstPendingWeek} is Completed or Missed`
                  : isMissed
                    ? `Week ${w} was marked as Missed`
                    : isDone
                      ? `Week ${w} Completed`
                      : `Active Week ${w}`
              }
            >
              Week {w}
              {isDone && (
                <span className="module-tab-status" aria-label="completed">
                  {" "}
                  ✓
                </span>
              )}
              {isMissed && (
                <span className="module-tab-status" aria-label="missed">
                  {" "}
                  ⚠️
                </span>
              )}
              {isLocked && (
                <span className="module-tab-status" aria-label="locked">
                  {" "}
                  🔒
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="muted" style={{ marginBottom: "0.75rem" }}>
        Week {week} · {themes[week] || `Week ${week}`} ·{" "}
        {completedSessionsCount}/12 completed
      </p>

      {/* ========================================================================= */}
      {/* SESSION TAB                                                               */}
      {/* ========================================================================= */}
      <section className="card" hidden={tab !== "Session"}>
        <h2>Session record / बैठक का रिकॉर्ड</h2>
        <div
          className="record"
          style={{ backgroundColor: "#eef2ff", borderColor: "#c7d2fe" }}
        >
          <h3 style={{ marginTop: 0 }}>Conversation card · Week {week}</h3>
          <p className="muted">Use these prompts to keep the meeting practical:</p>
          <ol style={{ marginBottom: 0 }}>
            <li>What would useful progress on “{themes[week]}” look like?</li>
            <li>Which recent workplace example should we examine?</li>
            <li>What options or small experiment could help?</li>
            <li>What will each person do before the next session?</li>
          </ol>
        </div>

        {!session && (
          <div style={{ marginTop: "1rem" }}>
            <p className="muted">
              Sessions become available after both participants accept the
              invitation below:
            </p>
            {renderAcceptanceBanner()}
          </div>
        )}

        {pair.sessions.map((s) => (
          <div key={s.id} hidden={s.weekNumber !== week}>
            <SessionEditor
              record={s}
              pair={pair}
              userCode={user.employeeCode}
              userRole={user.role}
              blocked={blocked}
              firstPendingWeek={firstPendingWeek}
              send={send}
              dirtyChanged={dirtyChanged}
              onAdvanceWeek={(nextWeek) => {
                setTab("Session");
                setWeek(nextWeek);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onOpenJourneyReview={() => {
                setTab("Journey");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        ))}
      </section>

      {/* ========================================================================= */}
      {/* ASK COACH AI ASSISTANCE — RESTRICTED TO MENTORS ONLY                       */}
      {/* ========================================================================= */}
      {isMentor && (
        <section className="card" hidden={tab !== "Session"}>
          <h2>Session coach / बातचीत सहायक (Mentors Only)</h2>
          <p className="muted">
            Ask practical questions regarding RDC Concrete plant operations, mentoring GETs, or GROW conversation approaches. Questions and answers are visible to administrators and mentors.
          </p>
          {pair.coachingMessages
            .filter((c) => c.weekNumber === week)
            .map((c) => (
              <article key={c.id} className="record">
                <p className="muted">
                  {name(c.employeeCode)} · {displayTime(c.createdAt)} ·{" "}
                  {c.mode === "AI"
                    ? "AI response"
                    : c.mode === "PENDING"
                      ? "Response pending or interrupted"
                      : "Guided GROW prompt"}
                </p>
                <h3 style={{ margin: "4px 0 8px 0" }}>{c.question}</h3>
                <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {c.answer}
                </pre>
              </article>
            ))}
          <form
            onChange={() => dirty.current.add("/ai")}
            onSubmit={(e) =>
              void simpleSubmit(e, "/ai", "POST", { weekNumber: week })
            }
          >
            <fieldset disabled={blocked}>
              <label>
                Ask coach in English (or Hindi)
                <textarea
                  name="message"
                  maxLength={8000}
                  required
                  placeholder="e.g. How do I help my mentee improve transit mixer turnaround time and assertive radio communication?"
                />
              </label>
              <button>Ask coach</button>
              {renderInlineFeedback("/ai")}
            </fieldset>
          </form>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ACTIONS TAB                                                               */}
      {/* ========================================================================= */}
      <section className="card" hidden={tab !== "Actions"}>
        <h2>Actions & evidence / कार्य और प्रमाण</h2>
        {data.actionItems
          .filter((a) => a.sessionId === session?.id)
          .map((a) => (
            <article className="record" key={a.id}>
              <h3>{a.title}</h3>
              <p>
                {name(a.employeeCode)} · Due {displayTime(a.dueDate)} ·{" "}
                {a.status !== "COMPLETED" && new Date(a.dueDate) < new Date()
                  ? "OVERDUE"
                  : a.status}
              </p>
              <pre>{a.description}</pre>
              <pre>{a.evidence}</pre>
              <form
                onSubmit={(e) =>
                  void simpleSubmit(e, "/action", "PUT", {
                    actionItemId: a.id,
                    updatedAt: a.updatedAt,
                  })
                }
              >
                <fieldset disabled={blocked}>
                  <label>
                    Status
                    <select
                      name="status"
                      defaultValue={
                        a.status === "OVERDUE" ? "PENDING" : a.status
                      }
                    >
                      {["PENDING", "IN_PROGRESS", "COMPLETED"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Evidence of completion
                    <textarea name="evidence" defaultValue={a.evidence ?? ""} />
                  </label>
                  <button>Update action</button>
                </fieldset>
              </form>
            </article>
          ))}
        <form
          onChange={() => dirty.current.add("/action")}
          onSubmit={(e) =>
            void simpleSubmit(e, "/action", "POST", { sessionId: session?.id })
          }
        >
          <fieldset disabled={blocked || !session}>
            <label>
              Next action
              <input name="title" required maxLength={500} />
            </label>
            <label>
              What will demonstrate success?
              <textarea name="description" />
            </label>
            <div className="grid">
              <label>
                Owner
                <select name="employeeCode">
                  <option value={pair.mentorCode}>
                    {pair.mentor.name} (Mentor)
                  </option>
                  <option value={pair.menteeCode}>
                    {pair.mentee.name} (Mentee)
                  </option>
                </select>
              </label>
              <label>
                Due date (IST)
                <input type="date" name="dueDate" required />
              </label>
            </div>
            <button>Add action</button>
            {renderInlineFeedback("/action")}
          </fieldset>
        </form>
      </section>

      {/* ========================================================================= */}
      {/* JOURNEY TAB                                                               */}
      {/* ========================================================================= */}
      <section className="card" hidden={tab !== "Journey"}>
        <h2>Communication styles / संवाद शैली</h2>
        <p className="muted">
          DISC is a conversation starter for adapting communication. It is not a diagnosis or performance assessment.
        </p>

        {(() => {
          const mentorDisc = getDiscDetails(pair.mentor.discStyle);
          const menteeDisc = getDiscDetails(pair.mentee.discStyle);
          const harmony = getHarmonyAdvice(pair.mentor.discStyle, pair.mentee.discStyle);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 16 }}>
              {/* Synergy Header */}
              <div className="record" style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}>
                <h3 style={{ color: "#166534", margin: "0 0 6px 0" }}>{harmony.title}</h3>
                <p style={{ fontWeight: "bold", fontSize: 13, color: "#15803d", margin: "0 0 8px 0" }}>
                  Rating: {harmony.harmonyScore}
                </p>
                <p style={{ fontSize: 13, color: "#1e293b", margin: "0 0 10px 0" }}>{harmony.advice}</p>
                <div style={{ fontSize: 12, color: "#334155" }}>
                  <strong>Collaboration Rules of Thumb:</strong>
                  <ul style={{ margin: "6px 0 0 0", paddingLeft: 20 }}>
                    {harmony.tips.map((tip, idx) => (
                      <li key={idx} style={{ marginBottom: 4 }}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Side-by-side Profiles */}
              <div className="grid">
                {/* Mentor Card */}
                <article className="record" style={{ backgroundColor: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>
                      Mentor Profile
                    </span>
                    <span style={{ fontSize: 11, fontWeight: "bold", padding: "2px 8px", borderRadius: 4, backgroundColor: "#e2e8f0" }}>
                      Style: {pair.mentor.discStyle || "Not recorded"}
                    </span>
                  </div>
                  <h3 style={{ margin: "8px 0 2px 0" }}>{pair.mentor.name}</h3>
                  <p className="muted" style={{ fontSize: 12, margin: "0 0 8px 0" }}>
                    {mentorDisc.name} · <span lang="hi">{mentorDisc.hindiName}</span>
                  </p>
                  <p style={{ fontSize: 13, margin: "0 0 8px 0" }}>{mentorDisc.overview}</p>
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    <strong>Communication Preference:</strong>
                    <p style={{ margin: "2px 0 8px 0", color: "#475569" }}>{mentorDisc.communicationStyle}</p>
                    <strong>Mentoring Role:</strong>
                    <p style={{ margin: "2px 0 0 0", color: "#475569" }}>{mentorDisc.mentoringAdvice.asMentor}</p>
                  </div>
                </article>

                {/* Mentee Card */}
                <article className="record" style={{ backgroundColor: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>
                      Mentee Profile
                    </span>
                    <span style={{ fontSize: 11, fontWeight: "bold", padding: "2px 8px", borderRadius: 4, backgroundColor: "#e2e8f0" }}>
                      Style: {pair.mentee.discStyle || "Not recorded"}
                    </span>
                  </div>
                  <h3 style={{ margin: "8px 0 2px 0" }}>{pair.mentee.name}</h3>
                  <p className="muted" style={{ fontSize: 12, margin: "0 0 8px 0" }}>
                    {menteeDisc.name} · <span lang="hi">{menteeDisc.hindiName}</span>
                  </p>
                  <p style={{ fontSize: 13, margin: "0 0 8px 0" }}>{menteeDisc.overview}</p>
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    <strong>Communication Preference:</strong>
                    <p style={{ margin: "2px 0 8px 0", color: "#475569" }}>{menteeDisc.communicationStyle}</p>
                    <strong>Developmental Focus:</strong>
                    <p style={{ margin: "2px 0 0 0", color: "#475569" }}>{menteeDisc.mentoringAdvice.asMentee}</p>
                  </div>
                </article>
              </div>
            </div>
          );
        })()}
      </section>

      {(["Learning journal", "Notebook"] as const).map((t) => {
        const targetPath = t === "Notebook" ? "/notebook" : "/privatenote";
        return (
          <section className="card" hidden={tab !== "Journey"} key={t}>
            <h2>{t}</h2>
            <p className="muted">
              Shared with this pair and the administrators. Saved entries remain
              available below.
            </p>
            <form
              onChange={() => dirty.current.add(targetPath)}
              onSubmit={(e) =>
                void simpleSubmit(
                  e,
                  targetPath,
                  t === "Notebook" ? "PUT" : "POST",
                )
              }
            >
              <fieldset disabled={blocked}>
                <label>
                  New entry / नई प्रविष्टि
                  <textarea name="content" required maxLength={20000} />
                </label>
                <button>Save entry</button>
                {renderInlineFeedback(targetPath)}
              </fieldset>
            </form>
            {(t === "Notebook" ? pair.notebooks : pair.learningNotes).map(
              (n) => (
                <article className="record" key={n.id}>
                  <p className="muted">
                    {name(n.employeeCode ?? n.updatedBy)} ·{" "}
                    {displayTime((n.createdAt ?? n.updatedAt)!)}
                  </p>
                  <pre>{n.content}</pre>
                </article>
              ),
            )}
          </section>
        );
      })}

      {/* Midpoint & Closing Reviews (Week 6 and Week 12) */}
      <section className="card" hidden={tab !== "Journey"}>
        <h2>Midpoint & closing reviews (Week 6 & Week 12)</h2>
        {pair.surveys.map((s) => (
          <article key={s.id} className="record">
            <h3>
              Week {s.weekNumber} · {name(s.employeeCode)} · {s.growthRating}/5
            </h3>
            <pre>{s.feedbackText}</pre>
          </article>
        ))}
        {participant && [6, 12].includes(week) && (
          <form
            onChange={() => dirty.current.add("/survey")}
            onSubmit={(e) => {
              const rating = Number(
                new FormData(e.currentTarget).get("growthRating"),
              );
              void simpleSubmit(e, "/survey", "POST", {
                weekNumber: week,
                growthRating: rating,
              });
            }}
          >
            <fieldset disabled={blocked}>
              <label>
                Growth rating
                <select name="growthRating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Evidence of growth, remaining gaps and next steps
                <textarea name="feedbackText" required />
              </label>
              <button>Save my review</button>
              {renderInlineFeedback("/survey")}
            </fieldset>
          </form>
        )}
        {![6, 12].includes(week) && (
          <p className="muted">Select Week 6 (Midpoint) or Week 12 (Closing) to submit a formal review.</p>
        )}
      </section>

      {/* Record History */}
      <section className="card" hidden={tab !== "Journey"}>
        <h2>Record history</h2>
        {history.map((h) => (
          <details className="record" key={h.id}>
            <summary>
              {h.action} · {name(h.performedByCode)} ·{" "}
              {displayTime(h.timestamp)}
            </summary>
            <pre>{JSON.stringify(JSON.parse(h.details), null, 2)}</pre>
          </details>
        ))}
        {!history.length && (
          <p>
            No revision history is available yet. Earlier records may predate
            audit tracking.
          </p>
        )}
      </section>

      {/* Space-Level Next-Step Guidance Modal ("OK" to Proceed) */}
      {spaceNextStepPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              maxWidth: "520px",
              width: "100%",
              padding: "1.5rem",
              boxShadow: "0 20px 45px rgba(15, 23, 42, 0.3)",
              border: "2px solid #22c55e",
            }}
          >
            <h3 style={{ margin: "0 0 0.4rem 0", color: "#14532d", fontSize: "1.15rem" }}>
              {spaceNextStepPrompt.title}
            </h3>
            <p
              style={{
                margin: "0 0 0.75rem 0",
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "#15803d",
              }}
            >
              {spaceNextStepPrompt.subtitle}
            </p>
            <ol
              style={{
                margin: "0 0 1.25rem 0",
                paddingLeft: "1.25rem",
                color: "#1e293b",
                fontSize: "0.9rem",
                lineHeight: 1.55,
              }}
            >
              {spaceNextStepPrompt.steps.map((step, idx) => (
                <li key={idx} style={{ marginBottom: "0.45rem" }}>
                  {step}
                </li>
              ))}
            </ol>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  const action = spaceNextStepPrompt.onOk;
                  setSpaceNextStepPrompt(null);
                  action?.();
                }}
                style={{
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  padding: "0.65rem 1.75rem",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ✓ OK, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Notification Bar */}
      {(notice || error) && (
        <div
          role={error ? "alert" : "status"}
          style={{
            position: "fixed",
            bottom: "1.25rem",
            right: "1.25rem",
            zIndex: 9999,
            maxWidth: "460px",
            padding: "0.85rem 1.15rem",
            borderRadius: "10px",
            backgroundColor: error ? "#fef2f2" : "#dcfce7",
            border: `2px solid ${error ? "#ef4444" : "#22c55e"}`,
            color: error ? "#991b1b" : "#166534",
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            fontWeight: 700,
            fontSize: "0.88rem",
          }}
        >
          <span>{error || notice}</span>
          <button
            type="button"
            className="secondary"
            style={{
              padding: "0.25rem 0.55rem",
              fontSize: "0.75rem",
              minHeight: "auto",
            }}
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}
