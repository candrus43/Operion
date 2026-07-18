import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { SearchContent } from "./search-content"

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
