import { NextResponse } from "next/server";

export async function GET() {
  // Only expose auth config in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Raw env values (with their exact characters, including any quotes)
  const envVars = {
    AUTH_GOOGLE_ID: {
      raw: JSON.stringify(process.env.AUTH_GOOGLE_ID),
      length: process.env.AUTH_GOOGLE_ID?.length ?? 0,
      firstChars: process.env.AUTH_GOOGLE_ID?.substring(0, 15) ?? null,
      startsWithQuote: process.env.AUTH_GOOGLE_ID?.startsWith('"') ?? false,
    },
    AUTH_GOOGLE_SECRET: {
      raw: JSON.stringify(process.env.AUTH_GOOGLE_SECRET),
      length: process.env.AUTH_GOOGLE_SECRET?.length ?? 0,
      firstChars: process.env.AUTH_GOOGLE_SECRET?.substring(0, 10) ?? null,
      startsWithQuote: process.env.AUTH_GOOGLE_SECRET?.startsWith('"') ?? false,
    },
    GOOGLE_CLIENT_ID: {
      raw: JSON.stringify(process.env.GOOGLE_CLIENT_ID),
      length: process.env.GOOGLE_CLIENT_ID?.length ?? 0,
      firstChars: process.env.GOOGLE_CLIENT_ID?.substring(0, 15) ?? null,
      startsWithQuote: process.env.GOOGLE_CLIENT_ID?.startsWith('"') ?? false,
    },
    GOOGLE_CLIENT_SECRET: {
      raw: JSON.stringify(process.env.GOOGLE_CLIENT_SECRET),
      length: process.env.GOOGLE_CLIENT_SECRET?.length ?? 0,
      firstChars: process.env.GOOGLE_CLIENT_SECRET?.substring(0, 10) ?? null,
      startsWithQuote: process.env.GOOGLE_CLIENT_SECRET?.startsWith('"') ?? false,
    },
    NEXTAUTH_URL: {
      raw: JSON.stringify(process.env.NEXTAUTH_URL),
      length: process.env.NEXTAUTH_URL?.length ?? 0,
    },
    NEXTAUTH_SECRET: {
      raw: JSON.stringify(process.env.NEXTAUTH_SECRET),
      length: process.env.NEXTAUTH_SECRET?.length ?? 0,
      startsWithQuote: process.env.NEXTAUTH_SECRET?.startsWith('"') ?? false,
    },
    AUTH_SECRET: {
      raw: JSON.stringify(process.env.AUTH_SECRET),
      length: process.env.AUTH_SECRET?.length ?? 0,
    },
    AUTH_URL: {
      raw: JSON.stringify(process.env.AUTH_URL),
      length: process.env.AUTH_URL?.length ?? 0,
    },
  };

  // Use the same resolution logic as setEnvDefaults
  const resolvedSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const resolvedUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;

  // Simulate what GoogleProvider({}) would produce
  const googleProviderId = "google";
  const envId = process.env[`AUTH_${googleProviderId.toUpperCase()}_ID`];
  const envSecret = process.env[`AUTH_${googleProviderId.toUpperCase()}_SECRET`];

  // Check if the resolved values would be valid
  const issues: string[] = [];
  if (!envId) {
    issues.push("AUTH_GOOGLE_ID is not set in process.env");
  } else if (envId.startsWith('"') && envId.endsWith('"')) {
    issues.push("AUTH_GOOGLE_ID has surrounding quotes — likely a .env quoting issue");
  }
  if (!envSecret) {
    issues.push("AUTH_GOOGLE_SECRET is not set in process.env");
  } else if (envSecret.startsWith('"') && envSecret.endsWith('"')) {
    issues.push("AUTH_GOOGLE_SECRET has surrounding quotes — likely a .env quoting issue");
  }
  if (!resolvedSecret) {
    issues.push("Neither AUTH_SECRET nor NEXTAUTH_SECRET is set");
  }
  if (resolvedSecret?.startsWith('"') && resolvedSecret?.endsWith('"')) {
    issues.push("NEXTAUTH_SECRET has surrounding quotes");
  }

  return NextResponse.json({
    envVars,
    resolved: {
      secret: resolvedSecret ? `${resolvedSecret.substring(0, 10)}... (len=${resolvedSecret.length})` : null,
      url: resolvedUrl,
    },
    googleProviderResolved: {
      AUTH_GOOGLE_ID: envId,
      AUTH_GOOGLE_SECRET: envSecret ? `${envSecret.substring(0, 10)}...` : null,
    },
    issues,
    allAuthEnvKeys: Object.keys(process.env).filter(k => k.startsWith("AUTH_") || k.startsWith("NEXTAUTH") || k.startsWith("GOOGLE")),
  });
}
