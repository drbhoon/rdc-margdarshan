import nodemailer from 'nodemailer';

function cleanEnv(key: string): string | undefined {
  const val = process.env[key]?.trim();
  return val ? val : undefined;
}

function getAppUrl(): string {
  return (
    cleanEnv('NEXTAUTH_URL') ||
    cleanEnv('APP_URL') ||
    'http://localhost:3000'
  );
}

function getEmailFrom(): string {
  const explicitFrom = cleanEnv('EMAIL_FROM') || cleanEnv('SMTP_FROM');
  if (explicitFrom) return explicitFrom;
  const smtpUser = cleanEnv('SMTP_USER');
  if (smtpUser && smtpUser.includes('@')) {
    return `"Margdarshan Mentoring" <${smtpUser}>`;
  }
  return '"Margdarshan Mentoring" <noreply@rdc.in>';
}

function getTransporter() {
  const host = cleanEnv('SMTP_HOST');
  const user = cleanEnv('SMTP_USER');
  const pass = cleanEnv('SMTP_PASS') || cleanEnv('SMTP_PASSWORD');
  const port = parseInt(cleanEnv('SMTP_PORT') || '587', 10);
  const secure =
    cleanEnv('SMTP_SECURE') === 'true' || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

async function deliverMail({
  to,
  subject,
  html,
  label,
}: {
  to: string;
  subject: string;
  html: string;
  label: string;
}): Promise<{ sent: boolean; simulated: boolean; to: string }> {
  const transporter = getTransporter();
  if (transporter) {
    await transporter.sendMail({
      from: getEmailFrom(),
      to,
      subject,
      html,
    });
    return { sent: true, simulated: false, to };
  }
  console.log(`[SMTP SIMULATION] ${label} -> ${to}`);
  return { sent: false, simulated: true, to };
}

/**
 * Send candidate intake invitation email with direct link to onboarding form
 */
export async function sendCandidateInviteEmail({
  to,
  name,
  role,
  employeeCode,
  customAppUrl,
}: {
  to: string;
  name: string;
  role: 'MENTEE' | 'MENTOR';
  employeeCode: string;
  customAppUrl?: string;
}) {
  const baseUrl = customAppUrl || getAppUrl();
  const onboardingUrl = `${baseUrl}/onboarding?emp=${encodeURIComponent(employeeCode)}`;
  const loginUrl = `${baseUrl}/login?emp=${encodeURIComponent(employeeCode)}`;
  const roleLabel = role === 'MENTEE' ? 'Young Engineer (Mentee)' : 'Leader / Manager (Mentor)';

  const subject = `[Margdarshan] You Have Been Added as ${role === 'MENTEE' ? 'a Mentee' : 'a Mentor'} — Login & Complete Your Profile`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="background-color: #0f172a; padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 0.5px;">Margdarshan Mentoring Platform</h2>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">RDC Concrete (India) Limited</p>
      </div>

      <p>Dear <strong>${name}</strong>,</p>

      <p>You have been added to the <strong>Margdarshan 12-Week Mentoring Program</strong> as a <strong>${roleLabel}</strong> (Employee ID: <code>${employeeCode}</code>).</p>

      <div style="background-color: #f8fafc; border-left: 4px solid #0f172a; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #0f172a;">Getting Started:</p>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
          <li>Use the link below to sign in to the Margdarshan portal.</li>
          <li>Review and select your primary <strong>Competency Framework</strong> focus areas and career goals.</li>
          <li>Complete the quick 5-question <strong>DISC Behavioral Reflection</strong>.</li>
        </ol>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${onboardingUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
          Login &amp; Open My Mentoring Profile &rarr;
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b;">
        Direct personalized login link:<br/>
        <a href="${onboardingUrl}" style="color: #2563eb;">${onboardingUrl}</a><br/>
        Standard portal login page: <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a>
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
        Sent automatically by Margdarshan System &bull; noreply@rdc.in
      </p>
    </div>
  `;

  return deliverMail({
    to,
    subject,
    html,
    label: `Candidate Invite Email (${name})`,
  });
}

/**
 * Send pairing proposal email to both parties
 */
export async function sendPairingProposalEmail({
  to,
  name,
  counterpartName,
  counterpartRole,
  matchScore,
  customAppUrl,
}: {
  to: string;
  name: string;
  counterpartName: string;
  counterpartRole: 'MENTEE' | 'MENTOR';
  matchScore: number;
  customAppUrl?: string;
}) {
  const baseUrl = customAppUrl || getAppUrl();
  const dashboardUrl = `${baseUrl}/dashboard`;
  const scorePercent = (matchScore * 100).toFixed(0);

  const subject = `[Margdarshan] Your Mentoring Pairing Proposal is Ready (${counterpartName})`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
      <div style="background-color: #0f172a; padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Margdarshan Mentoring Platform</h2>
      </div>

      <p>Dear <strong>${name}</strong>,</p>

      <p>The AI matching algorithm has computed a compatible pairing proposal for you with <strong>${counterpartName}</strong> (${counterpartRole === 'MENTOR' ? 'Leader / Mentor' : 'Young Engineer / Mentee'}).</p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px; border-radius: 6px; text-align: center; margin: 20px 0;">
        <span style="font-size: 13px; color: #166534; font-weight: bold;">AI Compatibility Match Score</span>
        <h3 style="font-size: 28px; color: #15803d; margin: 4px 0 0 0;">${scorePercent}%</h3>
        <p style="font-size: 11px; color: #166534; margin: 4px 0 0 0;">Based on Competency Cascade Matrix & DISC Behavioral Harmony</p>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${dashboardUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 26px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
          Review & Accept Pairing on Dashboard &rarr;
        </a>
      </div>

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px;">
        Sent automatically by Margdarshan System &bull; noreply@rdc.in
      </p>
    </div>
  `;

  return deliverMail({
    to,
    subject,
    html,
    label: `Pairing Proposal Email (${name} <-> ${counterpartName})`,
  });
}

/**
 * Send automated email to both Mentor and Mentee when a session is scheduled or updated with Google Meet link
 */
export async function sendSessionScheduledEmail({
  to,
  name,
  counterpartName,
  counterpartRole,
  weekNumber,
  scheduledTime,
  googleMeetLink,
  agenda,
  pairId,
  customAppUrl,
}: {
  to: string;
  name: string;
  counterpartName: string;
  counterpartRole: 'MENTEE' | 'MENTOR';
  weekNumber: number;
  scheduledTime: string | null;
  googleMeetLink?: string | null;
  agenda?: string | null;
  pairId: string;
  customAppUrl?: string;
}) {
  const baseUrl = customAppUrl || getAppUrl();
  const workspaceUrl = `${baseUrl}/space/${encodeURIComponent(pairId)}`;

  const formattedTime = scheduledTime
    ? new Date(scheduledTime).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' IST'
    : 'Time to be confirmed';

  const subject = `[Margdarshan] Week ${weekNumber} Mentoring Session Scheduled with ${counterpartName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="background-color: #0f172a; padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Margdarshan Mentoring Platform</h2>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Session Schedule &amp; Video Call Confirmation</p>
      </div>

      <p>Dear <strong>${name}</strong>,</p>

      <p>Your <strong>Week ${weekNumber}</strong> mentoring session with <strong>${counterpartName}</strong> (${counterpartRole === 'MENTOR' ? 'Mentor' : 'Mentee'}) has been scheduled.</p>

      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>Date &amp; Time:</strong></td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${formattedTime}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;"><strong>Agenda / Topic:</strong></td>
            <td style="padding: 6px 0; color: #334155;">${agenda || `Week ${weekNumber} Mentoring Check-in & Review`}</td>
          </tr>
          ${
            googleMeetLink
              ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b;"><strong>Google Meet:</strong></td>
            <td style="padding: 6px 0;">
              <a href="${googleMeetLink}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: underline;">
                Join Google Meet Video Call &rarr;
              </a>
            </td>
          </tr>`
              : ''
          }
        </table>
      </div>

      <div style="text-align: center; margin: 26px 0; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        ${
          googleMeetLink
            ? `
        <a href="${googleMeetLink}" target="_blank" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-right: 8px;">
          📹 Join Google Meet Now
        </a>`
            : ''
        }
        <a href="${workspaceUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
          Open Pair Workspace &rarr;
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
        💡 <em>Preparation tip: Review last week's action commitments and note down 1-2 questions you'd like to reflect on before the call.</em>
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
        Sent automatically by Margdarshan System &bull; noreply@rdc.in
      </p>
    </div>
  `;

  return deliverMail({
    to,
    subject,
    html,
    label: `Session Scheduled Email (${name}, Week ${weekNumber})`,
  });
}

/**
 * Send post-session feedback and summary email to both Mentor and Mentee
 */
export async function sendSessionCompletedFeedbackEmail({
  to,
  name,
  counterpartName,
  counterpartRole,
  weekNumber,
  discussionPoints,
  commitments,
  pairId,
  customAppUrl,
}: {
  to: string;
  name: string;
  counterpartName: string;
  counterpartRole: 'MENTEE' | 'MENTOR';
  weekNumber: number;
  discussionPoints?: string | null;
  commitments?: string | null;
  pairId: string;
  customAppUrl?: string;
}) {
  const baseUrl = customAppUrl || getAppUrl();
  const workspaceUrl = `${baseUrl}/space/${encodeURIComponent(pairId)}`;

  const subject = `[Margdarshan] Week ${weekNumber} Session Completed - Summary & Feedback Request`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="background-color: #0f172a; padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Margdarshan Mentoring Platform</h2>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Session Summary &amp; Growth Feedback</p>
      </div>

      <p>Dear <strong>${name}</strong>,</p>

      <p>Congratulations on completing your <strong>Week ${weekNumber}</strong> mentoring session with <strong>${counterpartName}</strong> (${counterpartRole === 'MENTOR' ? 'Mentor' : 'Mentee'}).</p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px; border-radius: 6px; margin: 16px 0;">
        <span style="font-size: 13px; color: #166534; font-weight: bold;">✅ Session Marked as Completed</span>
        <p style="font-size: 12px; color: #166534; margin: 4px 0 0 0;">Your mentoring progress and journal entries have been recorded.</p>
      </div>

      ${
        discussionPoints
          ? `
      <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #1e3a8a;">Key Discussion Points:</p>
        <p style="margin: 0; font-size: 13px; color: #334155; white-space: pre-wrap;">${discussionPoints}</p>
      </div>`
          : ''
      }

      ${
        commitments
          ? `
      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #92400e;">Commitments &amp; Action Items:</p>
        <p style="margin: 0; font-size: 13px; color: #78350f; white-space: pre-wrap;">${commitments}</p>
      </div>`
          : ''
      }

      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 6px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; color: #0f172a;">Please share your 30-second session reflection:</p>
        <a href="${workspaceUrl}" style="background-color: #0f172a; color: #ffffff; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">
          Submit Weekly Rating &amp; Notes &rarr;
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
        Sent automatically by Margdarshan System &bull; noreply@rdc.in
      </p>
    </div>
  `;

  return deliverMail({
    to,
    subject,
    html,
    label: `Post-Session Feedback Email (${name}, Week ${weekNumber})`,
  });
}

