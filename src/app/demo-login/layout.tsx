import { redirect } from "next/navigation";

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
