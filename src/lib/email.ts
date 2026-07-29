/**
 * Email utility for Operion.
 *
 * Currently logs to console with [EMAIL] prefix.
 * To connect a real provider (Resend, SendGrid, etc.), replace the body
 * of sendEmail() — the rest of the app calls this one function.
 */

interface SendEmailParams {
  to: string
  subject: string
  body: string
}

export async function sendEmail({ to, subject, body }: SendEmailParams) {
  console.log("[EMAIL] ========================================")
  console.log(`[EMAIL] To:      ${to}`)
  console.log(`[EMAIL] Subject: ${subject}`)
  console.log(`[EMAIL] Body:    ${body}`)
  console.log("[EMAIL] ========================================")

  // TODO: replace with real email provider
  // e.g. await resend.emails.send({ from, to, subject, html: body })
}

export async function sendWelcomeEmail(to: string, name: string) {
  const subject = "Welcome to Operion — your AI Chief of Staff"
  const body = [
    `Hi ${name},`,
    "",
    "Welcome to Operion! Your 14-day free trial is now active.",
    "",
    "Operion is your AI Chief of Staff — one place to see everything",
    "across your companies, properties, and investments, with AI that",
    "tells you what needs attention before you ask.",
    "",
    "Get started: https://operion.ctonew.app/login",
    "",
    "Need help? Just reply to this email.",
    "",
    "— The Operion Team",
  ].join("\n")

  await sendEmail({ to, subject, body })
}
