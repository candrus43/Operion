import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: July 30, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Operion (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting your privacy.
              This Privacy Policy explains what information we collect, how we use it, and what rights you have regarding
              your data when you use our Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">We collect the following types of information:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground leading-relaxed">
              <li>
                <strong>Account information:</strong> Your name, email address, and authentication credentials when you
                create an account or sign in via Google or Microsoft.
              </li>
              <li>
                <strong>Organization data:</strong> Information you input into the Service, including entity details,
                tasks, projects, documents, contacts, calendar events, and communications.
              </li>
              <li>
                <strong>Usage data:</strong> Anonymous analytics about how you interact with the Service, such as pages
                visited and features used. This data does not include the content of your organization data.
              </li>
              <li>
                <strong>Payment information:</strong> We do not directly collect or store payment card details. All
                payments are processed securely by Stripe, our third-party payment processor. We receive only payment
                status and transaction metadata.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground leading-relaxed">
              <li>Provide, maintain, and improve the Service</li>
              <li>Generate AI-driven briefings, suggestions, and insights from your organization data</li>
              <li>Authenticate your identity and secure your account</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send service-related communications (e.g., billing notifications, feature updates)</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Data Sharing</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong>We do not sell, rent, or share your personal data or organization data with third parties</strong>{" "}
              for their own marketing or commercial purposes. We may share data only in the following circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground leading-relaxed">
              <li>
                <strong>Service providers:</strong> We use trusted third-party services for infrastructure (hosting),
                payments (Stripe), AI processing (OpenAI), and email delivery. These providers process data solely on our
                behalf and are contractually bound to protect it.
              </li>
              <li>
                <strong>Legal requirements:</strong> We may disclose information if required by law, court order, or
                governmental regulation.
              </li>
              <li>
                <strong>Business transfers:</strong> In the event of a merger, acquisition, or asset sale, your data may
                be transferred as part of the transaction. We will notify you before your data is transferred and becomes
                subject to a different privacy policy.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. AI Data Processing</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Operion uses AI models (including OpenAI) to generate briefings, task suggestions, and insights from your
              organization data. Your data is sent to AI providers solely for the purpose of generating these outputs.
              We have data processing agreements in place with our AI providers. Your data is not used to train or improve
              the AI providers&apos; general-purpose models.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Data Storage and Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your data is stored on secure servers with industry-standard encryption at rest and in transit. We implement
              appropriate technical and organizational measures to protect your data against unauthorized access, alteration,
              disclosure, or destruction. Access to your organization data is restricted to authorized users within your
              organization based on role-based permissions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Data Retention</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active. Upon account deletion, we will delete your
              organization data within 30 days. Certain information may be retained longer as required by law or for
              legitimate business purposes (e.g., payment records for tax purposes).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Your Rights</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground leading-relaxed">
              <li>
                <strong>Access:</strong> View the personal data we hold about you. You can access your organization data
                at any time through the Service dashboard.
              </li>
              <li>
                <strong>Export:</strong> Download your organization data in a structured, machine-readable format
                (JSON). Use the export function available in your account settings.
              </li>
              <li>
                <strong>Correct:</strong> Update or correct inaccurate personal data through your profile settings.
              </li>
              <li>
                <strong>Delete:</strong> Request deletion of your account and associated data. Contact us at the email
                below to initiate deletion.
              </li>
              <li>
                <strong>Opt-out:</strong> Unsubscribe from marketing communications at any time using the unsubscribe
                link in our emails.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Cookies</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management. We do not use third-party tracking
              cookies or advertising cookies. You can configure your browser to reject cookies, but this may prevent
              you from using certain features of the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. Third-Party Integrations</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You may choose to connect third-party services (Google, Microsoft) to the Service. When you do, we access
              only the data and permissions you explicitly authorize. You may revoke these connections at any time through
              your account settings or through the third-party service&apos;s permissions page.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">11. Changes to This Policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes via email or
              through the Service. Continued use of the Service after changes take effect constitutes acceptance of the
              updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">12. Contact Us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or wish to exercise your data rights, contact us at{" "}
              <a href="mailto:hello@operion.ai" className="text-primary hover:underline">
                hello@operion.ai
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
