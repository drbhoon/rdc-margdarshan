import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const EMAIL_FROM = process.env.EMAIL_FROM || '"Margdarshan Mentoring" <noreply@rdc.in>';
const APP_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
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
  const baseUrl = customAppUrl || APP_URL;
  const onboardingUrl = `${baseUrl}/onboarding`;
  const roleLabel = role === 'MENTEE' ? 'Young Engineer (Mentee)' : 'Leader / Manager (Mentor)';

  const subject = `[Margdarshan] Invitation to Join the 3-Month Mentoring Program - Action Required`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
      <div style="background-color: #0f172a; padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 0.5px;">Margdarshan Mentoring Platform</h2>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Corporate Engineering Development</p>
      </div>

      <p>Dear <strong>${name}</strong>,</p>

      <p>You have been nominated to participate in the upcoming <strong>3-Month Mentoring Program</strong> as a <strong>${roleLabel}</strong> (Employee ID: <code>${employeeCode}</code>).</p>

      <div style="background-color: #f8fafc; border-left: 4px solid #0f172a; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #0f172a;">Next Steps:</p>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
          <li>Review and select your primary <strong>Competency Framework</strong> focus areas.</li>
          <li>Choose personal growth & real-world plant mastery challenges.</li>
          <li>Complete the quick 4-question <strong>DISC Behavioral Assessment</strong>.</li>
        </ol>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${onboardingUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
          Complete Your Mentoring Profile &rarr;
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b;">If the button above does not work, copy and paste this link into your browser:<br/>
        <a href="${onboardingUrl}" style="color: #2563eb;">${onboardingUrl}</a>
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
        Sent automatically by Margdarshan System &bull; noreply@rdc.in
      </p>
    </div>
  `;

  const transporter = getTransporter();
  if (transporter) {
    return transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
  } else {
    console.log(`[SMTP SIMULATION] Sent Candidate Invite Email to ${to} (${name}) with link: ${onboardingUrl}`);
    return { simulated: true, to, name };
  }
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
  const baseUrl = customAppUrl || APP_URL;
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

  const transporter = getTransporter();
  if (transporter) {
    return transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
  } else {
    console.log(`[SMTP SIMULATION] Sent Pairing Proposal Email to ${to} (${name}) paired with ${counterpartName}`);
    return { simulated: true, to, name };
  }
}
