"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GitMerge, Undo2, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function MergeGroupButton({
  keeperId,
  keeperName,
  mergedIds,
}: {
  keeperId: string
  keeperName: string
  mergedIds: string[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const handleMerge = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/contacts/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keeperId, mergedIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Merge failed")
      toast.success(`Merged ${data.merged ?? 0} contact${(data.merged ?? 0) === 1 ? "" : "s"} into ${keeperName}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Merge failed")
    } finally {
      setLoading(false)
    }
  }
  return (
    <Button size="sm" onClick={handleMerge} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" />}
      Merge into {keeperName}
    </Button>
  )
}

export function UnmergeButton({ mergeId, mergedName }: { mergeId: string; mergedName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const handleUnmerge = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/contacts/unmerge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mergeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unmerge failed")
      toast.success(`Restored "${mergedName}" as a separate contact`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Unmerge failed")
    } finally {
      setLoading(false)
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={handleUnmerge} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
      Unmerge
    </Button>
  )
}
