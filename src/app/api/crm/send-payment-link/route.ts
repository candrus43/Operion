import { NextResponse } from "next/server"
import { Resend } from "resend"

const PLAN_DETAILS = {
  Founder: "$249/mo + $2,500 one-time setup",
  Studio: "$499/mo + $5,000 one-time setup",
} as const

const RESEND_FROM = "Operion <Hello@Operion.Online>"
const IS_DEVELOPMENT = process.env.NODE_ENV !== "production"

type Plan = keyof typeof PAYMENT_LINKS

type ResendError = {
  name?: string
  message?: string
  [key: string]: unknown
}

function errorDetails(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }
  if (error && typeof error === "object") {
    const resendError = error as ResendError
    if (resendError.name || resendError.message) {
      return `${resendError.name || "ResendError"}: ${resendError.message || "Unknown Resend error"}`
    }
    return JSON.stringify(error)
  }
  return String(error)
}

function failureResponse(error: unknown) {
  const response: { error: string; details?: string } = {
    error: "Failed to send payment link email",
  }
  if (IS_DEVELOPMENT) {
    response.details = errorDetails(error)
  }
  return NextResponse.json(response, { status: 502 })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export async function POST(request: Request) {
  const apiKey = process.env.CRM_API_KEY
  if (!apiKey || request.headers.get("x-api-key") !== apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 })
  }

  const { customerEmail, customerName, plan } = body as Record<string, unknown>
  if (typeof customerEmail !== "string" || !customerEmail.trim()) {
    return NextResponse.json({ error: "customerEmail is required" }, { status: 400 })
  }
  if (typeof customerName !== "string" || !customerName.trim()) {
    return NextResponse.json({ error: "customerName is required" }, { status: 400 })
  }
  if (plan !== "Founder" && plan !== "Studio") {
    return NextResponse.json({ error: "plan must be Founder or Studio" }, { status: 400 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error("RESEND_API_KEY is not configured")
    return NextResponse.json({ error: "Email service is not configured" }, { status: 500 })
  }

  const selectedPlan = plan as Plan
  const name = escapeHtml(customerName.trim())
  let paymentLink: string
  try {
    const checkoutResponse = await fetch(new URL("/api/checkout", request.url), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan: selectedPlan, customerEmail: customerEmail.trim() }),
    })
    const checkoutResult = (await checkoutResponse.json()) as { url?: string; error?: string }
    if (!checkoutResponse.ok || !checkoutResult.url) {
      console.error("Checkout session creation failed:", checkoutResult)
      return failureResponse(new Error(checkoutResult.error || "Unable to create checkout session"))
    }
    paymentLink = checkoutResult.url
  } catch (error) {
    console.error("Checkout endpoint request failed:", error)
    return failureResponse(error)
  }
  const details = PLAN_DETAILS[selectedPlan]
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f5f5f5;color:#171717;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;padding:40px;">
    <h1 style="margin:0 0 24px;color:#111;font-size:26px;">Welcome to Operion</h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi ${name},</p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Congratulations on choosing Operion <strong>${selectedPlan}</strong>. We’re excited to help you run your business with greater clarity and leverage.</p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Your plan: <strong>${selectedPlan}</strong> (${details}).</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${paymentLink}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:7px;font-weight:600;">Complete your payment</a>
    </div>
    <p style="font-size:14px;line-height:1.6;color:#525252;margin:0 0 12px;">Your one-time setup fee is charged today. Monthly billing begins on day 31.</p>
    <p style="font-size:16px;line-height:1.6;margin:24px 0 0;">Best,<br><strong>The Operion Team</strong></p>
  </div>
</body>
</html>`

  try {
    const { error } = await new Resend(resendApiKey).emails.send({
      from: RESEND_FROM,
      to: customerEmail.trim(),
      subject: "Welcome to Operion — Complete Your Setup",
      html,
    })

    if (error) {
      // Keep the complete upstream error in server logs; Resend errors include
      // useful domain verification and API-key diagnostics.
      console.error("Resend payment link email error (full):", error)
      return failureResponse(error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Resend payment link email exception (full):", error)
    return failureResponse(error)
  }
}
