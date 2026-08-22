/**
 * Contact merge / unmerge service (Phase 4d) — reversible, idempotent, org-isolated.
 *
 * Merge: absorbs one owner-confirmed list of duplicate contacts into a keeper.
 * The keeper survives; each merged-away contact is NOT deleted — it is marked
 * (mergedIntoId / mergedAt) and a ContactMerge reversibility record is written
 * with a full snapshot of its pre-merge state. Everything is org-scoped.
 *
 * Unmerge: reverses a prior merge from its stored snapshot — recreates the
 * merged contact's relations, restores its primary entity, clears copied
 * fields from the keeper ONLY where the keeper value is unchanged (so data
 * added after the merge stays intact), removes the note lines the merge
 * appended, and flips the record to UNMERGED. Idempotent.
 */
import type { PrismaClient } from "@prisma/client"

interface MergeParams {
  keeperId: string
  mergedIds: string[]
  orgId: string
  userId: string
}

export async function mergeContacts(
  prisma: PrismaClient,
  { keeperId, mergedIds, orgId, userId }: MergeParams
): Promise<{ merged: number; skipped: number }> {
  const keeper = await prisma.contact.findFirst({ where: { id: keeperId, organizationId: orgId } })
  if (!keeper) throw new Error("Keeper contact not found in this organization")
  if (keeper.mergedIntoId) throw new Error("Keeper contact is itself already merged")

  let merged = 0
  let skipped = 0

  for (const mergedId of mergedIds) {
    if (mergedId === keeperId) continue
    const d = await prisma.contact.findFirst({ where: { id: mergedId, organizationId: orgId } })
    if (!d) throw new Error("Merged contact not found in this organization")
    if (d.mergedIntoId) {
      // idempotency: this contact was already absorbed — do not re-apply.
      skipped++
      continue
    }

    // ── Snapshot for reversibility ─────────────────────────────────────────
    const rels = await prisma.contactRelation.findMany({ where: { contactId: d.id } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snapshot: any = {
      contactId: d.id,
      entityId: d.entityId,
      relations: rels.map((r) => ({
        entityId: r.entityId,
        role: r.role,
        enabled: r.enabled,
        notes: r.notes,
      })),
      position: d.position,
      company: d.company,
      email: d.email,
      phone: d.phone,
      notes: d.notes,
      copied: {} as Record<string, string>,
      notesAdded: [] as string[],
    }
    const notesAdded = snapshot.notesAdded as string[]
    const copied = snapshot.copied as Record<string, string>

    // Reparent every one of the dup's relations to the keeper (skip collisions)
    for (const r of rels) {
      const existing = await prisma.contactRelation.findFirst({
        where: { contactId: keeper.id, entityId: r.entityId },
      })
      if (!existing) {
        await prisma.contactRelation.create({
          data: {
            contactId: keeper.id,
            entityId: r.entityId,
            role: r.role,
            notes: r.notes,
            enabled: r.enabled,
            organizationId: orgId,
          },
        })
      } else if (r.role && r.role !== existing.role) {
        // unique(contactId, entityId) holds one role per entity — fold the lost
        // role into the keeper's notes so no role knowledge is dropped.
        const entity = await prisma.entity.findUnique({ where: { id: r.entityId }, select: { name: true } })
        const note = `${r.role} (${entity?.name ?? r.entityId})`
        if (!keeper.notes?.includes(note)) {
          await prisma.contact.update({ where: { id: keeper.id }, data: { notes: keeper.notes ? `${keeper.notes}\n${note}` : note } })
          notesAdded.push(note)
        }
      }
      await prisma.contactRelation.delete({ where: { id: r.id } })
    }

    // Ensure the dup's primary entity stays represented on the keeper
    if (d.entityId) {
      const has = await prisma.contactRelation.findFirst({
        where: { contactId: keeper.id, entityId: d.entityId },
      })
      if (!has) {
        await prisma.contactRelation.create({
          data: { contactId: keeper.id, entityId: d.entityId, role: d.position, organizationId: orgId },
        })
      } else if (d.position && d.position !== has.role) {
        const entity = await prisma.entity.findUnique({ where: { id: d.entityId }, select: { name: true } })
        const note = `${d.position} (${entity?.name ?? d.entityId})`
        if (!keeper.notes?.includes(note)) {
          await prisma.contact.update({ where: { id: keeper.id }, data: { notes: keeper.notes ? `${keeper.notes}\n${note}` : note } })
          notesAdded.push(note)
        }
      }
    }

    // Copy missing primary fields onto the keeper
    const patch: Record<string, string> = {}
    if (!keeper.email && d.email) {
      patch.email = d.email
      copied.email = d.email
    }
    if (!keeper.phone && d.phone) {
      patch.phone = d.phone
      copied.phone = d.phone
    }
    if (!keeper.company && d.company) {
      patch.company = d.company
      copied.company = d.company
    }
    if (!keeper.position && d.position) {
      patch.position = d.position
      copied.position = d.position
    }
    if (!keeper.notes && d.notes) {
      patch.notes = d.notes
      copied.notes = d.notes
    }
    if (Object.keys(patch).length) {
      await prisma.contact.update({ where: { id: keeper.id }, data: patch })
    }

    // Mark the dup as absorbed (NOT deleted → unmerge + honest audit trail)
    await prisma.contact.update({
      where: { id: d.id },
      data: { mergedIntoId: keeper.id, mergedAt: new Date() },
    })

    // Reversibility record
    await prisma.contactMerge.create({
      data: {
        organizationId: orgId,
        keeperId: keeper.id,
        mergedId: d.id,
        snapshot,
        status: "MERGED",
        mergedBy: userId,
      },
    })

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: "MERGE",
        entity: "Contact",
        entityId: keeper.id,
        details: JSON.stringify({ mergedId: d.id, mergedName: d.name, keeperName: keeper.name }),
      },
    })
    merged++
  }

  return { merged, skipped }
}

interface UnmergeParams {
  mergeId: string
  orgId: string
  userId: string
}

export async function unmergeContact(
  prisma: PrismaClient,
  { mergeId, orgId, userId }: UnmergeParams
): Promise<{ alreadyUnmerged: boolean }> {
  const m = await prisma.contactMerge.findFirst({ where: { id: mergeId, organizationId: orgId } })
  if (!m) throw new Error("Merge record not found")
  if (m.status === "UNMERGED") return { alreadyUnmerged: true } // idempotent

  const snap = m.snapshot as Record<string, any>

  // Recreate the merged-away contact's relations from the snapshot
  for (const rel of snap.relations ?? []) {
    const existing = await prisma.contactRelation.findFirst({
      where: { contactId: m.mergedId, entityId: rel.entityId },
    })
    if (!existing) {
      await prisma.contactRelation.create({
        data: {
          contactId: m.mergedId,
          entityId: rel.entityId,
          role: rel.role ?? null,
          enabled: rel.enabled ?? true,
          notes: rel.notes ?? null,
          organizationId: orgId,
        },
      })
    }
  }

  const merged = await prisma.contact.findFirst({ where: { id: m.mergedId, organizationId: orgId } })

  // Restore the merged contact's primary entity (if it was changed/cleared)
  if (snap.entityId && merged && merged.entityId !== snap.entityId) {
    await prisma.contact.update({ where: { id: m.mergedId }, data: { entityId: snap.entityId } })
  }

  // Undo what the merge wrote onto the keeper, but ONLY where still unchanged
  // (data added after the merge is left intact).
  const keeper = await prisma.contact.findFirst({ where: { id: m.keeperId, organizationId: orgId } })
  if (keeper) {
    const patch: Record<string, unknown> = {}
    for (const [field, value] of Object.entries(snap.copied ?? {})) {
      if ((keeper as any)[field] === value) patch[field] = null
    }
    let notes = keeper.notes
    let notesChanged = false
    for (const note of snap.notesAdded ?? []) {
      if (notes && notes.includes(note)) {
        notes = notes.replace(note, "").replace(/\n{2,}/g, "\n").trim()
        notesChanged = true
      }
    }
    if (notesChanged) patch.notes = notes || null
    if (Object.keys(patch).length) {
      await prisma.contact.update({ where: { id: keeper.id }, data: patch })
    }
  }

  // Un-mark the absorbed contact
  await prisma.contact.update({
    where: { id: m.mergedId },
    data: { mergedIntoId: null, mergedAt: null },
  })

  // Flip the reversibility record (retained for the audit trail)
  await prisma.contactMerge.update({
    where: { id: m.id },
    data: { status: "UNMERGED", unmergedAt: new Date(), unmergedBy: userId },
  })

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId,
      action: "UNMERGE",
      entity: "Contact",
      entityId: m.mergedId,
      details: JSON.stringify({ mergeId: m.id, mergedName: merged?.name, keeperName: keeper?.name }),
    },
  })

  return { alreadyUnmerged: false }
}
