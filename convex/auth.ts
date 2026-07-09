import { convexAuth } from "@convex-dev/auth/server";
import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";

const EMAIL_TOKEN_MAX_AGE_SECONDS = 10 * 60;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

async function sendResendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("AUTH_RESEND_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: requireEnv("AUTH_EMAIL_FROM"),
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend error: ${JSON.stringify(await res.json())}`);
  }
}

function generateNumericCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 1_000_000).padStart(6, "0");
}

function generateResetToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const emailVerificationProvider = Email({
  id: "email-verification",
  name: "Tekyida Email Verification",
  from: process.env.AUTH_EMAIL_FROM,
  maxAge: EMAIL_TOKEN_MAX_AGE_SECONDS,
  generateVerificationToken: async () => generateNumericCode(),
  sendVerificationRequest: async ({ identifier, token }) => {
    await sendResendEmail({
      to: identifier,
      subject: "Your Tekyida verification code",
      text: `Your Tekyida verification code is ${token}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <h1 style="font-size: 20px;">Verify your Tekyida email</h1>
          <p>Use this code to finish signing in:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${token}</p>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });
  },
});

const passwordResetProvider = Email({
  id: "password-reset",
  name: "Tekyida Password Reset",
  from: process.env.AUTH_EMAIL_FROM,
  maxAge: EMAIL_TOKEN_MAX_AGE_SECONDS,
  generateVerificationToken: async () => generateResetToken(),
  sendVerificationRequest: async ({ identifier, token, url }) => {
    const resetUrl = new URL("/reset-password", url);
    resetUrl.searchParams.set("token", token);
    resetUrl.searchParams.set("email", identifier);

    await sendResendEmail({
      to: identifier,
      subject: "Reset your Tekyida password",
      text: `Reset your Tekyida password using this link: ${resetUrl.toString()}\n\nThis link expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <h1 style="font-size: 20px;">Reset your Tekyida password</h1>
          <p>Use the button below to choose a new password. This link expires in 10 minutes.</p>
          <p>
            <a href="${resetUrl.toString()}" style="display: inline-block; background: #1f2937; color: #ffffff; padding: 12px 18px; border-radius: 999px; text-decoration: none; font-weight: 700;">
              Reset password
            </a>
          </p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      verify: emailVerificationProvider,
      reset: passwordResetProvider,
      profile: (params) => ({
        email: params.email as string,
        ...(typeof params.name === "string" && params.name.trim()
          ? { name: params.name.trim() }
          : {}),
      }),
    }),
  ],
  session: {
    totalDurationMs: 1000 * 60 * 60 * 24 * 365,
    inactiveDurationMs: 1000 * 60 * 60 * 24 * 90,
  },
  jwt: {
    durationMs: 1000 * 60 * 60 * 24,
  },
});
