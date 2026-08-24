import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET: List all candidate employees
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const employees = await prisma.employee.findMany({
      where: { role: { in: ['MENTEE', 'MENTOR'] } },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Candidate fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }
}

// POST: Add a single candidate or bulk candidates
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await req.json();

    // Check if it's a broadcast invites command
    if (body.action === 'BROADCAST_INVITES') {
      const candidates = await prisma.employee.findMany({
        where: { role: { in: ['MENTEE', 'MENTOR'] } },
      });

      const { sendCandidateInviteEmail } = await import('@/lib/email');

      let sentCount = 0;
      for (const c of candidates) {
        try {
          await sendCandidateInviteEmail({
            to: c.email,
            name: c.name,
            role: c.role as 'MENTEE' | 'MENTOR',
            employeeCode: c.employeeCode,
          });
          sentCount++;
        } catch (mailErr) {
          console.error(`Failed to send email to ${c.email}:`, mailErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Broadcast complete: Program invitations dispatched to ${sentCount} candidates from noreply@rdc.in`,
        count: sentCount,
      });
    }

    // Check if it's a reset command
    if (body.action === 'RESET_DATABASE') {
      // Delete all dependent entities
      await prisma.auditLog.deleteMany();
      await prisma.surveyFeedback.deleteMany();
      await prisma.actionItem.deleteMany();
      await prisma.sharedNotebook.deleteMany();
      await prisma.session.deleteMany();
      await prisma.mentoringPair.deleteMany();
      await prisma.cohort.deleteMany();

      // Delete all employees EXCEPT Radhika Sen (Admin)
      await prisma.employee.deleteMany({
        where: {
          employeeCode: { not: 'EMP001' },
        },
      });

      // Ensure Admin exists
      await prisma.employee.upsert({
        where: { employeeCode: 'EMP001' },
        update: {
          name: 'Radhika Sen',
          email: 'radhika.sen@corp.com',
          role: 'ADMIN',
          department: 'HR, L&D & Operational Excellence',
          designation: 'Head of Leadership Development',
        },
        create: {
          employeeCode: 'EMP001',
          name: 'Radhika Sen',
          email: 'radhika.sen@corp.com',
          role: 'ADMIN',
          department: 'HR, L&D & Operational Excellence',
          designation: 'Head of Leadership Development',
          joinDate: new Date('2020-01-01'),
          isConsentShared: true,
          topics: [],
          challenges: [],
        },
      });

      // Create a default rolling cohort
      const now = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(now.getMonth() + 3);

      await prisma.cohort.create({
        data: {
          name: 'Rolling 3-Month Mentoring Program (2026)',
          startDate: now,
          endDate: threeMonthsLater,
          status: 'MATCHING',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Database cleaned successfully! Roster reset to blank slate (Admin preserved).',
      });
    }

    // Bulk insertion mode
    if (Array.isArray(body.candidates)) {
      const created = [];
      for (const c of body.candidates) {
        if (!c.employeeCode || !c.name || !c.email || !c.role) continue;

        const emp = await prisma.employee.upsert({
          where: { employeeCode: c.employeeCode.trim() },
          update: {
            name: c.name.trim(),
            email: c.email.trim(),
            role: c.role,
            department: c.department?.trim() || 'Engineering',
            designation: c.designation?.trim() || (c.role === 'MENTEE' ? 'Graduate Engineer Trainee' : 'Engineering Manager'),
          },
          create: {
            employeeCode: c.employeeCode.trim(),
            name: c.name.trim(),
            email: c.email.trim(),
            role: c.role,
            department: c.department?.trim() || 'Engineering',
            designation: c.designation?.trim() || (c.role === 'MENTEE' ? 'Graduate Engineer Trainee' : 'Engineering Manager'),
            joinDate: c.joinDate ? new Date(c.joinDate) : new Date(),
            isConsentShared: true,
            topics: [],
            challenges: [],
          },
        });
        created.push(emp);
      }

      return NextResponse.json({
        success: true,
        count: created.length,
        candidates: created,
      });
    }

    // Single candidate addition
    const { employeeCode, name, email, role, department, designation, joinDate } = body;
    if (!employeeCode || !name || !email || !role) {
      return NextResponse.json({ error: 'Missing required candidate fields (Code, Name, Email, Role).' }, { status: 400 });
    }

    const candidate = await prisma.employee.upsert({
      where: { employeeCode: employeeCode.trim() },
      update: {
        name: name.trim(),
        email: email.trim(),
        role: role,
        department: department?.trim() || 'Engineering',
        designation: designation?.trim() || (role === 'MENTEE' ? 'Graduate Engineer Trainee' : 'Manager'),
      },
      create: {
        employeeCode: employeeCode.trim(),
        name: name.trim(),
        email: email.trim(),
        role: role,
        department: department?.trim() || 'Engineering',
        designation: designation?.trim() || (role === 'MENTEE' ? 'Graduate Engineer Trainee' : 'Manager'),
        joinDate: joinDate ? new Date(joinDate) : new Date(),
        isConsentShared: true,
        topics: [],
        challenges: [],
      },
    });

    return NextResponse.json({ success: true, candidate });
  } catch (error: any) {
    console.error('Candidate create/reset error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process candidates' }, { status: 500 });
  }
}
