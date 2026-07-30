import { Resend } from "resend"

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — emails will not be sent")
    return null
  }
  return new Resend(apiKey)
}

const FROM_ADDRESS = "Operion <noreply@operion.app>"
const BASE_URL = process.env.NEXTAUTH_URL || "https://operion.ctonew.app"

export interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const resend = getResendClient()
  if (!resend) {
    console.warn(`[email] Skipped email to "${to}" — RESEND_API_KEY not configured`)
    return false
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    })

    if (error) {
      console.error(`[email] Failed to send to "${to}":`, error.message)
      return false
    }

    console.log(`[email] Sent "${subject}" to ${to}`)
    return true
  } catch (err) {
    console.error(`[email] Exception sending to "${to}":`, err)
    return false
  }
}

export async function sendWelcomeEmail(user: { email: string; name: string }): Promise<boolean> {
  const loginUrl = `${BASE_URL}/login`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #080808; color: #e4e4e4; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #111111; border-radius: 12px; padding: 40px; border: 1px solid #262626;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px;">Welcome to Operion</h1>
      <p style="color: #a1a1a1; font-size: 16px; margin: 0;">Your AI Chief of Staff is ready</p>
    </div>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.6;">
      Hi ${user.name},
    </p>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.6;">
      Your Operion workspace has been created. You can now log in and start managing your portfolio with AI-powered insights.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: #ffffff; color: #111111; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">Log in to Operion</a>
    </div>
    <p style="color: #737373; font-size: 13px; line-height: 1.5; text-align: center;">
      If you have any questions, just reply to this email.
    </p>
  </div>
</body>
</html>`.trim()

  return sendEmail({ to: user.email, subject: "Welcome to Operion", html })
}

export async function sendPasswordResetEmail(
  user: { email: string; name: string },
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #080808; color: #e4e4e4; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #111111; border-radius: 12px; padding: 40px; border: 1px solid #262626;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px;">Reset your password</h1>
      <p style="color: #a1a1a1; font-size: 16px; margin: 0;">A password reset was requested for your account</p>
    </div>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.6;">
      Hi ${user.name},
    </p>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.6;">
      Click the button below to reset your password. This link expires in 1 hour.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: #ffffff; color: #111111; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">Reset password</a>
    </div>
    <p style="color: #737373; font-size: 13px; line-height: 1.5; text-align: center;">
      If you didn't request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`.trim()

  return sendEmail({ to: user.email, subject: "Reset your Operion password", html })
}
