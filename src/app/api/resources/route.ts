import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/db';
import { getSession } from '@/lib/auth';

const DEFAULT_RESOURCES = [
  {
    title: 'SARTAJ Safety Culture & Operational Discipline Playbook',
    url: 'https://safety.margdarshan.internal/sartaj-playbook',
    content: 'Comprehensive standard operating procedures for zero-harm engineering, proactive hazard reporting, personal safety commitments, and shop-floor safety governance.',
    tags: ['Safety, Operational Discipline & SARTAJ Ownership', 'GROW Model Coaching'],
    isApproved: true,
  },
  {
    title: 'GROW Coaching Model: Practical Guide for Mentors',
    url: 'https://learning.margdarshan.internal/grow-framework',
    content: 'Step-by-step coaching framework (Goal, Reality, Options, Will) tailored for engineering mentors guiding young Graduate Engineer Trainees through real plant scenarios.',
    tags: ['GROW Model Coaching', 'Communication & Assertiveness'],
    isApproved: true,
  },
  {
    title: 'DISC Behavioral Dynamics & Upward Communication Guide',
    url: 'https://learning.margdarshan.internal/disc-guide',
    content: 'Strategies for Dominance (D), Influence (I), Steadiness (S), and Conscientiousness (C) communication styles across cross-functional operations and leadership interactions.',
    tags: ['DISC-D Style', 'DISC-I Style', 'DISC-S Style', 'DISC-C Style', 'Communication & Assertiveness'],
    isApproved: true,
  },
  {
    title: 'Total Productive Maintenance (TPM) & Autonomous Asset Care',
    url: 'https://operations.margdarshan.internal/tpm-standards',
    content: 'Standard maintenance blueprints, 5S autonomous maintenance schedules, predictive vibration monitoring, and root-cause breakdown elimination workflows.',
    tags: ['Preventive Maintenance & Asset Care', 'Functional Knowledge & Multiskilling'],
    isApproved: true,
  },
  {
    title: 'Vendor Contract SLA & Commercial Stakeholder Negotiation',
    url: 'https://procurement.margdarshan.internal/vendor-sla-toolkit',
    content: 'Best practices for commercial negotiation, contractual penalty frameworks, strategic supplier relationship building, and supply risk mitigation.',
    tags: ['Vendor & External Stakeholder Management', 'Cost & Resource Responsibility'],
    isApproved: true,
  },
  {
    title: 'Planning, Organizing & Structured Coordination for Plant Engineers',
    url: 'https://planning.margdarshan.internal/coordination-guide',
    content: 'Gantt-based milestone scheduling, engineering change management routines, CAPEX budget allocation, and multi-disciplinary operational coordination.',
    tags: ['Planning, Organizing & Coordination', 'Team Orientation & Delegation'],
    isApproved: true,
  },
];

export async function GET() {
  try {
    await ensureDatabaseSchema();
    const session = await getSession().catch(() => null);

    // Auto-seed default resources if none exist
    const count = await prisma.resource.count().catch(() => 0);
    if (count === 0) {
      for (const item of DEFAULT_RESOURCES) {
        await prisma.resource.create({
          data: {
            title: item.title,
            url: item.url,
            content: item.content,
            tags: item.tags,
            isApproved: true,
            contributedByCode: 'EMP001',
          },
        }).catch((e) => console.warn('Resource seed warn:', e));
      }
    }

    const resources = await prisma.resource.findMany({
      where: session?.employeeCode
        ? {
            OR: [
              { isApproved: true },
              { contributedByCode: session.employeeCode },
            ],
          }
        : { isApproved: true },
      orderBy: { title: 'asc' },
    }).catch(() => []);

    return NextResponse.json({ resources });
  } catch (error) {
    console.error('Fetch resources error:', error);
    // Fallback to in-memory default resources if database query encounters an issue
    return NextResponse.json({ resources: DEFAULT_RESOURCES.map((r, idx) => ({ id: `seed-${idx}`, ...r })) });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const session = await getSession().catch(() => null);

    const body = await req.json();
    const { title, url, content, tags } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const tagsArray = Array.isArray(tags) ? tags : [];
    const contributorCode = session?.employeeCode || 'EMP001';

    const resource = await prisma.resource.create({
      data: {
        title,
        url: url || null,
        content: content || '',
        tags: tagsArray,
        contributedByCode: contributorCode,
        isApproved: session?.role === 'ADMIN' || !session, // Auto-approved if Admin
      },
    });

    try {
      if (session?.employeeCode) {
        const userExists = await prisma.employee.findUnique({ where: { employeeCode: session.employeeCode } });
        if (userExists) {
          await prisma.auditLog.create({
            data: {
              performedByCode: session.employeeCode,
              action: 'CONTRIBUTE_RESOURCE',
              details: `Resource "${title}" contributed by ${session.name || session.employeeCode}`,
            },
          });
        }
      }
    } catch (auditErr) {
      console.warn('Audit log write skipped:', auditErr);
    }

    return NextResponse.json({ success: true, resource });
  } catch (error: any) {
    console.error('Contribute resource error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
