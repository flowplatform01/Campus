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
      <h2>Hi ${name},</h2>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
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
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
    `,
    text: `Reset password: ${resetUrl}`,
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
