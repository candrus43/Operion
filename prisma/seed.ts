import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Clean existing data
  await prisma.comment.deleteMany()
  await prisma.meeting.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.document.deleteMany()
  await prisma.task.deleteMany()
  await prisma.project.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.entity.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  // ── Organization ──────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: "Movement",
      slug: "movement",
      subscriptionTier: "ENTERPRISE",
      subscriptionStatus: "ACTIVE",
    },
  })
  console.log(`  ✓ Organization: ${org.name}`)

  // ── Users ─────────────────────────────────────────────────────
  const passwordHash = await hash("password123", 10)

  const navid = await prisma.user.create({
    data: {
      email: "navid@movement.com",
      name: "Navid",
      role: "OWNER",
      passwordHash,
      organizationId: org.id,
    },
  })

  const sarah = await prisma.user.create({
    data: {
      email: "victoria@movement.com",
      name: "Victoria Bishop",
      role: "EXECUTIVE_ASSISTANT",
      passwordHash,
      organizationId: org.id,
    },
  })

  const mike = await prisma.user.create({
    data: {
      email: "mike@movement.com",
      name: "Mike Torres",
      role: "OPERATIONS_MANAGER",
      passwordHash,
      organizationId: org.id,
    },
  })
  console.log("  ✓ 3 users created")

  // ── Entities ──────────────────────────────────────────────────
  const hospitality = await prisma.entity.create({
    data: {
      name: "Movement Hospitality Group",
      type: "BUSINESS",
      organizationId: org.id,
      metadata: JSON.stringify({ industry: "hospitality", employees: 120 }),
    },
  })

  const investments = await prisma.entity.create({
    data: {
      name: "Movement Investments LLC",
      type: "BUSINESS",
      organizationId: org.id,
      metadata: JSON.stringify({ aum: "45M", strategy: "value" }),
    },
  })

  const grandHotel = await prisma.entity.create({
    data: {
      name: "The Grand Hotel",
      type: "HOTEL",
      organizationId: org.id,
      metadata: JSON.stringify({ rooms: 210, stars: 4, address: "1200 Harbor Blvd, San Diego, CA" }),
    },
  })

  const fuelStop = await prisma.entity.create({
    data: {
      name: "Route 66 Fuel Stop",
      type: "GAS_STATION",
      organizationId: org.id,
      metadata: JSON.stringify({ pumps: 12, cStore: true, address: "8900 Route 66, Flagstaff, AZ" }),
    },
  })

  const oakwood = await prisma.entity.create({
    data: {
      name: "Oakwood Commercial Plaza",
      type: "COMMERCIAL_PROPERTY",
      organizationId: org.id,
      metadata: JSON.stringify({ sqft: 85000, occupancy: "72%", tenants: 14, address: "450 Oakwood Dr, Austin, TX" }),
    },
  })
  console.log("  ✓ 5 entities created")

  // ── Projects ──────────────────────────────────────────────────
  const p1 = await prisma.project.create({
    data: {
      name: "Grand Hotel Renovation",
      description: "Full renovation of the Grand Hotel including lobby, 120 guest rooms, and pool area. Phase 1 of 3-year capital improvement plan.",
      status: "ACTIVE",
      phase: "CONSTRUCTION",
      progress: 35,
      budget: 2500000,
      startDate: new Date("2026-03-01"),
      targetDate: new Date("2027-01-15"),
      organizationId: org.id,
      entityId: grandHotel.id,
    },
  })

  const p2 = await prisma.project.create({
    data: {
      name: "Grand Hotel Acquisition",
      description: "Acquisition of The Grand Hotel property from previous owners. Deal closed Q1 2026.",
      status: "COMPLETED",
      phase: "CLOSEOUT",
      progress: 100,
      budget: 18500000,
      startDate: new Date("2025-09-01"),
      targetDate: new Date("2026-02-28"),
      organizationId: org.id,
      entityId: grandHotel.id,
    },
  })

  const p3 = await prisma.project.create({
    data: {
      name: "Route 66 Acquisition",
      description: "Acquisition of Route 66 Fuel Stop — currently in due diligence with lender and environmental review.",
      status: "ACTIVE",
      phase: "DUE_DILIGENCE",
      progress: 20,
      budget: 3200000,
      startDate: new Date("2026-05-15"),
      targetDate: new Date("2026-10-01"),
      organizationId: org.id,
      entityId: fuelStop.id,
    },
  })

  const p4 = await prisma.project.create({
    data: {
      name: "Route 66 Rebranding",
      description: "Rebranding the fuel stop under the Movement banner with new signage, uniforms, and marketing collateral.",
      status: "ON_HOLD",
      phase: "DESIGN",
      progress: 10,
      budget: 85000,
      startDate: new Date("2026-06-01"),
      targetDate: new Date("2026-11-01"),
      organizationId: org.id,
      entityId: fuelStop.id,
    },
  })

  const p5 = await prisma.project.create({
    data: {
      name: "Oakwood Plaza Lease-Up",
      description: "Campaign to lease remaining 28% vacancy at Oakwood Commercial Plaza. Target: 92% occupancy by Q4.",
      status: "ACTIVE",
      phase: "OPERATIONS",
      progress: 55,
      budget: 180000,
      startDate: new Date("2026-01-01"),
      targetDate: new Date("2026-12-31"),
      organizationId: org.id,
      entityId: oakwood.id,
    },
  })

  const p6 = await prisma.project.create({
    data: {
      name: "Oakwood HVAC Replacement",
      description: "Replace aging HVAC systems across the plaza. Currently in permitting phase with City of Austin.",
      status: "ACTIVE",
      phase: "PERMITTING",
      progress: 15,
      budget: 620000,
      startDate: new Date("2026-06-01"),
      targetDate: new Date("2026-12-15"),
      organizationId: org.id,
      entityId: oakwood.id,
    },
  })

  const p7 = await prisma.project.create({
    data: {
      name: "Movement Kitchen Upgrade",
      description: "Commercial kitchen equipment overhaul across Movement Hospitality Group properties.",
      status: "ACTIVE",
      phase: "CONSTRUCTION",
      progress: 50,
      budget: 450000,
      startDate: new Date("2026-04-01"),
      targetDate: new Date("2026-09-30"),
      organizationId: org.id,
      entityId: hospitality.id,
    },
  })

  const p8 = await prisma.project.create({
    data: {
      name: "Q3 Portfolio Review",
      description: "Quarterly portfolio review for Movement Investments LLC — evaluating underperforming assets and rebalancing.",
      status: "ACTIVE",
      phase: "ACQUISITION",
      progress: 30,
      startDate: new Date("2026-07-01"),
      targetDate: new Date("2026-09-30"),
      organizationId: org.id,
      entityId: investments.id,
    },
  })
  console.log("  ✓ 8 projects created")

  // ── Tasks ─────────────────────────────────────────────────────
  // Create tasks sequentially to capture IDs for dependency linking
  const t1 = await prisma.task.create({
    data: {
      title: "Finalize GC contract for hotel renovation",
      description: "Review and sign the general contractor agreement with Meridian Construction for Phase 1.",
      status: "WAITING_ON",
      priority: "CRITICAL",
      dueDate: new Date("2026-07-25"),
      category: "Contracts",
      organizationId: org.id,
      projectId: p1.id,
      entityId: grandHotel.id,
      assigneeId: navid.id,
      createdById: navid.id,
      notes: "Waiting on contractor bid for HVAC and plumbing scope",
    },
  })

  const t2 = await prisma.task.create({
    data: {
      title: "Approve guest room finish samples",
      description: "Review and approve flooring, wall covering, and fixture samples for the guest room renovation.",
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date("2026-07-28"),
      category: "Design",
      organizationId: org.id,
      projectId: p1.id,
      entityId: grandHotel.id,
      assigneeId: navid.id,
      createdById: sarah.id,
      dependsOnId: t1.id, // Depends on: Finalize GC contract
    },
  })

  const t3 = await prisma.task.create({
    data: {
      title: "Schedule weekly construction walkthrough",
      description: "Coordinate with GC for weekly progress walkthroughs every Thursday at 9am.",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      dueDate: new Date("2026-07-20"),
      category: "Coordination",
      organizationId: org.id,
      projectId: p1.id,
      entityId: grandHotel.id,
      assigneeId: mike.id,
      createdById: mike.id,
    },
  })

  const t4 = await prisma.task.create({
    data: {
      title: "Submit building permit revision for pool area",
      description: "Revised pool area plans need to be resubmitted to the city for updated permit.",
      status: "WAITING_ON",
      priority: "HIGH",
      dueDate: new Date("2026-07-22"),
      category: "Permits",
      organizationId: org.id,
      projectId: p1.id,
      entityId: grandHotel.id,
      assigneeId: mike.id,
      createdById: mike.id,
      notes: "Awaiting revised structural drawings from architect",
    },
  })

  const t5 = await prisma.task.create({
    data: {
      title: "Complete Phase 1 environmental assessment",
      description: "Environmental site assessment is pending report from TerraScan Environmental.",
      status: "WAITING_ON",
      priority: "CRITICAL",
      dueDate: new Date("2026-07-18"),
      category: "Due Diligence",
      organizationId: org.id,
      projectId: p3.id,
      entityId: fuelStop.id,
      assigneeId: mike.id,
      createdById: navid.id,
      notes: "Awaiting Phase 1 results from TerraScan — past due by 2 days",
    },
  })

  const t6 = await prisma.task.create({
    data: {
      title: "Review title commitment for Route 66",
      description: "Chicago Title just delivered the preliminary title report. Need to review for any liens or encumbrances.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: new Date("2026-07-21"),
      category: "Legal",
      organizationId: org.id,
      projectId: p3.id,
      entityId: fuelStop.id,
      assigneeId: navid.id,
      createdById: sarah.id,
    },
  })

  const t7 = await prisma.task.create({
    data: {
      title: "Negotiate purchase price adjustment",
      description: "Based on inspection findings, negotiate a $75K reduction with the seller.",
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date("2026-07-30"),
      category: "Negotiation",
      organizationId: org.id,
      projectId: p3.id,
      entityId: fuelStop.id,
      assigneeId: navid.id,
      createdById: navid.id,
      dependsOnId: t5.id, // Depends on: Complete Phase 1 environmental assessment
    },
  })

  const t8 = await prisma.task.create({
    data: {
      title: "Review branding concept proposals",
      description: "Three design firms submitted proposals. Review and shortlist for presentations.",
      status: "BLOCKED",
      priority: "LOW",
      dueDate: new Date("2026-08-15"),
      category: "Design",
      organizationId: org.id,
      projectId: p4.id,
      entityId: fuelStop.id,
      assigneeId: sarah.id,
      createdById: sarah.id,
      notes: "Project on hold pending acquisition close",
      dependsOnId: t7.id, // Depends on: Negotiate purchase price adjustment
    },
  })

  const t9 = await prisma.task.create({
    data: {
      title: "Finalize lease with Anchor Brewing Co.",
      description: "Anchor Brewing is taking Suite 140 (4,200 sqft). Lease terms agreed, awaiting signed document.",
      status: "WAITING_ON",
      priority: "HIGH",
      dueDate: new Date("2026-07-19"),
      category: "Leasing",
      organizationId: org.id,
      projectId: p5.id,
      entityId: oakwood.id,
      assigneeId: sarah.id,
      createdById: sarah.id,
      notes: "Vendor contract pending signature — Anchor's attorney reviewing final language",
    },
  })

  const t10 = await prisma.task.create({
    data: {
      title: "Run Facebook Ads campaign for vacancies",
      description: "Launch geo-targeted ads for the 3 remaining small-bay units (Suites 110, 115, 210).",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      dueDate: new Date("2026-07-25"),
      category: "Marketing",
      organizationId: org.id,
      projectId: p5.id,
      entityId: oakwood.id,
      assigneeId: sarah.id,
      createdById: sarah.id,
    },
  })

  const t11 = await prisma.task.create({
    data: {
      title: "Update plaza listing on LoopNet and Crexi",
      description: "Refresh photos, floor plans, and pricing for vacant suites.",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: new Date("2026-07-31"),
      category: "Marketing",
      organizationId: org.id,
      projectId: p5.id,
      entityId: oakwood.id,
      assigneeId: sarah.id,
      createdById: mike.id,
    },
  })

  const t12 = await prisma.task.create({
    data: {
      title: "Submit HVAC permit application to City of Austin",
      description: "Compile mechanical drawings and submit permit application. Expediter engaged.",
      status: "WAITING_ON",
      priority: "HIGH",
      dueDate: new Date("2026-07-15"),
      category: "Permits",
      organizationId: org.id,
      projectId: p6.id,
      entityId: oakwood.id,
      assigneeId: mike.id,
      createdById: mike.id,
      notes: "Waiting on mechanical engineer's stamped drawings",
    },
  })

  const t13 = await prisma.task.create({
    data: {
      title: "Get HVAC equipment quotes from 3 vendors",
      description: "Send specs to Trane, Carrier, and Daikin for competitive quotes on the 25-ton rooftop units.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: new Date("2026-07-28"),
      category: "Procurement",
      organizationId: org.id,
      projectId: p6.id,
      entityId: oakwood.id,
      assigneeId: mike.id,
      createdById: mike.id,
    },
  })

  const t14 = await prisma.task.create({
    data: {
      title: "Notify tenants of upcoming HVAC shutdown windows",
      description: "Coordinate with tenants for scheduled shutdowns — need 48-hour notice per lease terms.",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: new Date("2026-08-15"),
      category: "Tenant Relations",
      organizationId: org.id,
      projectId: p6.id,
      entityId: oakwood.id,
      assigneeId: sarah.id,
      createdById: mike.id,
      dependsOnId: t13.id, // Depends on: Get HVAC equipment quotes from 3 vendors
    },
  })

  const t15 = await prisma.task.create({
    data: {
      title: "Coordinate kitchen shutdown schedule",
      description: "Plan phased shutdown to minimize impact on restaurant operations. Each kitchen needs 3-day closure.",
      status: "IN_PROGRESS",
      priority: "CRITICAL",
      dueDate: new Date("2026-07-20"),
      category: "Operations",
      organizationId: org.id,
      projectId: p7.id,
      entityId: hospitality.id,
      assigneeId: mike.id,
      createdById: mike.id,
    },
  })

  const t16 = await prisma.task.create({
    data: {
      title: "Approve equipment purchase order",
      description: "PO for $187K in commercial kitchen equipment from Restaurant Depot — needs owner sign-off.",
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date("2026-07-22"),
      category: "Procurement",
      organizationId: org.id,
      projectId: p7.id,
      entityId: hospitality.id,
      assigneeId: navid.id,
      createdById: mike.id,
    },
  })

  const t17 = await prisma.task.create({
    data: {
      title: "Health department pre-inspection",
      description: "Schedule health department to inspect after equipment install before reopening kitchens.",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: new Date("2026-08-30"),
      category: "Compliance",
      organizationId: org.id,
      projectId: p7.id,
      entityId: hospitality.id,
      assigneeId: sarah.id,
      createdById: mike.id,
    },
  })

  const t18 = await prisma.task.create({
    data: {
      title: "Prepare Q2 financial statements for all entities",
      description: "Compile P&L and balance sheet for the investment committee meeting.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: new Date("2026-07-25"),
      category: "Financial",
      organizationId: org.id,
      projectId: p8.id,
      entityId: investments.id,
      assigneeId: sarah.id,
      createdById: navid.id,
    },
  })

  const t19 = await prisma.task.create({
    data: {
      title: "Schedule Q3 investment committee meeting",
      description: "Find a date that works for all 5 committee members. Target: first week of August.",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: new Date("2026-07-31"),
      category: "Coordination",
      organizationId: org.id,
      projectId: p8.id,
      entityId: investments.id,
      assigneeId: sarah.id,
      createdById: navid.id,
    },
  })

  const t20 = await prisma.task.create({
    data: {
      title: "Renew corporate insurance policy",
      description: "Annual renewal for umbrella liability policy across all entities. Expires Aug 31.",
      status: "IN_PROGRESS",
      priority: "CRITICAL",
      dueDate: new Date("2026-08-15"),
      category: "Insurance",
      organizationId: org.id,
      assigneeId: navid.id,
      createdById: navid.id,
    },
  })

  const t21 = await prisma.task.create({
    data: {
      title: "Bank financing for Route 66 — submit application",
      description: "SBA 7(a) loan application to First National Bank for the Route 66 acquisition.",
      status: "WAITING_ON",
      priority: "CRITICAL",
      dueDate: new Date("2026-07-18"),
      category: "Financing",
      organizationId: org.id,
      projectId: p3.id,
      entityId: fuelStop.id,
      assigneeId: navid.id,
      createdById: navid.id,
      notes: "Awaiting lender approval — loan committee meets Friday",
    },
  })

  const t22 = await prisma.task.create({
    data: {
      title: "Draft Q3 board presentation deck",
      description: "Create slide deck summarizing Q2 results and Q3 outlook across all entities.",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: new Date("2026-08-01"),
      category: "Reporting",
      organizationId: org.id,
      assigneeId: sarah.id,
      createdById: navid.id,
      dependsOnId: t18.id, // Depends on: Prepare Q2 financial statements
    },
  })

  const t23 = await prisma.task.create({
    data: {
      title: "Audit employee onboarding docs for compliance",
      description: "Review I-9s and W-4s for all new hires across entities in the last 6 months.",
      status: "TODO",
      priority: "LOW",
      dueDate: new Date("2026-08-10"),
      category: "HR",
      organizationId: org.id,
      assigneeId: sarah.id,
      createdById: sarah.id,
    },
  })

  const t24 = await prisma.task.create({
    data: {
      title: "Review property tax assessments",
      description: "County assessor sent new valuations for Grand Hotel and Oakwood. Review for appeal opportunities.",
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date("2026-08-05"),
      category: "Tax",
      organizationId: org.id,
      assigneeId: navid.id,
      createdById: sarah.id,
    },
  })

  const t25 = await prisma.task.create({
    data: {
      title: "Update investor portal with Q2 distributions",
      description: "Post Q2 distribution notices and K-1 drafts to the investor portal.",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: new Date("2026-07-31"),
      category: "Investor Relations",
      organizationId: org.id,
      entityId: investments.id,
      assigneeId: sarah.id,
      createdById: navid.id,
    },
  })

  const t26 = await prisma.task.create({
    data: {
      title: "Mike — send weekly ops report to Navid",
      description: "Compile construction progress, occupancy stats, and incident reports for the weekly update.",
      status: "DONE",
      priority: "MEDIUM",
      dueDate: new Date("2026-07-14"),
      category: "Reporting",
      organizationId: org.id,
      assigneeId: mike.id,
      createdById: navid.id,
    },
  })

  const allTasks = [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13, t14, t15, t16, t17, t18, t19, t20, t21, t22, t23, t24, t25, t26]
  console.log(`  ✓ ${allTasks.length} tasks created (3 with dependencies)`)
  console.log(`    Dependencies: "${t2.title}" → "${t1.title}"`)
  console.log(`    Dependencies: "${t7.title}" → "${t5.title}"`)
  console.log(`    Dependencies: "${t22.title}" → "${t18.title}"`)

  // ── Documents ─────────────────────────────────────────────────
  const docs = await Promise.all([
    prisma.document.create({
      data: {
        name: "Grand Hotel Purchase Agreement.pdf",
        type: "PURCHASE_AGREEMENT",
        url: "https://drive.example.com/grand-hotel-pa.pdf",
        organizationId: org.id,
        projectId: p2.id,
        entityId: grandHotel.id,
        uploadedById: navid.id,
      },
    }),
    prisma.document.create({
      data: {
        name: "Grand Hotel Title Insurance Policy.pdf",
        type: "INSURANCE",
        url: "https://drive.example.com/grand-hotel-title.pdf",
        organizationId: org.id,
        projectId: p2.id,
        entityId: grandHotel.id,
        uploadedById: sarah.id,
      },
    }),
    prisma.document.create({
      data: {
        name: "Meridian Construction — GC Contract (Draft).pdf",
        type: "CONTRACT",
        url: "https://drive.example.com/meridian-gc-draft.pdf",
        organizationId: org.id,
        projectId: p1.id,
        entityId: grandHotel.id,
        uploadedById: navid.id,
      },
    }),
    prisma.document.create({
      data: {
        name: "Route 66 Phase 1 ESA Report.pdf",
        type: "PDF",
        url: "https://drive.example.com/route66-esa.pdf",
        organizationId: org.id,
        projectId: p3.id,
        entityId: fuelStop.id,
        uploadedById: mike.id,
      },
    }),
    prisma.document.create({
      data: {
        name: "Oakwood Plaza — Anchor Brewing Lease (Execution Copy).pdf",
        type: "LEASE",
        url: "https://drive.example.com/anchor-brewing-lease.pdf",
        organizationId: org.id,
        projectId: p5.id,
        entityId: oakwood.id,
        uploadedById: sarah.id,
      },
    }),
    prisma.document.create({
      data: {
        name: "Oakwood HVAC — Mechanical Drawings v3.pdf",
        type: "PDF",
        url: "https://drive.example.com/oakwood-hvac-drawings-v3.pdf",
        organizationId: org.id,
        projectId: p6.id,
        entityId: oakwood.id,
        uploadedById: mike.id,
      },
    }),
    prisma.document.create({
      data: {
        name: "Movement Hospitality — Umbrella Liability Policy 2026.pdf",
        type: "INSURANCE",
        url: "https://drive.example.com/movement-umbrella-2026.pdf",
        organizationId: org.id,
        entityId: hospitality.id,
        uploadedById: navid.id,
      },
    }),
    prisma.document.create({
      data: {
        name: "Route 66 — Seller Financials Q1 2026.xlsx",
        type: "FINANCIAL_STATEMENT",
        url: "https://drive.example.com/route66-financials-q1.xlsx",
        organizationId: org.id,
        projectId: p3.id,
        entityId: fuelStop.id,
        uploadedById: sarah.id,
      },
    }),
    prisma.document.create({
      data: {
        name: "Grand Hotel — Building Permit Set.pdf",
        type: "LICENSE",
        url: "https://drive.example.com/grand-hotel-permits.pdf",
        organizationId: org.id,
        projectId: p1.id,
        entityId: grandHotel.id,
        uploadedById: mike.id,
      },
    }),
    prisma.document.create({
      data: {
        name: "Q2 2026 — Tax Estimate Summary.pdf",
        type: "TAX",
        url: "https://drive.example.com/q2-2026-tax-estimate.pdf",
        organizationId: org.id,
        entityId: investments.id,
        uploadedById: sarah.id,
      },
    }),
  ])
  console.log(`  ✓ ${docs.length} documents created`)

  // ── Contacts ──────────────────────────────────────────────────
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        name: "Robert Ashford",
        company: "Meridian Construction",
        position: "President",
        phone: "(619) 555-0142",
        email: "rashford@meridianconstruction.com",
        organizationId: org.id,
        entityId: grandHotel.id,
        notes: "GC for Grand Hotel Renovation",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Dr. Susan Park",
        company: "TerraScan Environmental",
        position: "Senior Environmental Scientist",
        phone: "(480) 555-0187",
        email: "spark@terrascan-env.com",
        organizationId: org.id,
        entityId: fuelStop.id,
        notes: "Phase 1 ESA for Route 66",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Linda Vasquez",
        company: "Chicago Title Company",
        position: "Escrow Officer",
        phone: "(512) 555-0123",
        email: "lvasquez@chicagotitle.com",
        organizationId: org.id,
        entityId: fuelStop.id,
        notes: "Title work for Route 66 acquisition",
      },
    }),
    prisma.contact.create({
      data: {
        name: "James Okafor",
        company: "First National Bank",
        position: "VP Commercial Lending",
        phone: "(214) 555-0191",
        email: "jokafor@fnb.com",
        organizationId: org.id,
        entityId: fuelStop.id,
        notes: "SBA loan for Route 66 acquisition",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Catherine Weil",
        company: "Weil & Associates Architects",
        position: "Principal Architect",
        phone: "(619) 555-0177",
        email: "cweil@weilarchitects.com",
        organizationId: org.id,
        entityId: grandHotel.id,
        notes: "Architect for Grand Hotel Renovation",
      },
    }),
    prisma.contact.create({
      data: {
        name: "David Tran",
        company: "Tran Mechanical Engineering",
        position: "Lead Mechanical Engineer",
        phone: "(512) 555-0160",
        email: "dtran@tranmechanical.com",
        organizationId: org.id,
        entityId: oakwood.id,
        notes: "HVAC design for Oakwood replacement project",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Patricia Holmes",
        company: "City of Austin — Development Services",
        position: "Permit Review Specialist",
        phone: "(512) 555-0102",
        email: "pholmes@austintexas.gov",
        organizationId: org.id,
        entityId: oakwood.id,
        notes: "City contact for Oakwood permits",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Marcus Bell",
        company: "Bell Commercial Real Estate",
        position: "Leasing Agent",
        phone: "(512) 555-0145",
        email: "mbell@bellcre.com",
        organizationId: org.id,
        entityId: oakwood.id,
        notes: "Leasing agent for Oakwood Plaza vacancies",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Angela Rossi",
        company: "Rossi Law Group",
        position: "Real Estate Attorney",
        phone: "(310) 555-0128",
        email: "arossi@rossilaw.com",
        organizationId: org.id,
        notes: "Outside counsel for acquisitions and contracts",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Tom Hendricks",
        company: "Restaurant Depot",
        position: "Commercial Sales Manager",
        phone: "(858) 555-0155",
        email: "thendricks@restaurantdepot.com",
        organizationId: org.id,
        entityId: hospitality.id,
        notes: "Equipment vendor for kitchen upgrade",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Yuki Tanaka",
        company: "Anchor Brewing Co.",
        position: "COO",
        phone: "(512) 555-0199",
        email: "ytanaka@anchorbrewing.com",
        organizationId: org.id,
        entityId: oakwood.id,
        notes: "New tenant at Oakwood — Suite 140",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Frank DeLuca",
        company: "DeLuca Insurance Brokers",
        position: "Senior Broker",
        phone: "(213) 555-0111",
        email: "fdeluca@delucainsurance.com",
        organizationId: org.id,
        notes: "Corporate insurance broker for all Movement entities",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Rachel Simmons",
        company: "Simmons CPA Group",
        position: "Partner",
        phone: "(818) 555-0133",
        email: "rsimmons@simmonscpa.com",
        organizationId: org.id,
        notes: "Tax advisor and CPA for Movement",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Greg Morrison",
        company: "Route 66 Fuel Stop (Seller)",
        position: "Owner",
        phone: "(928) 555-0170",
        email: "greg@route66fuel.com",
        organizationId: org.id,
        entityId: fuelStop.id,
        notes: "Current owner / seller of Route 66 Fuel Stop",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Nina Kapoor",
        company: "Carrier HVAC",
        position: "Regional Sales Manager",
        phone: "(512) 555-0188",
        email: "nkapoor@carrier.com",
        organizationId: org.id,
        entityId: oakwood.id,
        notes: "HVAC equipment vendor for Oakwood project",
      },
    }),
  ])
  console.log(`  ✓ ${contacts.length} contacts created`)

  // ── Notifications (for Navid) ─────────────────────────────────
  const notifs = await Promise.all([
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: navid.id,
        type: "OVERDUE",
        title: "Task overdue",
        message: "Task overdue: Complete Phase 1 environmental assessment",
        link: "/tasks/" + t5.id,
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: navid.id,
        type: "DEADLINE",
        title: "Deadline approaching",
        message: "Deadline approaching: Finalize GC contract for hotel renovation is due within 3 days",
        link: "/tasks/" + t1.id,
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: navid.id,
        type: "STALLED",
        title: "Project stalled",
        message: "Project stalled: Route 66 Acquisition has low progress (20%)",
        link: "/projects/" + p3.id,
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: navid.id,
        type: "STALLED",
        title: "Project stalled",
        message: "Project stalled: Oakwood HVAC Replacement has low progress (15%)",
        link: "/projects/" + p6.id,
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: navid.id,
        type: "RENEWAL",
        title: "Contract renewal needed",
        message: "Contract renewal: Movement Hospitality — Umbrella Liability Policy 2026 may need renewal",
        link: "/documents/" + docs[6].id,
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: navid.id,
        type: "DEADLINE",
        title: "Deadline approaching",
        message: "Deadline approaching: Bank financing for Route 66 — submit application is due soon",
        link: "/tasks/" + t21.id,
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: navid.id,
        type: "OVERDUE",
        title: "Task overdue",
        message: "Task overdue: Submit building permit revision for pool area",
        link: "/tasks/" + t4.id,
        read: true,
      },
    }),
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: navid.id,
        type: "DEADLINE",
        title: "Deadline approaching",
        message: "Deadline approaching: Review title commitment for Route 66",
        link: "/tasks/" + t6.id,
        read: true,
      },
    }),
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: navid.id,
        type: "STALLED",
        title: "Project stalled",
        message: "Project stalled: Route 66 Rebranding has low progress (10%)",
        link: "/projects/" + p4.id,
        read: true,
      },
    }),
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: navid.id,
        type: "RENEWAL",
        title: "Contract renewal needed",
        message: "Contract renewal: Grand Hotel — Building Permit Set may need renewal",
        link: "/documents/" + docs[8].id,
        read: true,
      },
    }),
  ])
  console.log(`  ✓ ${notifs.length} notifications created`)

  // ── Task event notifications (ASSIGNED, COMPLETED, WAITING, UNBLOCKED) ──
  await Promise.all([
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: navid.id,
        type: "ASSIGNED",
        title: "Task assigned",
        message: "Victoria Bishop assigned you a task: Review title commitment for Route 66",
        link: "/tasks/" + t6.id,
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: navid.id,
        type: "COMPLETED",
        title: "Task completed",
        message: "Victoria Bishop completed a task you created: Prepare Q2 financial statements for all entities",
        link: "/tasks/" + t18.id,
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: sarah.id,
        type: "WAITING",
        title: "Task waiting",
        message: "Your task is now waiting: Finalize lease with Anchor Brewing Co.",
        link: "/tasks/" + t9.id,
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: mike.id,
        type: "UNBLOCKED",
        title: "Task unblocked",
        message: "A task you're waiting on is unblocked: Submit building permit revision for pool area",
        link: "/tasks/" + t4.id,
        read: false,
      },
    }),
  ])
  console.log("  ✓ 4 task event notifications created")

  // ── Comments (demo discussion between Navid and Victoria) ──────
  const comments = await Promise.all([
    prisma.comment.create({
      data: {
        content: "Victoria, can you follow up with Meridian on this? We need their final numbers by EOD.",
        taskId: t1.id,
        authorId: navid.id,
        organizationId: org.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: "Already on it. Spoke with Robert this morning — he said the HVAC scope is the holdup. Should have numbers by 2pm.",
        taskId: t1.id,
        authorId: sarah.id,
        organizationId: org.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: "@Victoria Bishop please also ask for a breakdown on the plumbing scope. I want to compare against the initial estimate.",
        taskId: t1.id,
        authorId: navid.id,
        organizationId: org.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: "Just got the Phase 1 back from TerraScan. @Navid there are some soil contaminants near the underground tanks. I'm flagging this as high priority — we should discuss before moving forward.",
        taskId: t5.id,
        authorId: mike.id,
        organizationId: org.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: "@Mike Torres Thanks for flagging. Let's get a cost estimate for remediation before we adjust the offer. Can you also check if the seller disclosed this?",
        taskId: t5.id,
        authorId: navid.id,
        organizationId: org.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: "Flooring samples are in the conference room. I like the wide-plank oak — it matches the lobby aesthetic we discussed. @Victoria Bishop can you schedule a 15-min review with Navid for tomorrow?",
        taskId: t2.id,
        authorId: mike.id,
        organizationId: org.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: "@Navid I've received quotes from Trane and Carrier. Daikin is still pending. Trane came in at $142K installed — about $8K under budget. Let me know if you want me to lock this in.",
        taskId: t13.id,
        authorId: mike.id,
        organizationId: org.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: "Q2 financials are looking strong across the board. @Victoria Bishop once the P&L is locked, can you update the investor portal? I want to get ahead of the committee meeting.",
        taskId: t18.id,
        authorId: navid.id,
        organizationId: org.id,
      },
    }),
  ])
  console.log(`  ✓ ${comments.length} demo comments created`)

  console.log("\n✅ Seed complete!")
  console.log(`   Login: navid@movement.com / password123`)
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
