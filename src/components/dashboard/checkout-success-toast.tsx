"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

interface CheckoutSuccessToastProps {
  planName: string
}

export function CheckoutSuccessToast({ planName }: CheckoutSuccessToastProps) {
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    toast.success(`Your subscription is active! Welcome to Operion ${planName}.`, {
      duration: 6000,
    })

    // Clean the ?checkout=success param from the URL without triggering navigation
    const url = new URL(window.location.href)
    url.searchParams.delete("checkout")
    window.history.replaceState({}, "", url.toString())
  }, [planName])

  return null
}
