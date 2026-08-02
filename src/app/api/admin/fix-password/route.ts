import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const secret = body.secret || req.nextUrl.searchParams.get("secret");
  
  if (secret !== "operion-reset-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const password = body.password || "Admin123!";
  if (password.length < 8) {
    return NextResponse.json({ error: "Password too short" }, { status: 400 });
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.update({
    where: { email: "Hello@operion.online" },
    data: { passwordHash, isSuperAdmin: true, role: "OWNER" },
  });

  return NextResponse.json({ ok: true, email: user.email });
}
