import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing database tables...');
  await prisma.auditLog.deleteMany({});
  await prisma.surveyFeedback.deleteMany({});
  await prisma.actionItem.deleteMany({});
  await prisma.privateNote.deleteMany({});
  await prisma.sharedNotebook.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.mentoringPair.deleteMany({});
  await prisma.cohort.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.employee.deleteMany({});

  console.log('Seeding employees with Competency Framework alignment...');

  // Create Admin
  await prisma.employee.create({
    data: {
      employeeCode: 'EMP001',
      name: 'Puja Singh',
      email: 'puja.singh@rdc.in',
      department: 'HR, L&D & Operational Excellence',
      designation: 'Head of L&D and Operational Excellence',
      joinDate: new Date('2020-01-15'),
      role: 'ADMIN',
    },
  });

  // Create Mentors
  const mentorsData = [
    {
      employeeCode: 'EMP101',
      name: 'Amit Sharma',
      email: 'amit.sharma@corp.com',
      department: 'Plant Engineering & Reliability',
      designation: 'Chief Maintenance Engineer',
      joinDate: new Date('2017-05-10'),
      role: 'MENTOR' as const,
      discStyle: 'D',
      discRawResponse: { dominant: 45, influence: 20, steadiness: 15, compliance: 20 },
      careerGoals: 'Drive zero-unplanned downtime and institutionalize TPM asset care across plant units.',
      topics: [
        'Preventive Maintenance & Asset Care',
        'Cost & Resource Responsibility',
        'Safety, Operational Discipline & SARTAJ Ownership',
      ],
      availability: 'Tuesdays & Thursdays, 4:00 PM - 5:00 PM',
      commStyleNotes: 'Direct, structured, results-oriented, expects clear status on plant metrics.',
      isConsentShared: true,
      mentorCapacity: 2,
    },
    {
      employeeCode: 'EMP102',
      name: 'Priya Patel',
      email: 'priya.patel@corp.com',
      department: 'Supply Chain & Commercials',
      designation: 'VP of Strategic Sourcing & Contracts',
      joinDate: new Date('2018-03-20'),
      role: 'MENTOR' as const,
      discStyle: 'I',
      discRawResponse: { dominant: 20, influence: 50, steadiness: 20, compliance: 10 },
      careerGoals: 'Build strategic tier-1 vendor partnerships and develop negotiation rigor.',
      topics: [
        'Vendor & External Stakeholder Management',
        'Customer Orientation & Relationship Handling',
        'Communication & Assertiveness',
      ],
      availability: 'Wednesdays, 2:00 PM - 4:00 PM',
      commStyleNotes: 'Enthusiastic, collaborative, highly conversational, values empathy in negotiations.',
      isConsentShared: true,
      mentorCapacity: 2,
    },
    {
      employeeCode: 'EMP103',
      name: 'Rohan Verma',
      email: 'rohan.verma@corp.com',
      department: 'Quality Assurance & Standards',
      designation: 'Lead Quality & Compliance Auditor',
      joinDate: new Date('2016-11-01'),
      role: 'MENTOR' as const,
      discStyle: 'S',
      discRawResponse: { dominant: 15, influence: 20, steadiness: 50, compliance: 15 },
      careerGoals: 'Institutionalize trust-based auditing and build cross-functional team cohesion.',
      topics: [
        'Integrity & Trust',
        'Planning, Organizing & Coordination',
        'Team Orientation & Delegation',
      ],
      availability: 'Mondays, 10:00 AM - 12:00 PM',
      commStyleNotes: 'Patient listener, supportive, methodical, provides step-by-step guidance.',
      isConsentShared: true,
      mentorCapacity: 1,
    },
    {
      employeeCode: 'EMP104',
      name: 'Siddharth Malhotra',
      email: 'siddharth.m@corp.com',
      department: 'Manufacturing Operations',
      designation: 'Director of Plant Operations',
      joinDate: new Date('2015-08-12'),
      role: 'MENTOR' as const,
      discStyle: 'C',
      discRawResponse: { dominant: 15, influence: 15, steadiness: 20, compliance: 50 },
      careerGoals: 'Instill world-class operational discipline, SARTAJ safety, and cost governance.',
      topics: [
        'Safety, Operational Discipline & SARTAJ Ownership',
        'Functional Knowledge & Multiskilling',
        'Cost & Resource Responsibility',
      ],
      availability: 'Fridays, 3:00 PM - 5:00 PM',
      commStyleNotes: 'Analytical, data-driven, precise, prefers SOPs and evidence-based reports.',
      isConsentShared: true,
      mentorCapacity: 2,
    },
  ];

  for (const m of mentorsData) {
    await prisma.employee.create({ data: m });
  }

  // Create Mentees
  const menteesData = [
    {
      employeeCode: 'EMP201',
      name: 'Aarav Mehta',
      email: 'aarav.mehta@corp.com',
      department: 'Plant Engineering & Reliability',
      designation: 'Maintenance Engineer',
      joinDate: new Date('2025-06-01'),
      role: 'MENTEE' as const,
      discStyle: 'S',
      discRawResponse: { dominant: 10, influence: 20, steadiness: 55, compliance: 15 },
      careerGoals: 'Master predictive vibration analysis, asset care scheduling, and reduce equipment breakdowns.',
      topics: [
        'Preventive Maintenance & Asset Care',
        'Functional Knowledge & Multiskilling',
        'Cost & Resource Responsibility',
      ],
      challenges: [
        'Self-Confidence & Assertiveness',
        'Execution Under Pressure & High Stakes',
        'Workplace Anxiety & Stress Management',
      ],
      availability: 'Flexible, afternoons preferred',
      commStyleNotes: 'Reflective, methodical, prefers detailed walkthroughs of SOPs.',
      isConsentShared: true,
    },
    {
      employeeCode: 'EMP202',
      name: 'Ananya Iyer',
      email: 'ananya.iyer@corp.com',
      department: 'Procurement & Vendor Logistics',
      designation: 'Associate Contracts Manager',
      joinDate: new Date('2025-07-15'),
      role: 'MENTEE' as const,
      discStyle: 'C',
      discRawResponse: { dominant: 15, influence: 15, steadiness: 25, compliance: 45 },
      careerGoals: 'Strengthen commercial terms negotiation and streamline vendor SLA compliance tracking.',
      topics: [
        'Vendor & External Stakeholder Management',
        'Cost & Resource Responsibility',
        'Integrity & Trust',
      ],
      challenges: [
        'Inter-Personal Relations & Team Dynamics',
        'Navigating Hierarchy & Cross-Functional Visibility',
        'Career Path & Growth Trajectory',
      ],
      availability: 'Mid-week mornings',
      commStyleNotes: 'Analytical, data-oriented, prefers structured agendas and checklists.',
      isConsentShared: true,
    },
    {
      employeeCode: 'EMP203',
      name: 'Kabir Kapoor',
      email: 'kabir.kapoor@corp.com',
      department: 'EHS & Plant Safety',
      designation: 'Safety Officer',
      joinDate: new Date('2025-08-01'),
      role: 'MENTEE' as const,
      discStyle: 'I',
      discRawResponse: { dominant: 20, influence: 45, steadiness: 20, compliance: 15 },
      careerGoals: 'Champion 100% SARTAJ safety ownership across plant squads and lead engagement workshops.',
      topics: [
        'Safety, Operational Discipline & SARTAJ Ownership',
        'Communication & Assertiveness',
        'Team Orientation & Delegation',
      ],
      challenges: [
        'Work-Life Balance & Fatigue Management',
        'Personal Mastery & Self-Discipline',
        'Overcoming Fear of Failure & Imposter Feelings',
      ],
      availability: 'Thursdays all day',
      commStyleNotes: 'Outgoing, energetic, dynamic conversationalist, likes interactive mock scenarios.',
      isConsentShared: true,
    },
    {
      employeeCode: 'EMP204',
      name: 'Diya Joshi',
      email: 'diya.joshi@corp.com',
      department: 'Production Planning & Logistics',
      designation: 'Planning Engineer',
      joinDate: new Date('2025-09-01'),
      role: 'MENTEE' as const,
      discStyle: 'D',
      discRawResponse: { dominant: 45, influence: 20, steadiness: 15, compliance: 20 },
      careerGoals: 'Optimize production schedule turnaround times and lead cross-department coordination.',
      topics: [
        'Planning, Organizing & Coordination',
        'Customer Orientation & Relationship Handling',
        'Communication & Assertiveness',
      ],
      challenges: [
        'Adaptability to Plant / Site Realities',
        'Execution Under Pressure & High Stakes',
        'Inter-Personal Relations & Team Dynamics',
      ],
      availability: 'Tuesdays & Wednesdays',
      commStyleNotes: 'Fast-paced, action-oriented, appreciates direct and concise feedback.',
      isConsentShared: true,
    },
    {
      employeeCode: 'EMP205',
      name: 'Vikram Shah',
      email: 'vikram.shah@corp.com',
      department: 'Plant Operations & Reliability',
      designation: 'Graduate Engineer Trainee',
      joinDate: new Date('2026-06-01'),
      role: 'MENTEE' as const,
      isConsentShared: true,
      topics: [],
      challenges: [],
    },
  ];

  for (const m of menteesData) {
    await prisma.employee.create({ data: m });
  }

  console.log('Seeding competency resources...');
  const resourcesData = [
    {
      title: 'SARTAJ Ownership & Safety Operational Discipline Guide',
      url: 'https://internal.corp.com/safety/sartaj-framework',
      content: 'A comprehensive playbook detailing SARTAJ safety ownership protocols, incident reporting rigor, and zero-tolerance operational discipline rules for plant and field engineers.',
      tags: ['Safety, Operational Discipline & SARTAJ Ownership', 'Functional Knowledge & Multiskilling', 'Integrity & Trust'],
      isApproved: true,
    },
    {
      title: 'Preventive Maintenance & Asset Care Best Practices (TPM)',
      url: 'https://internal.corp.com/engineering/asset-care',
      content: 'Guidelines on implementing Total Productive Maintenance (TPM), autonomous maintenance checklists, predictive analytics, and maximizing equipment lifecycle.',
      tags: ['Preventive Maintenance & Asset Care', 'Cost & Resource Responsibility', 'Functional Knowledge & Multiskilling'],
      isApproved: true,
    },
    {
      title: 'Vendor Negotiation & Stakeholder Relationship Management',
      url: 'https://internal.corp.com/commercial/vendor-excellence',
      content: 'Techniques for managing vendor SLAs, negotiating contracts, upholding corporate integrity, and navigating conflict with external suppliers.',
      tags: ['Vendor & External Stakeholder Management', 'Cost & Resource Responsibility', 'Communication & Assertiveness'],
      isApproved: true,
    },
    {
      title: 'Cost & Resource Responsibility in Project Execution',
      url: 'https://internal.corp.com/governance/cost-optimization',
      content: 'Frameworks for CAPEX/OPEX budget tracking, eliminating operational waste, resource allocation, and achieving sustainable cost optimization.',
      tags: ['Cost & Resource Responsibility', 'Planning, Organizing & Coordination', 'Integrity & Trust'],
      isApproved: true,
    },
    {
      title: 'The GROW Coaching Model for Operations Leaders',
      url: 'https://www.mindtools.com/grow-model',
      content: 'A structured methodology (Goal, Reality, Options, Will) tailored for coaching engineers through operational bottlenecks and delegation.',
      tags: ['Team Orientation & Delegation', 'Communication & Assertiveness', 'GROW Model Coaching'],
      isApproved: true,
    },
    {
      title: 'DISC Behavioral Profiles in Corporate Engineering Teams',
      url: 'https://www.discprofile.com/what-is-disc/overview',
      content: 'Understanding how Dominance, Influence, Steadiness, and Compliance impact plant floor communication, assertiveness, and leadership trust.',
      tags: ['DISC-D Style', 'DISC-I Style', 'DISC-S Style', 'DISC-C Style', 'Communication & Assertiveness'],
      isApproved: true,
    },
  ];

  for (const r of resourcesData) {
    await prisma.resource.create({ data: r });
  }

  console.log('Seeding draft cohort...');
  await prisma.cohort.create({
    data: {
      name: 'Q3 2026 Cohort',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-09-23'),
      status: 'MATCHING',
    },
  });

  console.log('Seeding completed successfully with Competency Framework!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
