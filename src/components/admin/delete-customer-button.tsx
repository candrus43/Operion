"use client"

import { useState } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface DeleteCustomerButtonProps {
  userId: string
  userName: string
}

export function DeleteCustomerButton({ userId, userName }: DeleteCustomerButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to delete user")
        setDeleting(false)
        return
      }

      router.refresh()
    } catch (err) {
      setError("Network error. Please try again.")
      setDeleting(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-[10px] text-red-400">{error}</span>
        )}
        <button
          onClick={() => { setShowConfirm(false); setError(null) }}
          disabled={deleting}
          className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
          Delete {userName}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
    >
      <Trash2 className="h-3 w-3" />
      Delete
    </button>
  )
}
