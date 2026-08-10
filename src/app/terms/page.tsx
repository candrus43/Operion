import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#08080a]">
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
            <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: July 30, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing or using Operion (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service.
              If you do not agree to all the terms, you may not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Operion is an AI-powered executive operating system that helps entrepreneurs manage multiple business entities,
              tasks, projects, documents, and contacts in a unified dashboard. The Service includes AI-driven briefings,
              task suggestions, cross-entity search, and team collaboration features.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. User Accounts</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities
              that occur under your account. You must provide accurate and complete information when creating an account.
              You must be at least 18 years old to use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. User Responsibilities</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground leading-relaxed">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Upload or transmit any malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to other users&apos; data or accounts</li>
              <li>Use the Service to send unsolicited communications or spam</li>
              <li>Reverse engineer, decompile, or extract the source code of the Service</li>
              <li>Resell, redistribute, or sublicense the Service without explicit written permission</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Payment Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Service offers subscription plans as described on our{" "}
              <Link href="/pricing" className="text-primary hover:underline">
                Pricing page
              </Link>
              . Fees are billed on a recurring monthly basis unless otherwise stated. Setup fees are non-refundable.
              You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period.
              All payments are processed securely through Stripe.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Free Trial</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              New users may be eligible for a 14-day free trial. No credit card is required to start a trial.
              At the end of the trial period, you must subscribe to a paid plan to continue using the Service.
              Operion reserves the right to modify or discontinue the free trial offer at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Intellectual Property</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are owned by Operion and are protected
              by international copyright, trademark, and other intellectual property laws. You retain ownership of all
              data and content you upload to the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. Operion makes no
              warranties, express or implied, regarding the Service&apos;s availability, accuracy, or fitness for a
              particular purpose. In no event shall Operion be liable for any indirect, incidental, special, or
              consequential damages arising out of or in connection with your use of the Service. Our total liability,
              whether in contract, tort, or otherwise, is limited to the amount you paid us in the 12 months preceding
              the claim.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Termination</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violation of these Terms or for
              any other reason at our sole discretion. Upon termination, you will lose access to your account and data.
              We will make reasonable efforts to allow you to export your data prior to termination where feasible.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. Changes to Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of material changes via email
              or through the Service. Continued use of the Service after changes take effect constitutes acceptance of
              the updated Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">11. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have questions about these Terms, contact us at{" "}
              <a href="mailto:Hello@Operion.Online" className="text-primary hover:underline">
                Hello@Operion.Online
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
