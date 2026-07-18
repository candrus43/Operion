"use client"

import { useState, useRef, useCallback } from "react"
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
import { ArrowLeft, FileText, Loader2, Upload, X, Paperclip } from "lucide-react"
import { toast } from "sonner"

type Entity = { id: string; name: string }
type Project = { id: string; name: string }

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

interface DocumentFormProps {
  entities: Entity[]
  projects: Project[]
  document?: any
  isEdit?: boolean
}

export function DocumentForm({ entities, projects, document, isEdit }: DocumentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [name, setName] = useState(document?.name || "")
  const [type, setType] = useState(document?.type || "CONTRACT")
  const [url, setUrl] = useState(document?.url || "")
  const [projectId, setProjectId] = useState(document?.projectId || "")
  const [entityId, setEntityId] = useState(document?.entityId || "")

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<{
    name: string
    size: number
    path: string
  } | null>(
    document?.filePath
      ? { name: document.name, size: 0, path: document.filePath }
      : null
  )
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (file: File) => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error("File exceeds 10MB limit")
      return
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/png",
      "image/jpeg",
      "text/plain",
    ]

    if (!allowedTypes.includes(file.type)) {
      toast.error("File type not supported. Accepted: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, TXT")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Upload failed")
      }

      const data = await res.json()
      setUploadedFile({
        name: file.name,
        size: file.size,
        path: data.url,
      })
      toast.success("File uploaded")
    } catch (err: any) {
      toast.error(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const removeFile = () => {
    setUploadedFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !type) return

    setLoading(true)
    try {
      const body = {
        name: name.trim(),
        type,
        url: url.trim() || null,
        filePath: uploadedFile?.path || null,
        projectId: projectId || null,
        entityId: entityId || null,
      }

      const fetchUrl = isEdit ? `/api/documents/${document.id}` : "/api/documents"
      const method = isEdit ? "PATCH" : "POST"

      const res = await fetch(fetchUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save document")
      }

      const result = await res.json()
      toast.success(isEdit ? "Document updated" : "Document created")
      router.push(`/documents/${result.id}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to save document")
    } finally {
      setLoading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={isEdit ? `/documents/${document?.id}` : "/documents"}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Edit Document" : "New Document"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit ? "Update document details." : "Add a document to your organization."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-0 bg-[#111111]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
                <FileText className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <CardTitle>{isEdit ? document?.name || "Edit Document" : "Document Details"}</CardTitle>
                <CardDescription>Fill in the document information below.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Grand Hotel Purchase Agreement.pdf"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#1a1a1a] border-0"
                required
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>File</Label>
              {uploadedFile ? (
                <div className="flex items-center justify-between rounded-lg bg-[#1a1a1a] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
                      <Paperclip className="h-4 w-4 text-sky-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[300px]">{uploadedFile.name}</p>
                      {uploadedFile.size > 0 && (
                        <p className="text-[11px] text-muted-foreground">{formatSize(uploadedFile.size)}</p>
                      )}
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={removeFile} className="h-7 w-7">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer ${
                    dragOver
                      ? "border-sky-400/50 bg-sky-400/5"
                      : "border-white/[0.06] hover:border-white/[0.12] bg-[#1a1a1a]"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-5 w-5 text-sky-400 animate-spin" />
                      <p className="text-xs text-muted-foreground">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 mb-2">
                        <Upload className="h-4 w-4 text-sky-400" />
                      </div>
                      <p className="text-xs font-medium">Drop file or click to upload</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, TXT (max 10MB)
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Type + URL row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type" className="bg-[#1a1a1a] border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://drive.example.com/doc.pdf"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="bg-[#1a1a1a] border-0"
                />
                <p className="text-[11px] text-muted-foreground/50">
                  Link to an external document (e.g. Google Drive, Dropbox)
                </p>
              </div>
            </div>

            {/* Project + Entity */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="projectId">Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="projectId" className="bg-[#1a1a1a] border-0">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={loading || !name.trim() || uploading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Create Document"}
              </Button>
              <Link href={isEdit ? `/documents/${document?.id}` : "/documents"}>
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
