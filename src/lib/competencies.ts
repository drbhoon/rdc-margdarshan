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
