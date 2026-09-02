import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing & Plans | Operion — AI Operations Software for Multi-Business Owners",
  description:
    "See Operion's plans for multi-business owners: Founder for solo operators and Studio for owners with a team. Transparent monthly pricing with a one-time setup fee.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://www.operion.online/pricing",
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}