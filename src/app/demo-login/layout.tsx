import type { Metadata } from "next"
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Demo Login | Operion — AI Operations Software for Multi-Business Owners",
  robots: {
    index: false,
    follow: false,
  },
}

export default function DemoLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.ENABLE_DEMO !== "true") {
    redirect("/login");
  }

  return <>{children}</>;
}