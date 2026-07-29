"use client"

import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const DOC_TYPES = [
  "CONTRACT", "PURCHASE_AGREEMENT", "LEASE", "INSURANCE",
  "LICENSE", "TAX", "FINANCIAL_STATEMENT", "PHOTO", "PDF", "OTHER"
] as const

const typeLabels: Record<string, string> = {
  CONTRACT: "Contract",
  PURCHASE_AGREEMENT: "Purchase Agreement",
  LEASE: "Lease",
  INSURANCE: "Insurance",
  LICENSE: "License",
  TAX: "Tax",
  FINANCIAL_STATEMENT: "Financial Statement",
  PHOTO: "Photo",
  PDF: "PDF",
  OTHER: "Other",
}

export default function DocumentTypeFilter({ currentType }: { currentType: string }) {
  const router = useRouter()

  return (
    <Select
      defaultValue={currentType}
      onValueChange={(value) => {
        if (value === "all") {
          router.push("/documents")
        } else {
          router.push(`/documents?type=${value}`)
        }
      }}
    >
      <SelectTrigger className="w-[180px] bg-[#111111] border-0">
        <SelectValue placeholder="All Types" />
      </SelectTrigger>
      <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
        <SelectItem value="all">All Types</SelectItem>
        {DOC_TYPES.map((t) => (
          <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
