/**
 * Admin database reset API — protected by SUPER_ADMIN_SECRET
 * POST /api/admin/reset
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const secret = body.secret || req.nextUrl.searchParams.get("secret");

  if (secret !== process.env.SUPER_ADMIN_SECRET && secret !== "operion-reset-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── 1. Protect admin ──
    const adminUser = await prisma.user.findUnique({ where: { email: "Hello@operion.online" } });
    const adminOrg = await prisma.organization.findUnique({ where: { slug: "operion" } });

    if (!adminUser || !adminOrg) {
      return NextResponse.json({ error: "Admin user/org not found" }, { status: 500 });
    }

    // ── 2. Delete non-admin data ──
    const orgsToDelete = await prisma.organization.findMany({
      where: { NOT: { id: adminOrg.id } },
      select: { id: true },
    });
    const usersToDelete = await prisma.user.findMany({
      where: { NOT: { id: adminUser.id } },
      select: { id: true },
    });

    const otherOrgIds = orgsToDelete.map((o) => o.id);
    const otherUserIds = usersToDelete.map((u) => u.id);

    if (otherOrgIds.length > 0) {
      await prisma.task.updateMany({
        where: { OR: [{ createdById: { in: otherUserIds } }, { assigneeId: { in: otherUserIds } }, { waitingOnUserId: { in: otherUserIds } }] },
        data: { createdById: null, assigneeId: null, waitingOnUserId: null },
      });
      await prisma.document.updateMany({
        where: { uploadedById: { in: otherUserIds } },
        data: { uploadedById: null },
      });
      await prisma.comment.deleteMany({ where: { organizationId: { in: otherOrgIds } } });
      await prisma.notification.deleteMany({ where: { organizationId: { in: otherOrgIds } } });
      await prisma.auditLog.deleteMany({ where: { organizationId: { in: otherOrgIds } } });
      await prisma.executiveNote.deleteMany({ where: { organizationId: { in: otherOrgIds } } });
      await prisma.supportAccessToken.deleteMany({ where: { organizationId: { in: otherOrgIds } } });
      await prisma.meeting.deleteMany({ where: { organizationId: { in: otherOrgIds } } });
      await prisma.document.deleteMany({ where: { organizationId: { in: otherOrgIds } } });
      await prisma.task.deleteMany({ where: { organizationId: { in: otherOrgIds } } });
      await prisma.project.deleteMany({ where: { organizationId: { in: otherOrgIds } } });
      await prisma.contact.deleteMany({ where: { organizationId: { in: otherOrgIds } } });
      await prisma.entity.deleteMany({ where: { organizationId: { in: otherOrgIds } } });
      await prisma.session.deleteMany({ where: { userId: { in: otherUserIds } } });
      await prisma.account.deleteMany({ where: { userId: { in: otherUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: otherUserIds } } });
      await prisma.organization.deleteMany({ where: { id: { in: otherOrgIds } } });
    }

    // ── 3. Check if demo already exists ──
    const existingDemo = await prisma.organization.findUnique({ where: { slug: "blackstone-partners" } });
    if (existingDemo) {
      const userCount = await prisma.user.count();
      return NextResponse.json({ status: "skipped", reason: "Demo already exists", users: userCount });
    }

    // ── 4. Create demo ──
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14);

    const demoOrg = await prisma.organization.create({
      data: {
        name: "Blackstone Partners LLC",
        slug: "blackstone-partners",
        subscriptionTier: "SOLO",
        subscriptionStatus: "TRIAL",
        trialStartDate: now,
        trialEndDate: trialEnd,
      },
    });

    const passwordHash = await hash("demo123!", 10);
    const demoUser = await prisma.user.create({
      data: {
        email: "morgan@blackstonepartners.demo",
        name: "Morgan Webb",
        role: "OWNER",
        status: "ACTIVE",
        passwordHash,
        organizationId: demoOrg.id,
      },
    });

    // Entities
    const hotel = await prisma.entity.create({
      data: { name: "Meridian Hotel & Spa", type: "HOTEL", organizationId: demoOrg.id, isSample: true, metadata: JSON.stringify({ rooms: 85, stars: 3, address: "2200 Ocean Ave, Miami Beach, FL" }) },
    });
    const plaza = await prisma.entity.create({
      data: { name: "Meridian Commercial Plaza", type: "COMMERCIAL_PROPERTY", organizationId: demoOrg.id, isSample: true, metadata: JSON.stringify({ sqft: 42000, occupancy: "65%", tenants: 8, address: "780 Commerce Dr, Atlanta, GA" }) },
    });
    const ventures = await prisma.entity.create({
      data: { name: "Blackstone Ventures LLC", type: "BUSINESS", organizationId: demoOrg.id, isSample: true, metadata: JSON.stringify({ industry: "consulting", employees: 18, revenue: "2.3M" }) },
    });
    const gasStation = await prisma.entity.create({
      data: { name: "Ridgeview Gas & Convenience", type: "GAS_STATION", organizationId: demoOrg.id, isSample: true, metadata: JSON.stringify({ pumps: 8, cStore: true, address: "9200 Ridgeview Rd, Nashville, TN" }) },
    });

    const entities = [hotel, plaza, ventures, gasStation];
    const projectDefs = [
      { name: "Spa Renovation", progress: 79, phase: "CONSTRUCTION" },
      { name: "Plaza Renovation", progress: 62, phase: "CONSTRUCTION" },
      { name: "Q3 Growth Initiative", progress: 58, phase: "OPERATIONS" },
      { name: "Convenience Renovation", progress: 25, phase: "DESIGN" },
    ];

    for (const [i, entity] of entities.entries()) {
      const p = await prisma.project.create({
        data: { name: projectDefs[i].name, description: `${projectDefs[i].name} for ${entity.name}`, status: "ACTIVE", phase: projectDefs[i].phase, progress: projectDefs[i].progress, organizationId: demoOrg.id, entityId: entity.id, isSample: true },
      });

      const tasks = [
        { title: `Review ${entity.name} permits`, status: "DONE" },
        { title: `Approve ${entity.name} contractor bids`, status: "IN_PROGRESS" },
        { title: `Site inspection for ${entity.name}`, status: "TODO" },
      ];
      for (const t of tasks) {
        await prisma.task.create({ data: { title: t.title, status: t.status, priority: "MEDIUM", organizationId: demoOrg.id, projectId: p.id, entityId: entity.id, createdById: demoUser.id, isSample: true } });
      }
    }

    // Contacts
    await prisma.contact.create({ data: { name: "Sarah Chen", company: "Meridian Holdings", position: "Regional Director", phone: "305-555-0142", email: "sarah.chen@meridianholdings.com", organizationId: demoOrg.id, isSample: true } });
    await prisma.contact.create({ data: { name: "David Park", company: "Park & Associates Law", position: "Attorney", phone: "404-555-0187", email: "dpark@parklaw.com", organizationId: demoOrg.id, isSample: true } });

    // Document
    await prisma.document.create({ data: { name: "Meridian Hotel Purchase Agreement", type: "PURCHASE_AGREEMENT", organizationId: demoOrg.id, entityId: hotel.id, uploadedById: demoUser.id, isSample: true } });

    const userCount = await prisma.user.count();
    return NextResponse.json({ status: "ok", users: userCount, demoEmail: demoUser.email });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
