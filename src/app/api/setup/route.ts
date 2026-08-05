import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hash } from "bcryptjs"

const DEMO_EMAIL = "morgan@blackstonepartners.demo"

/** Populate the pitch account with a connected, believable operating history. */
async function seedDemoAccount(user: { id: string; organizationId: string }) {
  const { organizationId, id: userId } = user
  const existing = await prisma.entity.count({ where: { organizationId } })
  if (existing > 0) return

  const now = new Date()
  const days = (offset: number) => new Date(now.getTime() + offset * 86400000)
  const entitySpecs = [
    { name: "Blackstone Properties", type: "COMMERCIAL_PROPERTY", meta: { portfolio: "8 properties across New York, New Jersey, and Connecticut", focus: "Real estate" }, projects: ["Riverfront Plaza lease renewal", "Northeast portfolio capital plan", "2026 property tax cycle", "Hudson Industrial repositioning"], docs: ["Riverfront Plaza — Lease Register", "2025 Property Tax Returns", "Northeast Portfolio Insurance Binder", "Hudson Industrial — Phase I ESA", "Blackstone Properties Board Deck", "Q1 2026 Rent Roll"], contacts: [["Elena Marquez", "Marquez Property Management", "Property Manager"], ["Daniel Cho", "Cho & Patel LLP", "Real Estate Counsel"], ["Priya Nair", "CBRE", "Leasing Advisor"], ["Marcus Bell", "Bell Facilities Group", "Facilities Vendor"], ["Rachel Stein", "Stein Appraisal", "Appraiser"], ["Thomas Reed", "Reed Construction", "General Contractor"]] },
    { name: "BS Ventures", type: "BUSINESS", meta: { industry: "Logistics and supply chain", footprint: "Northeast regional carrier" }, projects: ["Fleet electrification pilot", "Warehouse management rollout", "FY26 operating plan", "Carrier insurance renewal"], docs: ["BS Ventures — FY26 Operating Plan", "Fleet Lease Schedule", "Warehouse 3PL Agreement", "2025 Audited Financial Statements", "Carrier Insurance Certificate", "Board Meeting — March 2026"], contacts: [["Avery Thompson", "BS Ventures", "President"], ["Jamal Brooks", "Deloitte", "Operations Consultant"], ["Sofia Alvarez", "FleetWorks", "Fleet Account Executive"], ["Nina Kapoor", "Morrison Foerster", "Corporate Counsel"], ["Liam O'Connor", "Eastline Logistics", "Strategic Partner"], ["Marcus Bell", "Bell Facilities Group", "Facilities Vendor"]] },
    { name: "Blackstone Investments", type: "INVESTMENT", meta: { strategy: "Public equities, private equity, and venture positions", aum: "$184M" }, projects: ["Q2 allocation review", "Mosaic Fund IV diligence", "Liquidity and tax planning", "Annual investor reporting"], docs: ["Investment Policy Statement — 2026", "Mosaic Fund IV — Subscription Agreement", "Q1 Performance Attribution", "Private Holdings Cap Table", "K-1 Collection Tracker", "Investment Committee Deck"], contacts: [["Victor Lang", "Lang Capital Advisors", "Portfolio Manager"], ["Rebecca Wu", "Harris Williams", "Investment Banker"], ["Daniel Cho", "Cho & Patel LLP", "Tax Counsel"], ["Maya Shah", "Mosaic Capital", "Partner"], ["Gregory Foster", "Northern Trust", "Relationship Manager"], ["Olivia Park", "Crestview Accounting", "Controller"]] },
    { name: "BS Foundation", type: "OTHER", meta: { mission: "Family foundation supporting education and local resilience", status: "Private foundation" }, projects: ["2026 grantmaking cycle", "Community resilience grants", "Annual 990-PF filing", "Scholarship partner review"], docs: ["2026 Grantmaking Guidelines", "2025 Form 990-PF Filing", "Community Resilience Grant Docket", "Foundation Investment Policy", "Board Minutes — February 2026", "Scholarship Partner MOU"], contacts: [["Caroline Webb", "BS Foundation", "Executive Director"], ["Janet Ellis", "Ellis & Hart CPAs", "Foundation Accountant"], ["Maya Shah", "Mosaic Capital", "Board Member"], ["Andre Williams", "Harbor Youth Network", "Grantee Partner"], ["Grace Kim", "Education Forward", "Program Director"], ["Daniel Cho", "Cho & Patel LLP", "Legal Counsel"]] },
    { name: "BS Hospitality", type: "BUSINESS", meta: { industry: "Hotels and restaurants", footprint: "Boutique hotels and destination dining" }, projects: ["Harbor House renovation", "2026 hospitality operating plan", "Restaurant concept launch", "Guest experience modernization"], docs: ["Harbor House — Management Agreement", "2026 Hospitality Operating Plan", "Restaurant Vendor Master List", "Hotel Property Insurance Binder", "Guest Experience Standards", "Hospitality Board Review — Q1 2026"], contacts: [["Isabella Rossi", "BS Hospitality", "Managing Director"], ["Marcus Bell", "Bell Facilities Group", "Facilities Vendor"], ["Tara Nguyen", "Marriott Advisory Services", "Hospitality Consultant"], ["Daniel Cho", "Cho & Patel LLP", "Real Estate Counsel"], ["Luis Mendoza", "Culinary Concepts Group", "Restaurant Operator"], ["Hannah Price", "Lockton", "Insurance Broker"]] },
    { name: "Blackstone Development", type: "COMMERCIAL_PROPERTY", meta: { portfolio: "Commercial development pipeline across the Northeast", focus: "Real estate development" }, projects: ["Broadway mixed-use entitlement", "Newark logistics campus", "2026 development pipeline", "Construction financing program"], docs: ["Broadway District — Entitlement Plan", "Newark Campus — Site Assessment", "Development Pipeline — 2026", "Construction Loan Term Sheet", "Environmental Review Register", "General Contractor Prequalification"], contacts: [["Noah Bennett", "Blackstone Development", "Development Director"], ["Rachel Stein", "Stein Appraisal", "Appraiser"], ["Daniel Cho", "Cho & Patel LLP", "Development Counsel"], ["Marcus Bell", "Bell Facilities Group", "Facilities Vendor"], ["Priya Nair", "CBRE", "Leasing Advisor"], ["Owen Gallagher", "Turner Construction", "Project Executive"]] },
    { name: "BS Technology", type: "BUSINESS", meta: { industry: "SaaS and workflow automation", footprint: "Enterprise software subsidiary" }, projects: ["Operion platform release", "Enterprise security program", "Customer success expansion", "FY26 product roadmap"], docs: ["Operion Product Roadmap — 2026", "SOC 2 Readiness Assessment", "Enterprise Master Services Agreement", "FY26 Technology Budget", "Information Security Policy", "Customer Success Playbook"], contacts: [["Ethan Cole", "BS Technology", "Chief Executive Officer"], ["Sofia Alvarez", "FleetWorks", "Strategic Customer"], ["Nina Kapoor", "Morrison Foerster", "Technology Counsel"], ["Jamal Brooks", "Deloitte", "Operations Consultant"], ["Leah Morgan", "CloudScale", "Infrastructure Partner"], ["Victor Lang", "Lang Capital Advisors", "Board Advisor"]] },
    { name: "Blackstone Family Office", type: "OTHER", meta: { mission: "Integrated wealth management and family services", status: "Private family office" }, projects: ["2026 family wealth plan", "Next-generation governance", "Household operations modernization", "Family travel and philanthropy calendar"], docs: ["Family Investment Policy — 2026", "Estate Planning Coordination Memo", "Household Staffing Handbook", "Private Aviation Insurance Schedule", "Family Governance Charter", "Annual Wealth Review — 2025"], contacts: [["Morgan Webb", "Blackstone Partners LLC", "Principal"], ["Olivia Park", "Crestview Accounting", "Controller"], ["Daniel Cho", "Cho & Patel LLP", "Tax Counsel"], ["Grace Kim", "Education Forward", "Philanthropy Advisor"], ["Gregory Foster", "Northern Trust", "Relationship Manager"], ["Isabella Rossi", "BS Hospitality", "Family Services Partner"]] },
  ]

  for (const [entityIndex, spec] of entitySpecs.entries()) {
    const entity = await prisma.entity.create({ data: { organizationId, name: spec.name, type: spec.type, metadata: JSON.stringify(spec.meta), isSample: true } })
    const projects = []
    for (const [i, name] of spec.projects.entries()) {
      projects.push(await prisma.project.create({ data: { organizationId, entityId: entity.id, name, description: `Morgan-led workstream for ${spec.name}: ${name}.`, status: i === 2 ? "ON_HOLD" : "ACTIVE", phase: ["OPERATIONS", "DUE_DILIGENCE", "CLOSEOUT", "ACQUISITION"][i], progress: i === 0 ? 42 : i === 1 ? 68 : 24, startDate: days(-45 + i * 8), targetDate: days(i === 0 && entityIndex === 0 ? 35 : 18 + i * 20), isSample: true } }))
    }
    const taskTitles = [
      `Review ${spec.name} monthly operating report`, `Approve vendor invoices for ${spec.name}`, `Prepare leadership update for ${spec.projects[0]}`, `Confirm insurance coverage and renewals`, `Collect outstanding documents from counsel`, `Reconcile February cash activity`, `Schedule stakeholder follow-up`, `Update risk register`, `Review budget variance`, `Share action items with Morgan`, `Validate compliance calendar`, `Request revised forecast`, `Archive executed agreements`, `Prepare next board packet`, `Confirm decision owners`, `Review open questions with advisor`, `Finalize weekly status notes`, `Check dependencies for ${spec.projects[1]}`,
    ]
    for (const [i, title] of taskTitles.entries()) {
      const overdue = (entityIndex === 0 && i < 2) || (entityIndex === 1 && i === 3)
      const dueDate = entityIndex === 0 && i === 0 ? days(12) : overdue ? days(-(i + 2)) : days(3 + ((i * 4 + entityIndex) % 34))
      await prisma.task.create({ data: { organizationId, entityId: entity.id, projectId: projects[i % projects.length].id, title, description: `Coordinate and close this item across the ${spec.name} workstream.`, status: i % 9 === 0 ? "DONE" : i % 11 === 0 ? "WAITING_ON" : i % 7 === 0 ? "IN_PROGRESS" : "TODO", priority: i === 0 && entityIndex === 0 ? "CRITICAL" : i % 5 === 0 ? "HIGH" : i % 3 === 0 ? "MEDIUM" : "LOW", dueDate, assigneeId: userId, createdById: userId, category: ["Property", "Operations", "Investments", "Foundation", "Hospitality", "Development", "Technology", "Family Office"][entityIndex], aiSuggestion: i === 0 ? `Bring this to Morgan's next review: deadline is ${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.` : undefined, isSample: true } })
    }
    for (const [i, name] of spec.docs.entries()) {
      await prisma.document.create({ data: { organizationId, entityId: entity.id, projectId: projects[i % projects.length].id, name, type: name.includes("Lease") || name.includes("Agreement") || name.includes("MOU") ? "CONTRACT" : name.includes("Tax") || name.includes("990") || name.includes("K-1") ? "TAX" : name.includes("Board") || name.includes("Committee") || name.includes("Minutes") ? "PDF" : "FINANCIAL_STATEMENT", notes: `Reviewed for the ${spec.name} operating file.`, uploadedById: userId, isSample: true } })
    }
    for (const [i, [name, company, position]] of spec.contacts.entries()) {
      await prisma.contact.create({ data: { organizationId, entityId: entity.id, name, company, position, email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${company.toLowerCase().replace(/[^a-z]+/g, "")}.com`, phone: `212-555-${String(1400 + entityIndex * 100 + i).slice(-4)}`, notes: `Primary ${position.toLowerCase()} for ${spec.name}.`, isSample: true } })
    }
  }

  const entities = await prisma.entity.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" } })
  const projects = await prisma.project.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" } })
  const meetings = [
    ["Riverfront Plaza renewal review", -6, "Elena Marquez and Daniel Cho · Blackstone Properties office", 0], ["Northeast portfolio capital plan", 9, "Rachel Stein and Marcus Bell · Video conference", 0],
    ["BS Ventures operating review", -2, "Avery Thompson · Board room", 1], ["Fleet electrification checkpoint", 16, "Sofia Alvarez · BS Ventures HQ", 1],
    ["Investment committee — Q2 allocation", 4, "Victor Lang · Video conference", 2], ["Mosaic Fund IV diligence review", 21, "Maya Shah and Rebecca Wu · Executive conference room", 2],
    ["Foundation grant docket", 7, "Caroline Webb · Foundation office", 3], ["Scholarship partner review", 28, "Grace Kim and Andre Williams · Foundation office", 3],
    ["Harbor House renovation review", 3, "Isabella Rossi and Marcus Bell · Harbor House", 4], ["Hospitality operating plan", 24, "Tara Nguyen and Luis Mendoza · Video conference", 4],
    ["Broadway entitlement workstream", 5, "Noah Bennett and Daniel Cho · Development office", 5], ["Newark campus financing review", 31, "Owen Gallagher and Priya Nair · Video conference", 5],
    ["Operion platform release readiness", -1, "Ethan Cole and Leah Morgan · BS Technology HQ", 6], ["Enterprise security checkpoint", 19, "Nina Kapoor and Jamal Brooks · Video conference", 6],
    ["Family wealth plan review", 11, "Morgan Webb and Olivia Park · Family office", 7], ["Family governance planning session", 34, "Daniel Cho and Grace Kim · Executive conference room", 7],
  ] as const
  for (const [title, offset, notes, entityIndex] of meetings) await prisma.meeting.create({ data: { organizationId, projectId: projects[entityIndex * 4 + (entityIndex === 0 ? 0 : 1)]?.id, title, date: days(offset), location: notes, notes: offset < 0 ? `Reviewed decisions, owners, and follow-ups for ${entities[entityIndex].name}.` : `Agenda: priorities, risks, and next actions across the ${entities[entityIndex].name} workstream.`, isSample: true } })

  await prisma.notification.createMany({ data: [{ organizationId, userId, type: "DEADLINE", title: "Lease renewal needs attention", message: "Riverfront Plaza lease renewal expires in 12 days.", link: "/tasks", read: false }, { organizationId, userId, type: "OVERDUE", title: "2 tasks are past due", message: "Review the overdue property workstream items.", link: "/tasks", read: false }] })
}

export async function POST(req: NextRequest) {
  const { secret } = await req.json().catch(() => ({}))
  if (secret !== "operion-setup-2026") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const adminEmail = "Hello@operion.online"
    let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!adminUser) {
      const adminOrg = await prisma.organization.create({ data: { name: "Operion", slug: "operion" } })
      adminUser = await prisma.user.create({ data: { email: adminEmail, name: "Admin", passwordHash: await hash("Admin123!", 10), role: "OWNER", organizationId: adminOrg.id, isSuperAdmin: true } })
    }
    let demoUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })
    if (!demoUser) {
      const demoOrg = await prisma.organization.create({ data: { name: "Blackstone Partners LLC", slug: "blackstone-partners-" + Date.now(), subscriptionTier: "SOLO", subscriptionStatus: "ACTIVE" } })
      demoUser = await prisma.user.create({ data: { email: DEMO_EMAIL, name: "Morgan Webb", passwordHash: await hash("demo123!", 10), role: "OWNER", organizationId: demoOrg.id } })
    }
    await seedDemoAccount(demoUser)
    return NextResponse.json({ status: "ok", admin: adminUser.email, demo: demoUser.email })
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }) }
}
