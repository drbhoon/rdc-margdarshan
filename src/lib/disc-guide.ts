export interface DiscDetail {
  code: string;
  name: string;
  hindiName: string;
  tagline: string;
  overview: string;
  strengths: string[];
  growthAreas: string[];
  communicationStyle: string;
  howToWorkWith: string;
  mentoringAdvice: {
    asMentor: string;
    asMentee: string;
  };
  siteContext: string;
  color: string;
  bgLight: string;
  borderColor: string;
}

export const DISC_STYLES: Record<string, DiscDetail> = {
  D: {
    code: "D",
    name: "Dominance (Driver / Results-Oriented)",
    hindiName: "परिणाम-उन्मुख एवं त्वरित निर्णयकर्ता",
    tagline: "Direct, decisive, results-driven, and embraces challenges.",
    overview:
      "High 'D' individuals are motivated by overcoming obstacles and achieving fast, concrete results. They prefer directness, thrive in fast-paced operational environments, and take immediate initiative when challenges arise on site or in plant operations.",
    strengths: [
      "Quick decision making under pressure and tight dispatch schedules",
      "Goal-focused drive that pushes initiatives to completion",
      "Willingness to take accountability and tackle difficult operational problems",
      "Natural assertiveness and leadership during crisis handling",
    ],
    growthAreas: [
      "May appear impatient with deliberate or methodical processes",
      "Can overlook team consensus or emotional nuance under stress",
      "Needs to balance speed with careful listening and empathy",
    ],
    communicationStyle:
      "Be concise, clear, and focused on outcomes ('what' and 'by when'). Avoid excessive small talk or unstructured ambiguity.",
    howToWorkWith:
      "Present solutions rather than just problems. Give them clear goals, autonomy to execute, and respect their time with well-structured discussions.",
    mentoringAdvice: {
      asMentor:
        "Provide direct, actionable challenges. Ensure you give your mentee space to think and ask questions without feeling rushed.",
      asMentee:
        "Be open to slowing down when absorbing complex technical nuances. Seek feedback on team collaboration alongside target achievements.",
    },
    siteContext:
      "Crucial in dispatch management, breakdown recovery, and urgent client delivery resolutions where swift leadership is essential.",
    color: "text-rose-700",
    bgLight: "bg-rose-50",
    borderColor: "border-rose-200",
  },
  I: {
    code: "I",
    name: "Influence (Inspirer / People-Oriented)",
    hindiName: "प्रेरणादायक एवं सहयोगी संवादी",
    tagline: "Enthusiastic, optimistic, collaborative, and persuasive.",
    overview:
      "High 'I' individuals are energized by people, teamwork, and building relationships. They bring high morale, creativity, and enthusiasm to plant teams, cross-functional projects, and client interactions.",
    strengths: [
      "Builds trust and camaraderie rapidly across diverse site teams",
      "Excellent verbal communication, persuasion, and morale boosting",
      "Creative problem solver who generates innovative ideas easily",
      "Adapts quickly to new social environments and networking opportunities",
    ],
    growthAreas: [
      "May lose focus on tedious documentation or routine standard operating procedures (SOPs)",
      "Can over-commit due to natural optimism",
      "Needs structured follow-through on detailed action items",
    ],
    communicationStyle:
      "Be warm, engaging, and appreciative. Allow open dialogue and brainstorm ideas before narrowing down to specifics.",
    howToWorkWith:
      "Acknowledge their contributions and ideas. Help them stay anchored with written summaries and clear milestones for complex tasks.",
    mentoringAdvice: {
      asMentor:
        "Encourage your mentee's self-confidence and visibility. Help them build systematic habits and accountability for technical follow-through.",
      asMentee:
        "Leverage your people skills to learn from plant supervisors and cross-functional teams. Put action commitments in writing.",
    },
    siteContext:
      "Valuable in vendor relationships, team cohesion between lab and site staff, and resolving cross-departmental communication gaps.",
    color: "text-amber-700",
    bgLight: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  S: {
    code: "S",
    name: "Steadiness (Supporter / Methodical & Reliable)",
    hindiName: "स्थिर, धैर्यवान एवं विश्वसनीय सहयोगी",
    tagline: "Patient, reliable, cooperative, and a loyal team pillar.",
    overview:
      "High 'S' individuals value consistency, harmony, and thorough teamwork. They are dependable pillars who ensure smooth everyday operations, follow processes faithfully, and create psychological safety for colleagues.",
    strengths: [
      "Exceptional patience, listening skills, and steady reliability",
      "Loyal team player who supports colleagues and avoids disruptive conflict",
      "Consistent execution of established standard operating procedures",
      "Methodical and calm demeanor during high-stress operational periods",
    ],
    growthAreas: [
      "May hesitate to speak up assertively or push back against aggressive demands",
      "Can be uncomfortable with sudden, unannounced changes in routine",
      "May internalize stress rather than expressing concerns early",
    ],
    communicationStyle:
      "Be supportive, sincere, and respectful. Provide step-by-step context and give them time to process before expecting immediate answers.",
    howToWorkWith:
      "Create a safe environment where they feel comfortable sharing candid thoughts. Recognize their consistent behind-the-scenes contributions.",
    mentoringAdvice: {
      asMentor:
        "Provide a calm, reassuring sounding board. Encourage your mentee to step out of their comfort zone and practice assertiveness.",
      asMentee:
        "Practice sharing your opinions proactively in meetings. Treat change as an opportunity for mastery rather than disruption.",
    },
    siteContext:
      "Essential for steady plant maintenance routines, consistent quality testing discipline, and maintaining team harmony on 24/7 pour schedules.",
    color: "text-emerald-700",
    bgLight: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  C: {
    code: "C",
    name: "Conscientiousness (Analyst / Quality & Precision-Oriented)",
    hindiName: "विश्लेषणात्मक एवं गुणवत्ता-केंद्रित विशेषज्ञ",
    tagline: "Analytical, systematic, quality-focused, and standard-driven.",
    overview:
      "High 'C' individuals are driven by precision, technical accuracy, and adherence to high quality standards. They investigate root causes, rely on factual data, and ensure engineering compliance.",
    strengths: [
      "Deep technical rigor, high quality standards, and attention to detail",
      "Systematic data analysis and objective root-cause investigation",
      "Thorough adherence to IS codes, mix design specifications, and safety SOPs",
      "Organized, logical approach to planning and asset maintenance",
    ],
    growthAreas: [
      "Can fall into analysis paralysis or delay decisions seeking 100% certainty",
      "May appear overly critical or distant in casual interactions",
      "Needs comfort with pragmatic 'good enough' decisions in fast operational situations",
    ],
    communicationStyle:
      "Be precise, logical, and supported by facts or data. Provide clear specifications, agendas, and written details.",
    howToWorkWith:
      "Respect their analytical mindset. Avoid vague or unsupported assertions; explain the 'why' and technical rationale behind decisions.",
    mentoringAdvice: {
      asMentor:
        "Help your mentee master engineering and operational principles. Guide them on when to balance precision with operational speed.",
      asMentee:
        "Channel your analytical strengths into concrete quality and efficiency gains. Practice communicating technical findings simply to site teams.",
    },
    siteContext:
      "Crucial for QA/QC testing, concrete mix design optimization, raw material grading, and equipment telemetry analysis.",
    color: "text-blue-700",
    bgLight: "bg-blue-50",
    borderColor: "border-blue-200",
  },
};

export function getDiscDetails(styleCode?: string | null): DiscDetail {
  if (!styleCode) return DISC_STYLES["S"];
  const primary = styleCode.charAt(0).toUpperCase();
  const base = DISC_STYLES[primary] || DISC_STYLES["S"];
  if (styleCode.includes("/")) {
    const parts = styleCode.split("/");
    const secondary = parts[1]?.charAt(0).toUpperCase();
    const secDetail = DISC_STYLES[secondary];
    if (secDetail) {
      return {
        ...base,
        name: `${base.name.split(" ")[0]} / ${secDetail.name.split(" ")[0]} (Blended Profile)`,
        hindiName: `${base.hindiName} / ${secDetail.hindiName}`,
        tagline: `${base.tagline} Balanced with ${secDetail.tagline.toLowerCase()}`,
      };
    }
  }
  return base;
}

export function getHarmonyAdvice(
  mentorStyle?: string | null,
  menteeStyle?: string | null
): { title: string; harmonyScore: string; advice: string; tips: string[] } {
  const m = getDiscDetails(mentorStyle);
  const e = getDiscDetails(menteeStyle);
  const mCode = mentorStyle?.charAt(0).toUpperCase() || "S";
  const eCode = menteeStyle?.charAt(0).toUpperCase() || "S";

  if (mCode === eCode) {
    return {
      title: `Shared Style Resonance (${mCode} ↔ ${eCode})`,
      harmonyScore: "High Intuitive Alignment",
      advice: `Both of you share the ${m.name.split(" ")[0]} profile. You will naturally understand each other's communication speed and priorities, but be mindful of shared blind spots.`,
      tips: [
        `Leverage your shared rhythm to quickly establish rapport.`,
        `Watch out for common pitfalls (e.g. if both are 'D', avoid competing for control; if both are 'C', avoid endless analysis; if both are 'S', proactively push for growth challenges).`,
        `Set clear agendas to ensure all dimensions of development are covered.`,
      ],
    };
  }

  // Complementary pairs
  if (
    (mCode === "D" && eCode === "S") ||
    (mCode === "S" && eCode === "D") ||
    (mCode === "I" && eCode === "C") ||
    (mCode === "C" && eCode === "I")
  ) {
    return {
      title: `High Synergy Complementary Pairing (${mCode} ↔ ${eCode})`,
      harmonyScore: "Optimal Developmental Synergy (100%)",
      advice: `Your behavioral profiles are complementary opposites. This pairing offers the highest developmental return: the mentor provides what the mentee seeks to develop, and vice-versa.`,
      tips: [
        `Mentor (${mCode}): Adapt pacing to match your counterpart's listening and processing preferences.`,
        `Mentee (${eCode}): Treat your counterpart's style as a masterclass in behavioral flexibility and leadership range.`,
        `Focus on active listening and appreciate how differing perspectives solve problems more completely.`,
      ],
    };
  }

  return {
    title: `Cross-Functional Dynamic Pairing (${mCode} ↔ ${eCode})`,
    harmonyScore: "Strong Growth Synergy (85%)",
    advice: `Your styles bring distinct yet complementary strengths. Combining ${m.name.split(" ")[0]} leadership with ${e.name.split(" ")[0]} focus will foster broad leadership capabilities.`,
    tips: [
      `Agree on preferred meeting formats: direct and goal-focused or structured and reflective.`,
      `Document key insights and action commitments after every session.`,
      `Celebrate diverse approaches to site troubleshooting and team leadership.`,
    ],
  };
}
