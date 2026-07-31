/**
 * Database Reset + Demo Account Seed
 *
 * Nukes all users and orgs EXCEPT Hello@operion.online (Operion admin),
 * then creates a fresh "Blackstone Partners LLC" demo account with sample data.
 *
 * Usage:
 *   DATABASE_URL="<url>" npx tsx scripts/reset-db.ts
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL });

async function main() {
  console.log("🔧 Operion DB Reset + Demo Seed\n");

  // ── 1. Identify protected resources ───────────────────────────
  const adminUser = await prisma.user.findUnique({
    where: { email: "Hello@operion.online" },
  });
  const adminOrg = await prisma.organization.findUnique({
    where: { slug: "operion" },
  });

  if (!adminUser || !adminOrg) {
    console.error("❌ Admin user/org not found. Is the database already seeded?");
    process.exit(1);
  }

  console.log(`   Protected: ${adminUser.email} (org: ${adminOrg.name})`);

  // ── 2. Clean up all non-Operion data ──────────────────────────
  const orgsToDelete = await prisma.organization.findMany({
    where: { NOT: { id: adminOrg.id } },
    select: { id: true, name: true },
  });
  const usersToDelete = await prisma.user.findMany({
    where: { NOT: { id: adminUser.id } },
    select: { id: true, email: true },
  });

  console.log(`\n   Deleting ${orgsToDelete.length} orgs, ${usersToDelete.length} users...`);

  const otherOrgIds = orgsToDelete.map((o) => o.id);
  const otherUserIds = usersToDelete.map((u) => u.id);

  if (otherOrgIds.length > 0) {
    // Null out references that would block user deletion
    await prisma.task.updateMany({
      where: { OR: [{ createdById: { in: otherUserIds } }, { assigneeId: { in: otherUserIds } }, { waitingOnUserId: { in: otherUserIds } }] },
      data: { createdById: null, assigneeId: null, waitingOnUserId: null },
    });
    await prisma.document.updateMany({
      where: { uploadedById: { in: otherUserIds } },
      data: { uploadedById: null },
    });

    // Delete dependent data in order
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

  console.log("   ✅ Cleanup complete");

  // ── 3. Check if demo already exists ───────────────────────────
  const existingDemo = await prisma.organization.findUnique({
    where: { slug: "blackstone-partners" },
  });

  if (existingDemo) {
    console.log("\n   ℹ️  Demo org already exists — skipping seed. Delete it first to re-seed.");
    await printSummary();
    await prisma.$disconnect();
    return;
  }

  // ── 4. Create demo account ────────────────────────────────────
  console.log("\n🌱 Creating demo account...");

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
  console.log(`   ✓ Org: ${demoOrg.name}`);

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
  console.log(`   ✓ User: ${demoUser.email}`);

  // ── 5. Create entities ────────────────────────────────────────
  const hotel = await prisma.entity.create({
    data: {
      name: "Meridian Hotel & Spa",
      type: "HOTEL",
      organizationId: demoOrg.id,
      isSample: true,
      metadata: JSON.stringify({ rooms: 85, stars: 3, address: "2200 Ocean Ave, Miami Beach, FL" }),
    },
  });

  const plaza = await prisma.entity.create({
    data: {
      name: "Meridian Commercial Plaza",
      type: "COMMERCIAL_PROPERTY",
      organizationId: demoOrg.id,
      isSample: true,
      metadata: JSON.stringify({ sqft: 42000, occupancy: "65%", tenants: 8, address: "780 Commerce Dr, Atlanta, GA" }),
    },
  });

  const ventures = await prisma.entity.create({
    data: {
      name: "Blackstone Ventures LLC",
      type: "BUSINESS",
      organizationId: demoOrg.id,
      isSample: true,
      metadata: JSON.stringify({ industry: "consulting", employees: 18, revenue: "2.3M" }),
    },
  });

  const gasStation = await prisma.entity.create({
    data: {
      name: "Ridgeview Gas & Convenience",
      type: "GAS_STATION",
      organizationId: demoOrg.id,
      isSample: true,
      metadata: JSON.stringify({ pumps: 8, cStore: true, address: "9200 Ridgeview Rd, Nashville, TN" }),
    },
  });

  const entities = [hotel, plaza, ventures, gasStation];
  console.log(`   ✓ ${entities.length} entities created`);

  // ── 6. Create projects (1 per entity) ─────────────────────────
  const entityProjects: Array<{ entity: typeof entities[0]; project: { id: string; name: string } }> = [];

  for (const [i, entity] of entities.entries()) {
    const projectNames = [
      { name: "Spa Renovation", progress: 79, phase: "CONSTRUCTION" },
      { name: "Plaza Renovation", progress: 62, phase: "CONSTRUCTION" },
      { name: "Q3 Growth Initiative", progress: 58, phase: "OPERATIONS" },
      { name: "Convenience Renovation", progress: 25, phase: "DESIGN" },
    ];

    const p = await prisma.project.create({
      data: {
        name: projectNames[i].name,
        description: `${projectNames[i].name} project for ${entity.name}`,
        status: "ACTIVE",
        phase: projectNames[i].phase,
        progress: projectNames[i].progress,
        organizationId: demoOrg.id,
        entityId: entity.id,
        isSample: true,
      },
    });
    entityProjects.push({ entity, project: { id: p.id, name: p.name } });
  }
  console.log(`   ✓ ${entityProjects.length} projects created`);

  // ── 7. Create tasks (3 per project) ───────────────────────────
  let taskCount = 0;
  for (const { entity, project } of entityProjects) {
    const tasks = [
      { title: `Review ${entity.name} permits`, status: "DONE" },
      { title: `Approve ${entity.name} contractor bids`, status: "IN_PROGRESS" },
      { title: `Site inspection for ${entity.name}`, status: "TODO" },
    ];

    for (const t of tasks) {
      await prisma.task.create({
        data: {
          title: t.title,
          status: t.status,
          priority: "MEDIUM",
          organizationId: demoOrg.id,
          projectId: project.id,
          entityId: entity.id,
          createdById: demoUser.id,
          isSample: true,
        },
      });
      taskCount++;
    }
  }
  console.log(`   ✓ ${taskCount} tasks created`);

  // ── 8. Create contacts ────────────────────────────────────────
  const contacts = [
    { name: "Sarah Chen", company: "Meridian Holdings", position: "Regional Director", phone: "305-555-0142", email: "sarah.chen@meridianholdings.com" },
    { name: "David Park", company: "Park & Associates Law", position: "Attorney", phone: "404-555-0187", email: "dpark@parklaw.com" },
  ];

  for (const c of contacts) {
    await prisma.contact.create({
      data: {
        name: c.name,
        company: c.company,
        position: c.position,
        phone: c.phone,
        email: c.email,
        organizationId: demoOrg.id,
        isSample: true,
      },
    });
  }
  console.log(`   ✓ ${contacts.length} contacts created`);

  // ── 9. Create document ────────────────────────────────────────
  await prisma.document.create({
    data: {
      name: "Meridian Hotel Purchase Agreement",
      type: "PURCHASE_AGREEMENT",
      organizationId: demoOrg.id,
      entityId: hotel.id,
      uploadedById: demoUser.id,
      isSample: true,
    },
  });
  console.log("   ✓ 1 document created\n");

  // ── Summary ───────────────────────────────────────────────────
  await printSummary();
  await prisma.$disconnect();
}

async function printSummary() {
  const userCount = await prisma.user.count();
  const orgCount = await prisma.organization.count();
  const users = await prisma.user.findMany({
    select: { email: true, name: true },
    orderBy: { email: "asc" },
  });
  const orgs = await prisma.organization.findMany({
    select: { name: true, slug: true, subscriptionStatus: true },
  });

  console.log("📊 Final database state:");
  console.log(`   Users: ${userCount}`);
  users.forEach((u) => console.log(`     • ${u.email} (${u.name})`));
  console.log(`   Orgs: ${orgCount}`);
  orgs.forEach((o) => console.log(`     • ${o.name} [${o.slug}] — ${o.subscriptionStatus}`));
  console.log("\n✅ Done.");
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
