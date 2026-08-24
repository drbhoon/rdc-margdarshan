import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { pairId } = await params;

    const pair = await prisma.mentoringPair.findUnique({
      where: { id: pairId },
      include: {
        mentee: true,
        mentor: true,
        cohort: true,
        sessions: {
          orderBy: { weekNumber: 'asc' },
        },
      },
    });

    if (!pair) {
      return new Response('Pairing not found', { status: 404 });
    }

    if (pair.menteeCode !== session.employeeCode && pair.mentorCode !== session.employeeCode) {
      return new Response('Access denied', { status: 403 });
    }

    // Fetch action items
    const actionItems = await prisma.actionItem.findMany({
      where: {
        sessionId: {
          in: pair.sessions.map((s) => s.id),
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Generate print-friendly HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Margdarshan Mentoring Summary - ${pair.cohort.name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #334155;
      line-height: 1.5;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }
    h1 {
      font-size: 28px;
      color: #0f172a;
      margin-bottom: 5px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
    }
    h2 {
      font-size: 20px;
      color: #1e293b;
      margin-top: 30px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 5px;
    }
    h3 {
      font-size: 14px;
      color: #475569;
      margin-top: 20px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .meta-grid {
      display: grid;
      grid-template-cols: 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .meta-item {
      font-size: 14px;
    }
    .meta-item strong {
      color: #0f172a;
    }
    .goals-box {
      background: #f1f5f9;
      border-left: 4px solid #475569;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
      white-space: pre-wrap;
    }
    .session-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .session-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .session-title {
      font-weight: bold;
      color: #0f172a;
      font-size: 16px;
    }
    .session-status {
      font-size: 12px;
      background: #e2e8f0;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: bold;
    }
    .note-grid {
      display: grid;
      grid-template-cols: 1fr;
      gap: 15px;
    }
    @media (min-width: 600px) {
      .note-grid {
        grid-template-cols: 1fr 1fr;
      }
    }
    .note-block {
      background: #fafafa;
      padding: 10px 15px;
      border-radius: 6px;
      border: 1px solid #f0f0f0;
    }
    .note-block strong {
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
      display: block;
      margin-bottom: 5px;
    }
    .note-text {
      font-size: 13px;
      color: #334155;
      white-space: pre-wrap;
    }
    .actions-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 13px;
    }
    .actions-table th, .actions-table td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    .actions-table th {
      background: #f8fafc;
      color: #475569;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
    .print-button {
      background: #0f172a;
      color: #fff;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div style="display: flex; justify-content: space-between; align-items: center;" class="no-print">
    <button class="print-button" onclick="window.print()">Print to PDF / Save Summary</button>
  </div>

  <h1>Margdarshan Mentoring Summary</h1>
  <p style="color: #64748b; font-size: 14px;">Official Close-out Record of 12-Week Mentoring Partnership</p>

  <div class="meta-grid">
    <div class="meta-item">
      <p><strong>Cohort:</strong> ${pair.cohort.name}</p>
      <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
    <div class="meta-item">
      <p><strong>Mentor:</strong> ${pair.mentor.name} (${pair.mentor.designation}, ${pair.mentor.department})</p>
      <p><strong>Mentee:</strong> ${pair.mentee.name} (${pair.mentee.designation}, ${pair.mentee.department})</p>
    </div>
  </div>

  <h2>Co-Created Development Goals</h2>
  <div class="goals-box">${pair.sharedGoals || 'No shared goals logged.'}</div>

  <h2>Commitments & Actions Summary</h2>
  <table class="actions-table">
    <thead>
      <tr>
        <th>Action Item</th>
        <th>Due Date</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${
        actionItems.length === 0
          ? '<tr><td colspan="3" style="text-align: center; color: #94a3b8;">No action items recorded.</td></tr>'
          : actionItems
              .map(
                (act) => `
        <tr>
          <td>
            <strong>${act.title}</strong>
            ${act.description ? `<br/><span style="font-size: 11px; color: #64748b;">${act.description}</span>` : ''}
          </td>
          <td>${new Date(act.dueDate).toLocaleDateString()}</td>
          <td><strong style="color: ${act.status === 'COMPLETED' ? '#16a34a' : '#d97706'}">${act.status}</strong></td>
        </tr>
      `
              )
              .join('')
      }
    </tbody>
  </table>

  <h2>Weekly Journey Logs</h2>
  <div>
    ${pair.sessions
      .map((s) => {
        const themes = [
          'Kick-off & Contracting (SARTAJ Safety Ownership & Agreement)',
          'Communication & Assertiveness (DISC Dynamics & Shop-Floor Presence)',
          'Functional Knowledge & Multiskilling (Core Technical Standards)',
          'Planning, Organizing & Coordination (Project Scheduling)',
          'Cost & Resource Responsibility (Waste Reduction & CAPEX/OPEX)',
          'Integrity & Trust (Governance & Evidence-Based Feedback)',
          'Mid-Point Pulse Check (Systemic Cascade Evaluation)',
          'Customer Orientation & Relationship Handling (SLA Commitments)',
          'Preventive Maintenance & Asset Care (TPM & Zero Downtime)',
          'Vendor & External Stakeholder Management (Commercial Contracts)',
          'Team Orientation & Delegation (Accountability & Squad Cohesion)',
          'Safety, Operational Discipline & SARTAJ Ownership (Habits)',
          'Close-out & Feedback (Competency Mastery & Summary Export)',
        ];
        return `
        <div class="session-card">
          <div class="session-header">
            <span class="session-title">Week ${s.weekNumber}: ${themes[s.weekNumber] || '1:1 Session'}</span>
            <span class="session-status">${s.status}</span>
          </div>
          <div class="note-grid">
            <div class="note-block">
              <strong>Pre-Session Agenda</strong>
              <div class="note-text">${s.preSessionNotes || 'N/A'}</div>
            </div>
            <div class="note-block">
              <strong>Discussion Points</strong>
              <div class="note-text">${s.discussionPoints || 'N/A'}</div>
            </div>
            <div class="note-block">
              <strong>Key Insights</strong>
              <div class="note-text">${s.insights || 'N/A'}</div>
            </div>
            <div class="note-block">
              <strong>Commitments & Support</strong>
              <div class="note-text">${s.commitments || 'N/A'}</div>
            </div>
          </div>
        </div>
      `;
      })
      .join('')}
  </div>

  <script>
    window.onload = () => {
      // Auto-trigger print dialog if in print query mode
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('print') === 'true') {
        window.print();
      }
    };
  </script>
</body>
</html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Export report error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
