import { Resend } from "resend"

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — emails will not be sent")
    return null
  }
  return new Resend(apiKey)
}

// Must be a domain verified in Resend — operion.online is verified (see the
// CRM payment-link route, which already sends from Hello@Operion.Online);
// operion.app is NOT verified and Resend rejects every send from it.
const FROM_ADDRESS = "Operion <Hello@operion.online>"
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
      Your Operion workspace has been created. To start using your AI Chief of Staff, complete your setup — the one-time setup fee is charged today, and monthly billing begins on day 31.
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

export interface TeamInviteParams {
  email: string
  name: string
  orgName: string
  invitedByName: string
  inviteToken?: string
}

export async function sendTeamInviteEmail({
  email,
  name,
  orgName,
  invitedByName,
  inviteToken,
}: TeamInviteParams): Promise<boolean> {
  const acceptUrl = inviteToken
    ? `${BASE_URL}/accept-invite?token=${inviteToken}`
    : `${BASE_URL}/login`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #080808; color: #e4e4e4; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #111111; border-radius: 12px; padding: 40px; border: 1px solid #262626;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px;">You've been invited to ${escapeHtml(orgName)}</h1>
      <p style="color: #a1a1a1; font-size: 16px; margin: 0;">${escapeHtml(invitedByName)} invited you to join their Operion workspace</p>
    </div>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.6;">
      Hi ${escapeHtml(name)},
    </p>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.6;">
      You've been added as a team member in <strong style="color: #ffffff;">${escapeHtml(orgName)}</strong> on Operion. Click below to accept the invitation and set up your account.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${acceptUrl}" style="display: inline-block; background: #ffffff; color: #111111; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">Accept Invitation</a>
    </div>
    <p style="color: #737373; font-size: 13px; line-height: 1.5; text-align: center;">
      This invitation was sent to ${escapeHtml(email)}. If you weren't expecting this, you can safely ignore it.
    </p>
  </div>
</body>
</html>`.trim()

  return sendEmail({ to: email, subject: `${invitedByName} invited you to ${orgName} on Operion`, html })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export interface CompleteSetupEmailParams {
  email: string
  plan: string
  checkoutUrl: string
}

/**
 * Sent after the one-time setup fee (Session A) is paid, when the customer
 * abandoned the flow before completing the subscription (Session B). Carries
 * the Session B checkout link so the purchase still completes.
 */
export async function sendCompleteSetupEmail({
  email,
  plan,
  checkoutUrl,
}: CompleteSetupEmailParams): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #080808; color: #e4e4e4; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #111111; border-radius: 12px; padding: 40px; border: 1px solid #262626;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px;">You're one step away</h1>
      <p style="color: #a1a1a1; font-size: 16px; margin: 0;">Finish your ${escapeHtml(plan)} setup</p>
    </div>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.6;">
      Your one-time setup fee was received. Complete your subscription to activate your workspace — your 30-day trial starts today and monthly billing begins on day 31.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${checkoutUrl}" style="display: inline-block; background: #ffffff; color: #111111; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">Complete your subscription</a>
    </div>
    <p style="color: #737373; font-size: 13px; line-height: 1.5; text-align: center;">
      If you have any questions, just reply to this email.
    </p>
  </div>
</body>
</html>`.trim()

  return sendEmail({
    to: email,
    subject: "Operion — Complete your subscription",
    html,
  })
}

export interface OwnerSetupEmailParams {
  email: string
  name: string
  orgName: string
  inviteToken: string
}

/**
 * Sent by the Stripe checkout webhook when it provisions a brand-new org +
 * owner for a CRM-sold customer (no password yet). Carries a one-time
 * /accept-invite link so the customer can set their password and sign in.
 * Copy is truthful about what the customer just paid for: the setup fee was
 * received, the 30-day trial runs from today, and monthly billing begins on
 * day 31.
 */
export async function sendOwnerSetupEmail({
  email,
  name,
  orgName,
  inviteToken,
}: OwnerSetupEmailParams): Promise<boolean> {
  const acceptUrl = `${BASE_URL}/accept-invite?token=${inviteToken}`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #080808; color: #e4e4e4; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #111111; border-radius: 12px; padding: 40px; border: 1px solid #262626;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px;">Welcome to Operion</h1>
      <p style="color: #a1a1a1; font-size: 16px; margin: 0;">Your workspace is ready — set your password to sign in</p>
    </div>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.6;">
      Hi ${escapeHtml(name)},
    </p>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.6;">
      Your <strong style="color: #ffffff;">${escapeHtml(orgName)}</strong> workspace on Operion is ready. Thank you for your setup payment — your 30-day trial runs from today, and monthly billing begins on day 31.
    </p>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.6;">
      Set your password to log in and start managing your portfolio with AI-powered insights.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${acceptUrl}" style="display: inline-block; background: #ffffff; color: #111111; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">Set your password</a>
    </div>
    <p style="color: #737373; font-size: 13px; line-height: 1.5; text-align: center;">
      This link was sent to ${escapeHtml(email)}. If you weren't expecting this, you can safely ignore it.
    </p>
  </div>
</body>
</html>`.trim()

  return sendEmail({
    to: email,
    subject: "Welcome to Operion — set your password",
    html,
  })
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
