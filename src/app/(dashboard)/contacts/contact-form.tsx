"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Users, Loader2 } from "lucide-react"
import { toast } from "sonner"

type Entity = { id: string; name: string }

interface ContactFormProps {
  entities: Entity[]
  contact?: any
  isEdit?: boolean
}

export function ContactForm({ entities, contact, isEdit }: ContactFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState(contact?.name || "")
  const [company, setCompany] = useState(contact?.company || "")
  const [position, setPosition] = useState(contact?.position || "")
  const [phone, setPhone] = useState(contact?.phone || "")
  const [email, setEmail] = useState(contact?.email || "")
  const [entityId, setEntityId] = useState(contact?.entityId || "")
  const [notes, setNotes] = useState(contact?.notes || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const body = {
        name: name.trim(),
        company: company.trim() || null,
        position: position.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        entityId: entityId || null,
        notes: notes.trim() || null,
      }

      const fetchUrl = isEdit ? `/api/contacts/${contact.id}` : "/api/contacts"
      const method = isEdit ? "PATCH" : "POST"

      const res = await fetch(fetchUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save contact")
      }

      const result = await res.json()
      toast.success(isEdit ? "Contact updated" : "Contact created")
      router.push(`/contacts/${result.id}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to save contact")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={isEdit ? `/contacts/${contact?.id}` : "/contacts"}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Edit Contact" : "New Contact"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit ? "Update contact details." : "Add a new contact to your organization."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-0 bg-[#111111]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                <Users className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <CardTitle>{isEdit ? contact?.name || "Edit Contact" : "Contact Details"}</CardTitle>
                <CardDescription>Fill in the contact information below.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Robert Ashford"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#1a1a1a] border-0"
                required
              />
            </div>

            {/* Company + Position */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="e.g. Meridian Construction"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-[#1a1a1a] border-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  placeholder="e.g. President"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="bg-[#1a1a1a] border-0"
                />
              </div>
            </div>

            {/* Phone + Email */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. (619) 555-0142"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-[#1a1a1a] border-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. rashford@meridian.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#1a1a1a] border-0"
                />
              </div>
            </div>

            {/* Entity */}
            <div className="space-y-2">
              <Label htmlFor="entityId">Entity</Label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger id="entityId" className="bg-[#1a1a1a] border-0">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
                  <SelectItem value="none">None</SelectItem>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Additional notes about this contact..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-[#1a1a1a] border-0 resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={loading || !name.trim()} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Create Contact"}
              </Button>
              <Link href={isEdit ? `/contacts/${contact?.id}` : "/contacts"}>
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
