import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { COMPETENCIES } from '@/lib/competencies';

const WEEK_THEMES = [
  'Kick-off & Contracting (Boundaries, SARTAJ Safety, and Growth Agreement)',
  'DISC Style Reflection (Communication Dynamics & Assertiveness)',
  'Skill Review & Strengths (Functional Knowledge & Multiskilling)',
  'Career & Vision Planning (Planning, Organizing & Coordination)',
  'Focus & Productivity (Cost & Resource Responsibility)',
  'Feedback & Communication (Integrity, Trust & Assertiveness)',
  'Mid-Point Pulse Check (Progress Audit & Competency Refinement)',
  'Managing Stakeholders (Customer Orientation & Relationship Handling)',
  'Problem Solving & Asset Care (Preventive Maintenance & Asset Care)',
  'Growth & Crucial Conversations (Vendor & External Stakeholder Management)',
  'Team Orientation & Delegation (Building Resilient Squads)',
  'Sustaining Progress (Long-Term Operational Discipline)',
  'Close-out & Feedback (Competency Mastery Review & Summary Export)',
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pairId } = await params;
    const { message, weekNumber } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Load pair to get context
    const pair = await prisma.mentoringPair.findUnique({
      where: { id: pairId },
      include: { mentee: true, mentor: true },
    });

    if (!pair) {
      return NextResponse.json({ error: 'Pair not found' }, { status: 404 });
    }

    const isMentee = pair.menteeCode === session.employeeCode;
    const roleLabel = isMentee ? 'Mentee (Young Engineer)' : 'Mentor (Manager / Operations Leader)';
    const counterpartName = isMentee ? pair.mentor.name : pair.mentee.name;
    const counterpartDisc = isMentee ? pair.mentor.discStyle : pair.mentee.discStyle;

    const theme = WEEK_THEMES[weekNumber] || 'Mentoring 1:1';

    // System prompt construction incorporating the Competency Framework
    const systemPrompt = `You are Margdarshan AI, an empathetic, supportive, and professional coaching co-pilot built around our corporate engineering Competency Framework:
1. Communication & Assertiveness
2. Cost & Resource Responsibility
3. Customer Orientation & Relationship Handling
4. Functional Knowledge & Multiskilling
5. Integrity & Trust
6. Planning, Organizing & Coordination
7. Preventive Maintenance & Asset Care
8. Safety, Operational Discipline & SARTAJ Ownership
9. Team Orientation & Delegation
10. Vendor & External Stakeholder Management

Systemic Diagnosis Rule: In our operational environment, 1 Primary Operational Trigger cascades into an average of 5.6 Secondary Behavioral Evaluations simultaneously.

Current User: ${session.name} - Role: ${roleLabel}.
Counterpart: ${counterpartName} (DISC Style: ${counterpartDisc || 'Unknown'}).
Current Week: Week ${weekNumber} - Theme: ${theme}.
Mentee Target Competencies: ${pair.mentee.topics?.join(', ') || 'General Competencies'}.
Mentee Personal Growth & Psychological Focus: ${pair.mentee.challenges?.join(', ') || 'Self-Confidence, Execution Under Pressure, Inter-Personal Relations, Work-Life Balance'}.
Mentor Expertise Competencies: ${pair.mentor.topics?.join(', ') || 'Leadership Competencies'}.
Co-created Goals: ${pair.sharedGoals || 'None set yet'}.

Strict Safety Guidelines:
1. NEVER offer definitive performance appraisal decisions. Always remind the user that your feedback is a recommendation, and the mentoring relationship is human-first.
2. Formulate powerful open-ended questions based on the GROW model (Goal, Reality, Options, Will).
3. Connect operational challenges to both the Primary Competency and cascading Secondary Behavioral traits (e.g. how a Maintenance trigger connects to Cost & Safety discipline).
4. Keep the tone professional, encouraging, and focused on growth.`;

    // 1. Try real LLM (Gemini API) if configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: `${systemPrompt}\n\nUser Question: ${message}\n\nAI Suggestion:` },
                  ],
                },
              ],
            }),
          }
        );

        if (response.ok) {
          const resJson = await response.json();
          const reply = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return NextResponse.json({ reply });
          }
        }
      } catch (llmError) {
        console.error('Real LLM call failed, falling back to mock:', llmError);
      }
    }

    // 2. Fallback Mock AI co-pilot responses based on role and triggers
    let reply = `Here is a custom recommendation for you regarding your request about "${message}":\n\n`;

    const lowerMsg = message.toLowerCase();

    if (isMentee) {
      if (lowerMsg.includes('prepare') || lowerMsg.includes('theme') || lowerMsg.includes('question')) {
        reply += `### Prepared Discussion Agenda (Week ${weekNumber}: ${theme})\n\n`;
        reply += `Here are 3 competency-focused questions to ask your mentor, ${counterpartName}:\n`;
        reply += `1. **"When handling ${theme}, how do you balance primary operational targets with secondary behavioral impacts like safety and cost responsibility?"**\n`;
        reply += `2. **"Can you share an example of how you navigated a breakdown in plant discipline or vendor relations in your early career?"**\n`;
        reply += `3. **"What specific evidence or milestone can I deliver over the next 2 weeks to demonstrate growth in ${pair.mentee.topics?.[0] || 'our core competencies'}?"**\n\n`;
        reply += `*Disclaimer: I am your AI assistant. Use these questions as a guide, and focus on building an honest mentoring relationship.*`;
      } else if (lowerMsg.includes('disc') || lowerMsg.includes('style')) {
        reply += `### DISC Style & Competency Dynamic Analysis\n\n`;
        reply += `- **Your Style:** ${session.name} (${pair.mentee.discStyle || 'S'})\n`;
        reply += `- **Mentor's Style:** ${counterpartName} (${counterpartDisc || 'D'})\n\n`;
        reply += `**Competency Execution Dynamic:**\n`;
        reply += `Your mentor values speed, crisp operational status reports, and measurable outcomes (Dominance). When discussing competency goals like *${pair.mentee.topics?.[0] || 'Preventive Maintenance or Cost Responsibility'}*, come prepared with concrete metrics (e.g. uptime %, SLA adherence, or budget variance). Frame questions around solutions rather than problems.\n\n`;
        reply += `*Disclaimer: This is behavioral guidance based on standard DISC matrices.*`;
      } else {
        reply += `As a Mentee focusing on **${theme}**, connect your discussion to our 10 Core Competencies. Consider the systemic cascade: how does your immediate technical task impact safety discipline, cost responsibility, and team coordination?\n\n`;
        reply += `*Disclaimer: Always align developmental milestones with your mentor.*`;
      }
    } else {
      // Mentor Co-Pilot responses
      if (lowerMsg.includes('grow') || lowerMsg.includes('prompt') || lowerMsg.includes('question')) {
        reply += `### GROW Model Competency Coaching Guide (Week ${weekNumber}: ${theme})\n\n`;
        reply += `Guide ${counterpartName} using these competency-aligned GROW prompts:\n`;
        reply += `- **Goal (Target):** "Which specific competency in our framework do you want to elevate this week (e.g. SARTAJ Safety, Asset Care, Cost Governance)?"\n`;
        reply += `- **Reality (Current State):** "What operational challenges are currently triggering friction in this area? What secondary behaviors are surfacing?"\n`;
        reply += `- **Options (Action Tracks):** "What SOPs, cross-skilling, or stakeholder alignments could resolve this?"\n`;
        reply += `- **Will (Commitment):** "What single commitment will you log in our action items before next week's session?"\n\n`;
        reply += `*Disclaimer: Practice active listening. Let the mentee diagnose the systemic cascade before offering solutions.*`;
      } else if (lowerMsg.includes('progress') || lowerMsg.includes('goal')) {
        reply += `### Competency Progress Diagnosis\n\n`;
        reply += `To evaluate ${counterpartName}'s progress in **${pair.sharedGoals || 'Core Engineering Competencies'}**:\n`;
        reply += `1. **Action Item Audit:** Check if commitments tied to SARTAJ safety or asset care are being closed on time.\n`;
        reply += `2. **Systemic Cascade Evaluation:** 1 primary operational trigger cascades into an average of 5.6 secondary evaluations. Ask: 'How did your resolution of this plant/procurement issue impact safety, cost, and trust?'\n`;
        reply += `3. **SBI Feedback Model:** Provide feedback citing the Situation, Behavior, and Operational Impact.\n\n`;
        reply += `*Disclaimer: Focus on coaching growth indicators rather than punitive performance metrics.*`;
      } else {
        reply += `As a Mentor for Week ${weekNumber} (${theme}), coach your mentee to look beyond immediate symptoms and understand the systemic cascade across our 10 core competencies.\n\n`;
        reply += `*Disclaimer: Emphasize psychological safety and open dialogue.*`;
      }
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI Co-pilot endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
