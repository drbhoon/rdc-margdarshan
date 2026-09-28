import { prisma, ensureDatabaseSchema } from "@/lib/db";
import { calculateMatchScore } from "@/lib/competencies";

export interface DemoAccount {
  employeeCode: string;
  name: string;
  email: string;
  role: "MENTOR" | "MENTEE" | "ADMIN";
  department: string;
  designation: string;
  highestQualification: string;
  location: string;
  discStyle: string;
  discRawResponse: { dominant: number; influence: number; steadiness: number; compliance: number };
  careerGoals: string;
  topics: string[];
  challenges: string[];
  availability: string;
  googleSubject: string;
  mentorCapacity: number;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  // Pair 1 - Mentor
  {
    employeeCode: "EMP101",
    name: "Rajesh Sharma",
    email: "rajesh.sharma@rdc.in",
    role: "MENTOR",
    department: "Operations",
    designation: "Senior Operations Manager",
    highestQualification: "B.Tech Civil Engineering",
    location: "Turbhe Plant, Navi Mumbai",
    discStyle: "D",
    discRawResponse: { dominant: 60, influence: 20, steadiness: 10, compliance: 10 },
    careerGoals: "Drive operational excellence, zero-incident safety culture, and mentor GETs into plant managers.",
    topics: [
      "Cost & Resource Responsibility",
      "Planning, Organizing & Coordination",
      "Safety, Operational Discipline & SARTAJ Ownership",
    ],
    challenges: [
      "Optimizing transit mixer turnaround times",
      "Building assertive decision-making in young site engineers",
    ],
    availability: "Tuesdays & Thursdays, 4:00 PM - 5:30 PM",
    googleSubject: "demo-sub-emp101",
    mentorCapacity: 2,
  },
  // Pair 1 - Mentee
  {
    employeeCode: "EMP201",
    name: "Amit Verma",
    email: "amit.verma@rdc.in",
    role: "MENTEE",
    department: "Quality & Production",
    designation: "Graduate Engineer Trainee",
    highestQualification: "B.Tech Civil",
    location: "Pune Plant",
    discStyle: "S",
    discRawResponse: { dominant: 10, influence: 20, steadiness: 60, compliance: 10 },
    careerGoals: "Master concrete mix design, batching plant telemetry, and develop confidence in site coordination.",
    topics: [
      "Communication & Assertiveness",
      "Functional Knowledge & Multiskilling",
      "Safety, Operational Discipline & SARTAJ Ownership",
    ],
    challenges: [
      "Self-Confidence & Assertiveness",
      "Workplace Anxiety & Stress Management",
      "Execution Under Pressure & High Stakes",
    ],
    availability: "Tuesdays & Thursdays, 4:00 PM - 5:30 PM",
    googleSubject: "demo-sub-emp201",
    mentorCapacity: 1,
  },
  // Pair 2 - Mentor
  {
    employeeCode: "EMP102",
    name: "Shalini Iyer",
    email: "shalini.iyer@rdc.in",
    role: "MENTOR",
    department: "Technical & Quality",
    designation: "Technical Quality Head",
    highestQualification: "M.Tech Concrete Technology & Materials",
    location: "Mumbai Central Lab",
    discStyle: "C",
    discRawResponse: { dominant: 10, influence: 10, steadiness: 20, compliance: 60 },
    careerGoals: "Pioneer low-carbon concrete mixes, implement automated slump testing, and groom technical leaders.",
    topics: [
      "Functional Knowledge & Multiskilling",
      "Preventive Maintenance & Asset Care",
      "Vendor & External Stakeholder Management",
    ],
    challenges: [
      "Translating laboratory R&D into fast-paced plant production",
      "Coaching engineers on quality compliance rigor",
    ],
    availability: "Mondays & Wednesdays, 3:00 PM - 4:30 PM",
    googleSubject: "demo-sub-emp102",
    mentorCapacity: 2,
  },
  // Pair 2 - Mentee
  {
    employeeCode: "EMP202",
    name: "Priya Patel",
    email: "priya.patel@rdc.in",
    role: "MENTEE",
    department: "Plant Maintenance & Ops",
    designation: "Graduate Engineer Trainee",
    highestQualification: "B.E. Mechanical Engineering",
    location: "Ahmedabad Plant",
    discStyle: "I",
    discRawResponse: { dominant: 15, influence: 60, steadiness: 15, compliance: 10 },
    careerGoals: "Become an expert in preventive plant maintenance, batching software calibration, and team leadership.",
    topics: [
      "Customer Orientation & Relationship Handling",
      "Team Orientation & Delegation",
      "Preventive Maintenance & Asset Care",
    ],
    challenges: [
      "Inter-Personal Relations & Team Dynamics",
      "Navigating Hierarchy & Cross-Functional Visibility",
      "Adaptability to Plant / Site Realities",
    ],
    availability: "Mondays & Wednesdays, 3:00 PM - 4:30 PM",
    googleSubject: "demo-sub-emp202",
    mentorCapacity: 1,
  },
  // Admin
  {
    employeeCode: "ADMIN001",
    name: "Dr. K.S. Bhoon",
    email: "ks.bhoon@rdc.in",
    role: "ADMIN",
    department: "Human Resources & Leadership",
    designation: "Head - Leadership Development & Margdarshan",
    highestQualification: "Ph.D. Organizational Development",
    location: "Corporate Office, Mumbai",
    discStyle: "D/I",
    discRawResponse: { dominant: 40, influence: 40, steadiness: 10, compliance: 10 },
    careerGoals: "Establish world-class corporate mentorship, engineering growth pathways, and employee retention.",
    topics: [
      "Team Orientation & Delegation",
      "Integrity & Trust",
      "Planning, Organizing & Coordination",
    ],
    challenges: [
      "Mentoring Program Scale & Engagement",
      "Cross-Functional Alignment",
    ],
    availability: "Daily 9:00 AM - 6:00 PM",
    googleSubject: "demo-sub-admin001",
    mentorCapacity: 5,
  },
];

export async function ensureDemoData() {
  await ensureDatabaseSchema();

  // 1. Ensure Cohort
  let cohort = await prisma.cohort.findFirst({
    where: { status: { in: ["MATCHING", "ACTIVE"] } },
    orderBy: { startDate: "desc" },
  });

  if (!cohort) {
    cohort = await prisma.cohort.create({
      data: {
        name: "RDC GET Margdarshan Cohort 2026",
        startDate: new Date(),
        endDate: new Date(Date.now() + 91 * 86400000),
        status: "ACTIVE",
      },
    });
  }

  // 2. Upsert Demo Accounts
  for (const acc of DEMO_ACCOUNTS) {
    await prisma.employee.upsert({
      where: { employeeCode: acc.employeeCode },
      update: {
        name: acc.name,
        email: acc.email,
        role: acc.role,
        department: acc.department,
        designation: acc.designation,
        highestQualification: acc.highestQualification,
        location: acc.location,
        discStyle: acc.discStyle,
        discRawResponse: acc.discRawResponse,
        careerGoals: acc.careerGoals,
        topics: acc.topics,
        challenges: acc.challenges,
        availability: acc.availability,
        googleSubject: acc.googleSubject,
        mentorCapacity: acc.mentorCapacity,
        isConsentShared: true,
        isActive: true,
      },
      create: {
        employeeCode: acc.employeeCode,
        name: acc.name,
        email: acc.email,
        role: acc.role,
        department: acc.department,
        designation: acc.designation,
        highestQualification: acc.highestQualification,
        location: acc.location,
        discStyle: acc.discStyle,
        discRawResponse: acc.discRawResponse,
        careerGoals: acc.careerGoals,
        topics: acc.topics,
        challenges: acc.challenges,
        availability: acc.availability,
        googleSubject: acc.googleSubject,
        mentorCapacity: acc.mentorCapacity,
        joinDate: new Date("2026-01-15"),
        isConsentShared: true,
        isActive: true,
      },
    });
  }

  // 3. Ensure Pair 1: Rajesh Sharma (EMP101) <-> Amit Verma (EMP201)
  const existingPair1 = await prisma.mentoringPair.findFirst({
    where: {
      mentorCode: "EMP101",
      menteeCode: "EMP201",
    },
  });

  if (!existingPair1) {
    const mentor = DEMO_ACCOUNTS[0];
    const mentee = DEMO_ACCOUNTS[1];
    const matchScore = calculateMatchScore(mentor, mentee);

    const pair1 = await prisma.mentoringPair.create({
      data: {
        cohortId: cohort.id,
        mentorCode: "EMP101",
        menteeCode: "EMP201",
        status: "ACTIVE",
        matchScore,
        mentorAcceptedAt: new Date(),
        menteeAcceptedAt: new Date(),
        sharedGoals: "Master site operational discipline, transit mixer turnaround, and assertive communication on site.",
      },
    });

    // Create initial 13 sessions
    for (let w = 0; w <= 12; w++) {
      const isWeek0 = w === 0;
      await prisma.session.create({
        data: {
          pairId: pair1.id,
          weekNumber: w,
          status: isWeek0 ? "COMPLETED" : "SCHEDULED",
          agenda: isWeek0
            ? "Alignment, Expectations & DISC Harmony"
            : `Week ${w} Operational Check-in & Growth Milestone`,
          scheduledTime: isWeek0
            ? new Date(Date.now() - 7 * 86400000)
            : new Date(Date.now() + (w * 7) * 86400000),
          googleMeetLink: `https://meet.google.com/rdc-mar-${w + 100}`,
          discussionPoints: isWeek0
            ? "Reviewed DISC complementary traits (D & S). Established weekly check-in cadence."
            : null,
          commitments: isWeek0
            ? "Amit to shadow morning batching plant dispatch and practice radio communications."
            : null,
        },
      });
    }
  }

  // 4. Ensure Pair 2: Shalini Iyer (EMP102) <-> Priya Patel (EMP202)
  const existingPair2 = await prisma.mentoringPair.findFirst({
    where: {
      mentorCode: "EMP102",
      menteeCode: "EMP202",
    },
  });

  if (!existingPair2) {
    const mentor = DEMO_ACCOUNTS[2];
    const mentee = DEMO_ACCOUNTS[3];
    const matchScore = calculateMatchScore(mentor, mentee);

    const pair2 = await prisma.mentoringPair.create({
      data: {
        cohortId: cohort.id,
        mentorCode: "EMP102",
        menteeCode: "EMP202",
        status: "ACTIVE",
        matchScore,
        mentorAcceptedAt: new Date(),
        menteeAcceptedAt: new Date(),
        sharedGoals: "Concrete quality testing standards, plant preventive maintenance, and cross-functional leadership.",
      },
    });

    // Create initial 13 sessions
    for (let w = 0; w <= 12; w++) {
      const isWeek0 = w === 0;
      await prisma.session.create({
        data: {
          pairId: pair2.id,
          weekNumber: w,
          status: isWeek0 ? "COMPLETED" : "SCHEDULED",
          agenda: isWeek0
            ? "Introductory Alignment & Quality Standards"
            : `Week ${w} Quality & Plant Maintenance Review`,
          scheduledTime: isWeek0
            ? new Date(Date.now() - 5 * 86400000)
            : new Date(Date.now() + (w * 7 + 2) * 86400000),
          googleMeetLink: `https://meet.google.com/rdc-sha-${w + 200}`,
          discussionPoints: isWeek0
            ? "Discussed DISC synergy (C & I) and set target for concrete slump testing precision."
            : null,
          commitments: isWeek0
            ? "Priya to log daily moisture test records and review batching tolerances."
            : null,
        },
      });
    }
  }
}
