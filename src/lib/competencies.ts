// Core Competency Framework definition for Margdarshan

export const COMPETENCIES = [
  'Communication & Assertiveness',
  'Cost & Resource Responsibility',
  'Customer Orientation & Relationship Handling',
  'Functional Knowledge & Multiskilling',
  'Integrity & Trust',
  'Planning, Organizing & Coordination',
  'Preventive Maintenance & Asset Care',
  'Safety, Operational Discipline & SARTAJ Ownership',
  'Team Orientation & Delegation',
  'Vendor & External Stakeholder Management',
] as const;

export type Competency = (typeof COMPETENCIES)[number];

// Real-world human & behavioral challenges faced by young engineers
export const DEVELOPMENTAL_CHALLENGES = [
  'Self-Confidence & Assertiveness',
  'Workplace Anxiety & Stress Management',
  'Inter-Personal Relations & Team Dynamics',
  'Work-Life Balance & Fatigue Management',
  'Personal Mastery & Self-Discipline',
  'Execution Under Pressure & High Stakes',
  'Career Path & Growth Trajectory',
  'Navigating Hierarchy & Cross-Functional Visibility',
  'Overcoming Fear of Failure & Imposter Feelings',
  'Adaptability to Plant / Site Realities',
] as const;

export type DevelopmentalChallenge = (typeof DEVELOPMENTAL_CHALLENGES)[number];

// Primary to Secondary Competency Overlap Matrix (from framework snapshot)
export const COMPETENCY_MATRIX: Record<Competency, Competency[]> = {
  'Communication & Assertiveness': [
    'Customer Orientation & Relationship Handling',
    'Planning, Organizing & Coordination',
    'Preventive Maintenance & Asset Care',
    'Safety, Operational Discipline & SARTAJ Ownership',
    'Vendor & External Stakeholder Management',
  ],
  'Cost & Resource Responsibility': [
    'Functional Knowledge & Multiskilling',
    'Integrity & Trust',
    'Planning, Organizing & Coordination',
    'Safety, Operational Discipline & SARTAJ Ownership',
    'Team Orientation & Delegation',
  ],
  'Customer Orientation & Relationship Handling': [
    'Communication & Assertiveness',
    'Cost & Resource Responsibility',
    'Functional Knowledge & Multiskilling',
    'Integrity & Trust',
    'Planning, Organizing & Coordination',
    'Safety, Operational Discipline & SARTAJ Ownership',
  ],
  'Functional Knowledge & Multiskilling': [
    'Cost & Resource Responsibility',
    'Customer Orientation & Relationship Handling',
    'Integrity & Trust',
    'Planning, Organizing & Coordination',
    'Preventive Maintenance & Asset Care',
    'Safety, Operational Discipline & SARTAJ Ownership',
    'Team Orientation & Delegation',
    'Vendor & External Stakeholder Management',
  ],
  'Integrity & Trust': [
    'Communication & Assertiveness',
    'Cost & Resource Responsibility',
    'Customer Orientation & Relationship Handling',
    'Functional Knowledge & Multiskilling',
    'Safety, Operational Discipline & SARTAJ Ownership',
    'Vendor & External Stakeholder Management',
  ],
  'Planning, Organizing & Coordination': [
    'Cost & Resource Responsibility',
    'Customer Orientation & Relationship Handling',
    'Functional Knowledge & Multiskilling',
    'Team Orientation & Delegation',
    'Vendor & External Stakeholder Management',
  ],
  'Preventive Maintenance & Asset Care': [
    'Cost & Resource Responsibility',
    'Functional Knowledge & Multiskilling',
    'Safety, Operational Discipline & SARTAJ Ownership',
  ],
  'Safety, Operational Discipline & SARTAJ Ownership': [
    'Cost & Resource Responsibility',
    'Functional Knowledge & Multiskilling',
    'Integrity & Trust',
    'Planning, Organizing & Coordination',
    'Preventive Maintenance & Asset Care',
    'Team Orientation & Delegation',
  ],
  'Team Orientation & Delegation': [
    'Communication & Assertiveness',
    'Planning, Organizing & Coordination',
    'Safety, Operational Discipline & SARTAJ Ownership',
    'Vendor & External Stakeholder Management',
  ],
  'Vendor & External Stakeholder Management': [
    'Communication & Assertiveness',
    'Cost & Resource Responsibility',
    'Functional Knowledge & Multiskilling',
    'Integrity & Trust',
    'Planning, Organizing & Coordination',
    'Safety, Operational Discipline & SARTAJ Ownership',
  ],
};

export function calculateMatchScore(
  mentor: { discStyle?: string | null; department?: string | null; topics?: string[] },
  mentee: { discStyle?: string | null; department?: string | null; topics?: string[] }
): number {
  let discScore = 0.5;
  const mStyle = mentor.discStyle;
  const eStyle = mentee.discStyle;
  if (mStyle && eStyle) {
    const mChar = mStyle.charAt(0);
    const eChar = eStyle.charAt(0);
    if (mChar === eChar) {
      discScore = 0.4;
    } else {
      const complementary = [
        ['D', 'S'],
        ['S', 'D'],
        ['I', 'C'],
        ['C', 'I'],
      ];
      const isComp = complementary.some(([a, b]) => a === mChar && b === eChar);
      discScore = isComp ? 1.0 : 0.6;
    }
  }

  const deptScore = mentor.department && mentee.department && mentor.department !== mentee.department ? 1.0 : 0.4;

  const mTopics = mentor.topics || [];
  const eTopics = mentee.topics || [];
  let compScore = 0.5;
  if (eTopics.length > 0) {
    const directMatches = eTopics.filter((t) => mTopics.includes(t)).length;
    let secondaryMatches = 0;
    for (const eTopic of eTopics) {
      const secondaries = COMPETENCY_MATRIX[eTopic as Competency] || [];
      const hasSecondary = secondaries.some((sec) => mTopics.includes(sec));
      if (hasSecondary) secondaryMatches += 1;
    }
    if (directMatches > 0) {
      compScore = Math.min(1.0, 0.7 + directMatches * 0.15 + secondaryMatches * 0.05);
    } else if (secondaryMatches > 0) {
      compScore = Math.min(0.8, 0.4 + secondaryMatches * 0.1);
    } else {
      compScore = 0.3;
    }
  }

  return Number((0.35 * discScore + 0.25 * deptScore + 0.40 * compScore).toFixed(2));
}

