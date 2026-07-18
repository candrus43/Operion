"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Building2, Loader2 } from "lucide-react"
import { toast } from "sonner"

const entityTypes = [
  { value: "BUSINESS", label: "Business" },
  { value: "HOTEL", label: "Hotel" },
  { value: "GAS_STATION", label: "Gas Station" },
  { value: "COMMERCIAL_PROPERTY", label: "Commercial Property" },
  { value: "INVESTMENT", label: "Investment" },
  { value: "OTHER", label: "Other" },
]

// Type-specific metadata fields
const typeMetadataFields: Record<string, { key: string; label: string; placeholder: string }[]> = {
  BUSINESS: [
    { key: "industry", label: "Industry", placeholder: "e.g. Hospitality, Retail..." },
    { key: "employees", label: "Employees", placeholder: "e.g. 120" },
  ],
  HOTEL: [
    { key: "rooms", label: "Rooms", placeholder: "e.g. 210" },
    { key: "stars", label: "Stars", placeholder: "e.g. 4" },
    { key: "address", label: "Address", placeholder: "Full address" },
  ],
  GAS_STATION: [
    { key: "pumps", label: "Pumps", placeholder: "e.g. 12" },
    { key: "cStore", label: "Convenience Store", placeholder: "true/false" },
    { key: "address", label: "Address", placeholder: "Full address" },
  ],
  COMMERCIAL_PROPERTY: [
    { key: "sqft", label: "Square Footage", placeholder: "e.g. 85000" },
    { key: "occupancy", label: "Occupancy", placeholder: "e.g. 72%" },
    { key: "tenants", label: "Tenants", placeholder: "e.g. 14" },
    { key: "address", label: "Address", placeholder: "Full address" },
  ],
  INVESTMENT: [
    { key: "aum", label: "AUM", placeholder: "e.g. 45M" },
    { key: "strategy", label: "Strategy", placeholder: "e.g. Value, Growth..." },
  ],
  OTHER: [
    { key: "description", label: "Description", placeholder: "Brief description" },
  ],
}

export default function NewEntityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [metadata, setMetadata] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !type) return

    setLoading(true)
    try {
      const res = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, metadata }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create entity")
      }

      toast.success("Entity created successfully")
      const entity = await res.json()
      router.push(`/entities/${entity.id}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to create entity")
    } finally {
      setLoading(false)
    }
  }

  const fields = type ? (typeMetadataFields[type] || typeMetadataFields.OTHER) : []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/entities">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Entity</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add a new business, property, or investment to your portfolio.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-0 bg-[#111111]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <Building2 className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <CardTitle>Entity Details</CardTitle>
                <CardDescription>Fill in the basic information for your new entity.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Entity Name</Label>
              <Input
                id="name"
                placeholder="e.g. The Grand Hotel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#1a1a1a] border-0"
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Entity Type</Label>
              <Select value={type} onValueChange={(v) => { setType(v); setMetadata({}) }}>
                <SelectTrigger id="type" className="bg-[#1a1a1a] border-0">
                  <SelectValue placeholder="Select a type..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
                  {entityTypes.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type-specific metadata fields */}
            {fields.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-white/[0.05]">
                <Label className="text-sm text-muted-foreground">Type-specific Details</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key} className="text-xs">{field.label}</Label>
                      <Input
                        id={field.key}
                        placeholder={field.placeholder}
                        value={metadata[field.key] || ""}
                        onChange={(e) => setMetadata({ ...metadata, [field.key]: e.target.value })}
                        className="bg-[#1a1a1a] border-0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={loading || !name || !type} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Entity
              </Button>
              <Link href="/entities">
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
