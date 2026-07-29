interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail({ to, subject, body }: SendEmailParams) {
  try {
    // Dynamic import — won't fail at module load if resend isn't installed or key is missing
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("[EMAIL] RESEND_API_KEY not set — skipping send");
      return;
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "Operion <hello@operion.online>",
      to: [to],
      subject,
      text: body,
    });

    if (error) {
      console.error("[EMAIL] Resend error:", error);
      return;
    }

    console.log("[EMAIL] Sent:", data?.id);
  } catch (err) {
    console.error("[EMAIL] Failed to send:", err);
    // Never throw — email failure should not break the caller
  }
}

export async function sendWelcomeEmail(to: string, name: string) {
  const subject = "Welcome to Operion — your AI Chief of Staff";
  const body = [
    `Hi ${name},`,
    "",
    "Welcome to Operion! Your 14-day free trial is now active.",
    "",
    "Operion is your AI Chief of Staff — one place to see everything",
    "across your companies, properties, and investments, with AI that",
    "tells you what needs attention before you ask.",
    "",
    "Get started: https://operion.online/login",
    "",
    "Need help? Just reply to this email.",
    "",
    "— The Operion Team",
  ].join("\n");

  await sendEmail({ to, subject, body });
}
