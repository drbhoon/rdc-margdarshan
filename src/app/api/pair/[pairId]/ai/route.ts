import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  protectedRoute,
  pairWrite,
  AccessError,
  textValue,
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

export const POST = protectedRoute(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ pairId: string }> },
  ) => {
    const user = (await getSession())!;
    const { pairId } = await params;
    const body = await req.json();
    const question = textValue(body.message, 8000).trim(),
      weekNumber = Number(body.weekNumber);

    if (
      !question ||
      !Number.isInteger(weekNumber) ||
      weekNumber < 1 ||
      weekNumber > 12
    ) {
      throw new AccessError(400, "Enter a question and select a valid program week (1–12).");
    }

    // Reserve and record the request; enforce mentor-only restriction
    const reservation = await pairWrite(pairId, user, async (tx, pair) => {
      // 5. Restrict Ask Coach AI assistance to mentors and administrators only
      if (user.role !== "ADMIN" && user.employeeCode !== pair.mentorCode) {
        throw new AccessError(
          403,
          "Ask Coach AI assistance is restricted to mentors only.",
        );
      }

      const recent = await tx.coachingMessage.count({
        where: {
          employeeCode: user.employeeCode,
          createdAt: { gt: new Date(Date.now() - 60000) },
        },
      });
      if (recent >= 5)
        throw new AccessError(
          429,
          "Please wait a minute before asking another question.",
        );

      const mentor = await tx.employee.findUnique({
        where: { employeeCode: pair.mentorCode },
      });
      const mentee = await tx.employee.findUnique({
        where: { employeeCode: pair.menteeCode },
      });

      const record = await tx.coachingMessage.create({
        data: {
          pairId,
          employeeCode: user.employeeCode,
          weekNumber,
          question,
          answer: "Response pending.",
          mode: "PENDING",
        },
      });
      await logChange(tx, user, "ASK_COACH", { pairId, messageId: record.id });
      return {
        record,
        version: pair.version,
        goals: pair.sharedGoals,
        mentorName: mentor?.name || "Mentor",
        mentorDesignation: mentor?.designation || "Senior Manager",
        menteeName: mentee?.name || "Mentee",
        menteeDesignation: mentee?.designation || "Engineer",
        menteeDepartment: mentee?.department || "Operations",
        menteeDisc: mentee?.discStyle || "Not specified",
      };
    });

    const themeName = weekThemes[weekNumber] || `Week ${weekNumber}`;
    const isHindiRequested =
      /[\u0900-\u097f]/.test(question) ||
      /\b(hindi|in hindi|हिंदी)\b/i.test(question);

    let reply = isHindiRequested
      ? `### मेंटरिंग मार्गदर्शन (सप्ताह ${weekNumber}: ${themeName})\n\n` +
        `**मुख्य उद्देश्य:** ${reservation.menteeName} को ${themeName} पर गहराई से सोचने और व्यावहारिक ऑन-साइट समझ विकसित करने में मदद करें।\n\n` +
        `**GROW कोचिंग प्रश्न (मेंटी से पूछने के लिए):**\n` +
        `1. **लक्ष्य (Goal):** ${reservation.menteeDepartment} प्लांट के दैनिक कार्यों में, आप इस विषय में क्या ठोस परिणाम प्राप्त करना चाहते हैं?\n` +
        `2. **वास्तविकता (Reality):** साइट या बैचिंग प्लांट पर वर्तमान में क्या चुनौतियां या अंतर देखने को मिल रहे हैं?\n` +
        `3. **विकल्प (Options):** यदि आपको इस स्थिति को संभालना हो, तो आप कौन से 2 व्यावहारिक समाधान लागू कर सकते हैं?\n` +
        `4. **संकल्प (Will):** अगली बैठक से पहले आप कौन सा ठोस प्रयोग या कदम उठाएंगे?\n\n` +
        `**मेंटर सलाह:** मेंटी को खुद विचार रखने का अवसर दें और व्यावहारिक सुरक्षित कार्य संस्कृति को बढ़ावा दें।`
      : `### Executive Coaching Guidance (Week ${weekNumber}: ${themeName})\n\n` +
        `**Key Developmental Focus:** Guide ${reservation.menteeName} (${reservation.menteeDesignation}, DISC: ${reservation.menteeDisc}) to build ownership around "${themeName}" in daily RDC Concrete operations.\n\n` +
        `**Targeted GROW Coaching Questions for ${reservation.menteeName}:**\n` +
        `1. **Goal:** In your daily work at the ${reservation.menteeDepartment} plant, what specific standard or outcome do you want to achieve regarding "${question}"?\n` +
        `2. **Reality:** What have you observed on site during recent pours or transit mixer dispatch? Where do bottlenecks or communication friction occur?\n` +
        `3. **Options:** If you take full ownership of this situation, what are two proactive approaches you could test on site?\n` +
        `4. **Will / Commitment:** What is one verifiable action you will complete before our next mentoring check-in? How can I support you?\n\n` +
        `**RDC Operational Mentor Tip:** Encourage ${reservation.menteeName} to propose their own solutions before giving instructions. Reinforce SARTAJ safety discipline and quality standards (slump test, cube casting, dispatch coordination).`;

    let mode = "GUIDED_PROMPT";
    const key = process.env.GEMINI_API_KEY;

    if (key) {
      try {
        const systemPrompt =
          "You are the Margdarshan Executive AI Coach for RDC Concrete, India's leading Ready Mix Concrete manufacturing company. " +
          "You provide high-level, practical mentoring advice to experienced RDC Mentors on how to coach and develop their mentees (young site engineers, GETs, quality leads, plant heads). " +
          "RDC Concrete Context: 100+ batching plants across India, transit mixer (TM) turnaround logistics, concrete quality control (slump tests, cube compressive strength tests, IS 456 & IS 1199 compliance), plant maintenance, customer site coordination, and the SARTAJ safety ownership culture. " +
          "GROW Coaching Model: Goal, Reality, Options, Will. " +
          "CRITICAL LANGUAGE RULE: Respond in clear, professional English by default. ONLY respond in Hindi if the mentor writes in Hindi (Devanagari script) or explicitly requests Hindi. " +
          "Structure your response with: " +
          "1) Key Developmental Objective for this Week & Topic; " +
          "2) 3-4 Powerful Probing GROW Questions for the Mentor to ask the Mentee during their 1-on-1 session; " +
          "3) A practical On-the-Job Exercise / Workplace Experiment for the RDC plant/site; " +
          "4) Mentor Mindset Tip.";

        const userPrompt =
          `Mentoring Relationship Context:\n` +
          `- Program Milestone: Week ${weekNumber} of 12 (Theme: "${themeName}")\n` +
          `- Mentor: ${reservation.mentorName} (${reservation.mentorDesignation})\n` +
          `- Mentee: ${reservation.menteeName} (${reservation.menteeDesignation}, ${reservation.menteeDepartment}, DISC Profile: ${reservation.menteeDisc})\n` +
          `- Shared Growth Goals: ${reservation.goals || "Operational excellence, concrete quality assurance, safety culture, and leadership discipline."}\n\n` +
          `Mentor's Coaching Question:\n"${question}"\n\n` +
          `Provide direct, professional, domain-rich coaching advice for the mentor.`;

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
            signal: AbortSignal.timeout(25000),
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: userPrompt }],
                },
              ],
              generationConfig: { maxOutputTokens: 1400 },
            }),
          },
        );

        if (response.ok) {
          const json = await response.json();
          const answer = json.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text ?? "")
            .join("");
          if (answer && answer.trim().length > 0) {
            reply = answer.trim();
            mode = "AI";
          }
        }
      } catch {
        /* Guided domain-specific prompt remains available */
      }
    }

    await pairWrite(pairId, user, async (tx, pair) => {
      if (pair.version !== reservation.version)
        throw new AccessError(
          409,
          "Workspace changed while the response was being prepared. The earlier request remains recorded.",
        );
      await tx.coachingMessage.update({
        where: { id: reservation.record.id },
        data: { answer: reply, mode },
      });
    });

    return NextResponse.json({ reply, mode });
  },
);
