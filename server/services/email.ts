import nodemailer from "nodemailer";
import { config } from "../config.js";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    if (!config.smtp.user || !config.smtp.pass) {
      console.warn("[Email] SMTP not configured - emails will be logged only");
      return null;
    }
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  const transport = getTransporter();
  const mailOptions = {
    from: config.smtp.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };
  if (!transport) {
    console.log("[Email] Would send:", mailOptions);
    return;
  }
  try {
    await transport.sendMail(mailOptions);
  } catch (err) {
    console.error("[Email] Send failed:", err);
    throw err;
  }
}

export async function sendVerificationEmail(email: string, token: string, name: string) {
  const verifyUrl = `${config.clientUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your Campus account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <div style="display:flex; align-items:center; gap:12px; padding:16px 0; border-bottom:1px solid #e5e7eb;">
          <img src="${config.clientUrl}/brand-icon.svg" alt="Campus" width="40" height="40" style="border-radius:12px;" />
          <div>
            <div style="font-size:18px; font-weight:700; color:#0b1220;">Campus</div>
            <div style="font-size:12px; color:#64748b;">Education Platform</div>
          </div>
        </div>

        <h2 style="margin:18px 0 8px;">Hi ${name},</h2>
        <p style="margin:0 0 12px; color:#334155;">Please verify your email by clicking the link below:</p>
        <p style="margin:0 0 12px;"><a href="${verifyUrl}">Verify Email</a></p>
        <p style="margin:0; color:#64748b; font-size:12px;">This link expires in 24 hours.</p>
      </div>
    `,
    text: `Verify your email: ${verifyUrl}`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${config.clientUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your Campus password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <div style="display:flex; align-items:center; gap:12px; padding:16px 0; border-bottom:1px solid #e5e7eb;">
          <img src="${config.clientUrl}/brand-icon.svg" alt="Campus" width="40" height="40" style="border-radius:12px;" />
          <div>
            <div style="font-size:18px; font-weight:700; color:#0b1220;">Campus</div>
            <div style="font-size:12px; color:#64748b;">Education Platform</div>
          </div>
        </div>

        <h2 style="margin:18px 0 8px;">Password Reset Request</h2>
        <p style="margin:0 0 12px; color:#334155;">Use either option below to reset your password:</p>
        <p style="margin:0 0 12px;"><a href="${resetUrl}">Reset Password</a></p>
        <p style="margin:0 0 12px; color:#0b1220;"><strong>Reset code:</strong> ${token}</p>
        <p style="margin:0; color:#64748b; font-size:12px;">This link expires in 1 hour.</p>
      </div>
    `,
    text: `Reset password link: ${resetUrl}\nReset code: ${token}`,
  });
}

export async function sendSchoolInvitation(
  email: string,
  schoolName: string,
  inviterName: string,
  token: string
) {
  const inviteUrl = `${config.clientUrl}/accept-invite?token=${token}`;
  await sendEmail({
    to: email,
    subject: `You're invited to join ${schoolName} on Campus`,
    html: `
      <h2>You're invited!</h2>
      <p>${inviterName} has invited you to join <strong>${schoolName}</strong> on Campus.</p>
      <p><a href="${inviteUrl}">Accept Invitation</a></p>
    `,
    text: `Accept invitation: ${inviteUrl}`,
  });
}
