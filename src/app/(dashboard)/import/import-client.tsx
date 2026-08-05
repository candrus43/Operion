"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Calendar,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  AlertCircle,
  Table2,
  Sparkles,
  Brain,
} from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

// ── Type definitions ──────────────────────────────────────────
type ImportType = "tasks" | "contacts" | "projects" | "documents" | "entities"

const importTypes: { value: ImportType; label: string }[] = [
  { value: "tasks", label: "Tasks" },
  { value: "contacts", label: "Contacts" },
  { value: "projects", label: "Projects" },
  { value: "documents", label: "Documents" },
  { value: "entities", label: "Entities" },
]

const fieldDefinitions: Record<ImportType, { required: string[]; optional: string[] }> = {
  tasks: {
    required: ["title"],
    optional: ["description", "status", "priority", "dueDate", "category", "notes", "projectId", "entityId", "assigneeId"],
  },
  contacts: {
    required: ["name"],
    optional: ["company", "position", "phone", "email", "notes", "entityId"],
  },
  projects: {
    required: ["name"],
    optional: ["description", "status", "phase", "progress", "budget", "startDate", "targetDate", "entityId"],
  },
  documents: {
    required: ["name"],
    optional: ["type", "url", "projectId", "entityId"],
  },
  entities: {
    required: ["name"],
    optional: ["type", "metadata"],
  },
}

const fieldLabels: Record<string, string> = {
  title: "Title",
  name: "Name",
  description: "Description",
  status: "Status",
  priority: "Priority",
  dueDate: "Due Date",
  category: "Category",
  notes: "Notes",
  projectId: "Project ID",
  entityId: "Entity ID",
  assigneeId: "Assignee ID",
  company: "Company",
  position: "Position",
  phone: "Phone",
  email: "Email",
  phase: "Phase",
  progress: "Progress",
  budget: "Budget",
  startDate: "Start Date",
  targetDate: "Target Date",
  type: "Type",
  url: "URL",
  metadata: "Metadata",
}

interface ImportResult {
  success: number
  failed: number
  errors: { row: number; message: string }[]
}

// ── ICS parser ────────────────────────────────────────────────
interface ICSEvent {
  title: string
  date: string
  location?: string
  description?: string
}

function parseICSClient(icsText: string): ICSEvent[] {
  const events: ICSEvent[] = []
  const blocks = icsText.split("BEGIN:VEVENT")
  blocks.shift()

  for (const block of blocks) {
    const endIndex = block.indexOf("END:VEVENT")
    if (endIndex === -1) continue
    const eventText = block.substring(0, endIndex)

    const event: ICSEvent = {
      title: "Untitled Event",
      date: new Date().toISOString(),
    }

    const summaryMatch = eventText.match(/^SUMMARY(?:\;.*?)?:(.+)$/m)
    if (summaryMatch) {
      event.title = summaryMatch[1].replace(/\\,/g, ",").replace(/\\n/g, "\n").replace(/\\;/g, ";").trim()
    }

    const dtstartMatch = eventText.match(/^DTSTART(?:\;.*?)?:(\d{8}T?\d{6}Z?)/m)
    if (dtstartMatch) {
      let ds = dtstartMatch[1]
      const year = ds.substring(0, 4)
      const month = ds.substring(4, 6)
      const day = ds.substring(6, 8)
      if (ds.length >= 15) {
        const hour = ds.substring(9, 11)
        const min = ds.substring(11, 13)
        const sec = ds.substring(13, 15)
        event.date = `${year}-${month}-${day}T${hour}:${min}:${sec}${ds.endsWith("Z") ? "Z" : ""}`
      } else {
        event.date = `${year}-${month}-${day}T00:00:00Z`
      }
    }

    const locationMatch = eventText.match(/^LOCATION(?:\;.*?)?:(.+)$/m)
    if (locationMatch) {
      event.location = locationMatch[1].replace(/\\,/g, ",").replace(/\\n/g, "\n").replace(/\\;/g, ";").trim()
    }

    const descMatch = eventText.match(/^DESCRIPTION(?:\;.*?)?:(.+)(?:\r?\n\s.+)*/m)
    if (descMatch) {
      event.description = descMatch[1].replace(/\\,/g, ",").replace(/\\n/g, "\n").replace(/\\;/g, ";").trim()
    }

    events.push(event)
  }

  return events
}

// ── Smart auto-map ────────────────────────────────────────────
function smartAutoMap(headers: string[], type: ImportType): Record<string, string> {
  const fields = [...fieldDefinitions[type].required, ...fieldDefinitions[type].optional]
  const mappings: Record<string, string> = {}

  for (const header of headers) {
    const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, "")

    // Exact match
    for (const field of fields) {
      if (normalized === field.toLowerCase()) {
        mappings[field] = header
        break
      }
    }

    if (mappings[Object.keys(mappings).find(k => mappings[k] === header)!]) continue

    // Common name variants
    const aliases: Record<string, string[]> = {
      title: ["task", "taskname", "subject", "todo"],
      name: ["fullname", "contact", "contactname"],
      description: ["desc", "details", "body"],
      dueDate: ["duedate", "deadline", "date", "enddate"],
      priority: ["importance", "urgency"],
      status: ["state", "progressstatus"],
      company: ["organization", "org", "business"],
      position: ["jobtitle", "title", "role"],
      phone: ["phonenumber", "mobile", "cell", "telephone"],
      email: ["emailaddress", "e-mail", "mail"],
      type: ["doctype", "documenttype", "category"],
      url: ["link", "website", "path"],
      startDate: ["start", "startdate", "begindate"],
      targetDate: ["end", "enddate", "completiondate", "deadline"],
      budget: ["amount", "cost", "estimatedcost"],
      progress: ["completion", "percentcomplete", "pctcomplete"],
    }

    for (const [field, aliasesList] of Object.entries(aliases)) {
      if (aliasesList.some(a => normalized === a || normalized.includes(a))) {
        mappings[field] = header
        break
      }
    }
  }

  return mappings
}

// ── Main component ────────────────────────────────────────────
export function ImportClient() {
  // CSV/Excel state
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])
  const [allRows, setAllRows] = useState<Record<string, string>[]>([])
  const [importType, setImportType] = useState<ImportType>("tasks")
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [step, setStep] = useState<"upload" | "map" | "result">("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ICS state
  const [icsFile, setIcsFile] = useState<File | null>(null)
  const [icsEvents, setIcsEvents] = useState<ICSEvent[]>([])
  const [icsImporting, setIcsImporting] = useState(false)
  const [icsResult, setIcsResult] = useState<ImportResult | null>(null)

  // Drag state
  const [dragOver, setDragOver] = useState(false)
  const [icsDragOver, setIcsDragOver] = useState(false)

  // AI import state
  const [aiFiles, setAiFiles] = useState<File[]>([])
  const [aiImporting, setAiImporting] = useState(false)
  const [aiProgress, setAiProgress] = useState("")
  const [aiResult, setAiResult] = useState<{
    summary: { entities: number; contacts: number; projects: number; tasks: number }
    created: { entities: { id: string; name: string }[]; contacts: any[]; projects: { id: string; name: string }[]; tasks: { id: string; title: string }[] }
    errors?: string[]
  } | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiDragOver, setAiDragOver] = useState(false)
  const aiInputRef = useRef<HTMLInputElement>(null)

  // ── CSV/Excel file handling ──────────────────────────────────
  const parseFile = useCallback((file: File) => {
    setFile(file)
    setResult(null)
    setStep("upload")

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" })

        if (json.length === 0) {
          toast.error("The file contains no data rows")
          return
        }

        const hdrs = Object.keys(json[0])
        setHeaders(hdrs)
        setPreviewRows(json.slice(0, 10))
        setAllRows(json)

        // Auto-map
        const autoMappings = smartAutoMap(hdrs, importType)
        setMappings(autoMappings)

        setStep("map")
      } catch (err: any) {
        toast.error("Failed to parse file. Make sure it's a valid CSV or Excel file.")
      }
    }
    reader.readAsArrayBuffer(file)
  }, [importType])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) {
      parseFile(f)
    } else {
      toast.error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)")
    }
  }, [parseFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) parseFile(f)
  }, [parseFile])

  const handleMappingChange = (field: string, value: string) => {
    setMappings(prev => ({ ...prev, [field]: value === "none" ? "" : value }))
  }

  const handleImport = async () => {
    setImporting(true)
    setResult(null)

    try {
      const mappedData = allRows.map(row => {
        const mapped: Record<string, string> = {}
        for (const [field, csvCol] of Object.entries(mappings)) {
          if (csvCol) {
            mapped[csvCol] = row[csvCol] || ""
          }
        }
        return mapped
      })

      const res = await fetch("/api/import/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: importType, mappings, data: mappedData }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Import failed")
      }

      setResult(data)
      setStep("result")
      toast.success(`Imported ${data.success} records successfully`)
    } catch (err: any) {
      toast.error(err.message || "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const resetCsv = () => {
    setFile(null)
    setHeaders([])
    setPreviewRows([])
    setAllRows([])
    setMappings({})
    setResult(null)
    setStep("upload")
  }

  // ── ICS handling ─────────────────────────────────────────────
  const handleIcsFile = useCallback((file: File) => {
    setIcsFile(file)
    setIcsResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target!.result as string
        const parsed = parseICSClient(text)
        if (parsed.length === 0) {
          toast.error("No events found in this ICS file")
          return
        }
        setIcsEvents(parsed)
      } catch {
        toast.error("Failed to parse ICS file")
      }
    }
    reader.readAsText(file)
  }, [])

  const handleIcsDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIcsDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.endsWith(".ics")) {
      handleIcsFile(f)
    } else {
      toast.error("Please upload an ICS file (.ics)")
    }
  }, [handleIcsFile])

  const handleIcsSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleIcsFile(f)
  }, [handleIcsFile])

  const handleIcsImport = async () => {
    setIcsImporting(true)
    setIcsResult(null)

    try {
      const icsContent = await icsFile!.text()

      const res = await fetch("/api/import/ics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icsContent }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Import failed")
      }

      setIcsResult(data)
      toast.success(`Imported ${data.success} calendar events`)
    } catch (err: any) {
      toast.error(err.message || "Calendar import failed")
    } finally {
      setIcsImporting(false)
    }
  }

  const resetIcs = () => {
    setIcsFile(null)
    setIcsEvents([])
    setIcsResult(null)
  }

  // ── AI import handling ────────────────────────────────────────
  const handleAiFiles = useCallback((files: File[]) => {
    const validFiles = files.filter(f => {
      const name = f.name.toLowerCase()
      return name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")
    })
    if (validFiles.length === 0) {
      toast.error("Please upload CSV, XLSX, or XLS files")
      return
    }
    if (validFiles.length !== files.length) {
      toast.warning("Some files were skipped — only CSV, XLSX, or XLS files are accepted")
    }
    setAiFiles(prev => [...prev, ...validFiles])
    setAiResult(null)
    setAiError(null)
  }, [])

  const handleAiDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setAiDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleAiFiles(droppedFiles)
  }, [handleAiFiles])

  const handleAiSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    handleAiFiles(selectedFiles)
    // Reset input so re-selecting the same file works
    e.target.value = ""
  }, [handleAiFiles])

  const removeAiFile = useCallback((index: number) => {
    setAiFiles(prev => prev.filter((_, i) => i !== index))
    setAiResult(null)
    setAiError(null)
  }, [])

  const resetAi = () => {
    setAiFiles([])
    setAiResult(null)
    setAiError(null)
    setAiProgress("")
  }

  const handleAiImport = async () => {
    if (aiFiles.length === 0) return
    setAiImporting(true)
    setAiResult(null)
    setAiError(null)

    try {
      // Step 1: Parse files
      setAiProgress("Parsing files...")
      const formData = new FormData()
      for (const file of aiFiles) {
        formData.append("files", file)
      }

      // Step 2: AI analysis
      setAiProgress("AI analyzing your spreadsheet data...")
      const res = await fetch("/api/import/ai", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.details || data.error || "AI import failed")
      }

      // Step 3: Creating records
      setAiProgress("Creating records in database...")

      setAiResult(data)

      const summary = data.summary
      const total = summary.entities + summary.contacts + summary.projects + summary.tasks
      const parts: string[] = []
      if (summary.entities > 0) parts.push(`${summary.entities} entities`)
      if (summary.contacts > 0) parts.push(`${summary.contacts} contacts`)
      if (summary.projects > 0) parts.push(`${summary.projects} projects`)
      if (summary.tasks > 0) parts.push(`${summary.tasks} tasks`)
      
      if (total > 0) {
        toast.success(`Created ${parts.join(", ")}`)
      } else {
        toast.warning("No records were created. The AI didn't find recognizable data.")
      }
    } catch (err: any) {
      setAiError(err.message || "AI import failed")
      toast.error(err.message || "AI import failed")
    } finally {
      setAiImporting(false)
      setAiProgress("")
    }
  }

  const icsInputRef = useRef<HTMLInputElement>(null)

  // ── Render ────────────────────────────────────────────────────
  const fields = [...fieldDefinitions[importType].required, ...fieldDefinitions[importType].optional]
  const requiredFields = fieldDefinitions[importType].required

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
          <Upload className="h-5 w-5 text-sky-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import Data</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Import your existing data from CSV, Excel, or calendar exports.
          </p>
        </div>
      </div>

      <Tabs defaultValue="csv" className="w-full">
        <TabsList className="glass border border-white/[0.05]">
          <TabsTrigger value="csv" className="data-[state=active]:bg-white/[0.04]">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV / Excel
          </TabsTrigger>
          <TabsTrigger value="ics" className="data-[state=active]:bg-white/[0.04]">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar (ICS)
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-white/[0.04]">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Import
          </TabsTrigger>
        </TabsList>

        {/* ── CSV / Excel Tab ─────────────────────────────────── */}
        <TabsContent value="csv" className="mt-0">
          <div className="space-y-6 pt-4">
            {/* Step 1: Upload */}
            {step === "upload" && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Upload File</CardTitle>
                  <CardDescription>Upload a CSV, XLSX, or XLS file to import your data.</CardDescription>
                </CardHeader>
                <CardContent>
                  {!file ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleFileDrop}
                      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
                        dragOver
                          ? "border-sky-400/50 bg-sky-400/5"
                          : "border-white/[0.06] hover:border-white/[0.12]"
                      }`}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 mb-4">
                        <FileSpreadsheet className="h-7 w-7 text-sky-400" />
                      </div>
                      <p className="text-sm font-medium">Drop your file here</p>
                      <p className="text-xs text-muted-foreground mt-1 mb-4">
                        CSV, XLSX, or XLS files supported
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5 mr-2" />
                        Choose File
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl bg-white/[0.04] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10">
                          <FileSpreadsheet className="h-4 w-4 text-sky-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB • {allRows.length} rows
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={resetCsv}>
                        Remove
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Map */}
            {step === "map" && (
              <>
                {/* Import type selector */}
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">What are you importing?</CardTitle>
                    <CardDescription>Select the type of data in your file.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {importTypes.map((t) => (
                        <Button
                          key={t.value}
                          variant={importType === t.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setImportType(t.value)
                            if (headers.length > 0) {
                              setMappings(smartAutoMap(headers, t.value))
                            }
                          }}
                          className={importType === t.value ? "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border-sky-500/30" : "border-white/[0.06]"}
                        >
                          {t.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Preview table */}
                <Card className="glass">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Preview ({previewRows.length} of {allRows.length} rows)</CardTitle>
                      <CardDescription>Map your columns to Operion fields below.</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-white/[0.06]">
                      {file?.name}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white/[0.04]">
                            {headers.map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, ri) => (
                            <tr key={ri} className="border-t border-white/[0.03]">
                              {headers.map((h) => (
                                <td key={h} className="px-3 py-2 text-foreground/70 whitespace-nowrap max-w-[200px] truncate">
                                  {row[h] || "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {previewRows.length < allRows.length && (
                            <tr>
                              <td colSpan={headers.length} className="px-3 py-1.5 text-center text-muted-foreground/50">
                                +{allRows.length - previewRows.length} more rows not shown
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Column mapping */}
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Column Mapping</CardTitle>
                    <CardDescription>
                      Map each Operion field to a column from your file.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {fields.map((field) => {
                      const isRequired = requiredFields.includes(field)
                      return (
                        <div key={field} className="flex items-center gap-3">
                          <div className="w-40 shrink-0 flex items-center gap-1.5">
                            <span className="text-sm text-foreground/80">{fieldLabels[field] || field}</span>
                            {isRequired && (
                              <span className="text-[10px] text-red-400">*</span>
                            )}
                          </div>
                          <span className="text-muted-foreground/30">→</span>
                          <Select
                            value={mappings[field] || "none"}
                            onValueChange={(v) => handleMappingChange(field, v)}
                          >
                            <SelectTrigger className="flex-1 bg-white/[0.04] border-0 text-sm">
                              <SelectValue placeholder="Skip this field" />
                            </SelectTrigger>
                            <SelectContent className="bg-white/[0.04] border border-white/[0.05]">
                              <SelectItem value="none">— Skip —</SelectItem>
                              {headers.map((h) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {mappings[field] && (
                            <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-400 border-sky-500/20 shrink-0">
                              mapped
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                {/* Mapped preview */}
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Mapped Preview</CardTitle>
                    <CardDescription>First 3 rows after applying your mapping.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white/[0.04]">
                            {fields.filter(f => mappings[f]).map((f) => (
                              <th key={f} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                                {fieldLabels[f] || f}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {allRows.slice(0, 3).map((row, ri) => (
                            <tr key={ri} className="border-t border-white/[0.03]">
                              {fields.filter(f => mappings[f]).map((f) => (
                                <td key={f} className="px-3 py-2 text-foreground/70 whitespace-nowrap max-w-[200px] truncate">
                                  {row[mappings[f]] || "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <Button onClick={handleImport} disabled={importing || !mappings.title && !mappings.name} className="gap-2">
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {importing ? "Importing..." : `Import ${allRows.length} ${importType}`}
                  </Button>
                  <Button variant="ghost" onClick={resetCsv}>Cancel</Button>
                </div>
              </>
            )}

            {/* Step 3: Result */}
            {step === "result" && result && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Import Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-400">{result.success}</p>
                        <p className="text-[11px] text-muted-foreground">Imported</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                        <XCircle className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-red-400">{result.failed}</p>
                        <p className="text-[11px] text-muted-foreground">Failed</p>
                      </div>
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="rounded-lg bg-white/[0.04] p-4 space-y-2 max-h-48 overflow-y-auto">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Error Details</p>
                      {result.errors.map((err, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-red-400 font-medium">Row {err.row}:</span>{" "}
                            <span className="text-foreground/60">{err.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <Button onClick={resetCsv} variant="outline" size="sm" className="gap-2">
                      <Upload className="h-3.5 w-3.5" />
                      Import Another File
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state when no file loaded and not in other steps */}
            {step === "upload" && !file && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  Upload a CSV, Excel, or ICS file to get started.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── ICS Calendar Tab ─────────────────────────────────── */}
        <TabsContent value="ics" className="mt-0">
          <div className="space-y-6 pt-4">
            {!icsFile ? (
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Upload Calendar File</CardTitle>
                  <CardDescription>
                    Import events from an ICS file (Outlook, Google Calendar, Apple Calendar export).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIcsDragOver(true) }}
                    onDragLeave={() => setIcsDragOver(false)}
                    onDrop={handleIcsDrop}
                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
                      icsDragOver
                        ? "border-sky-400/50 bg-sky-400/5"
                        : "border-white/[0.06] hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 mb-4">
                      <Calendar className="h-7 w-7 text-purple-400" />
                    </div>
                    <p className="text-sm font-medium">Drop your ICS file here</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      .ics files from Outlook, Google Calendar, or Apple Calendar
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => icsInputRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5 mr-2" />
                      Choose ICS File
                    </Button>
                    <input
                      ref={icsInputRef}
                      type="file"
                      accept=".ics"
                      onChange={handleIcsSelect}
                      className="hidden"
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* ICS Preview */}
                <Card className="glass">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Events Preview</CardTitle>
                      <CardDescription>
                        {icsEvents.length} events found in{" "}
                        <span className="text-foreground/70">{icsFile.name}</span>
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetIcs}>Change File</Button>
                  </CardHeader>
                  <CardContent>
                    {icsResult ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-lg font-bold text-emerald-400">{icsResult.success}</p>
                              <p className="text-[11px] text-muted-foreground">Imported</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                              <XCircle className="h-4 w-4 text-red-400" />
                            </div>
                            <div>
                              <p className="text-lg font-bold text-red-400">{icsResult.failed}</p>
                              <p className="text-[11px] text-muted-foreground">Failed</p>
                            </div>
                          </div>
                        </div>

                        {icsResult.errors.length > 0 && (
                          <div className="rounded-lg bg-white/[0.04] p-4 space-y-2 max-h-48 overflow-y-auto">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Error Details</p>
                            {icsResult.errors.map((err, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-red-400 font-medium">Event {err.row}:</span>{" "}
                                  <span className="text-foreground/60">{err.message}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <Button onClick={resetIcs} variant="outline" size="sm" className="gap-2">
                          <Upload className="h-3.5 w-3.5" />
                          Import Another Calendar
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-white/[0.06] max-h-64 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0">
                            <tr className="bg-white/[0.04]">
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Title</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Location</th>
                            </tr>
                          </thead>
                          <tbody>
                            {icsEvents.map((evt, i) => (
                              <tr key={i} className="border-t border-white/[0.03]">
                                <td className="px-3 py-2 text-foreground/80 max-w-[250px] truncate">{evt.title}</td>
                                <td className="px-3 py-2 text-foreground/60 whitespace-nowrap">
                                  {new Date(evt.date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    ...(evt.date.includes("T") ? { hour: "numeric", minute: "2-digit" } : {}),
                                  })}
                                </td>
                                <td className="px-3 py-2 text-foreground/60 max-w-[200px] truncate">
                                  {evt.location || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {!icsResult && (
                  <div className="flex items-center gap-3">
                    <Button onClick={handleIcsImport} disabled={icsImporting || icsEvents.length === 0} className="gap-2">
                      {icsImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                      {icsImporting ? "Importing..." : `Import ${icsEvents.length} Events`}
                    </Button>
                    <Button variant="ghost" onClick={resetIcs}>Cancel</Button>
                  </div>
                )}
              </>
            )}

            {!icsFile && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  Upload a .ics file to import calendar events from Outlook or other calendar apps.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── AI Import Tab ───────────────────────────────────── */}
        <TabsContent value="ai" className="mt-0">
          <div className="space-y-6 pt-4">
            {/* Upload zone */}
            {!aiImporting && !aiResult && !aiError && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">AI-Powered Import</CardTitle>
                  <CardDescription>
                    Upload Excel or CSV files and let AI automatically detect entities, contacts, projects, and tasks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setAiDragOver(true) }}
                    onDragLeave={() => setAiDragOver(false)}
                    onDrop={handleAiDrop}
                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
                      aiDragOver
                        ? "border-purple-400/50 bg-purple-400/5"
                        : "border-white/[0.06] hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 mb-4">
                      <Brain className="h-7 w-7 text-purple-400" />
                    </div>
                    <p className="text-sm font-medium">Drop spreadsheets here</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      .csv, .xlsx, or .xls — AI will figure out the rest
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => aiInputRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5 mr-2" />
                      Choose Files
                    </Button>
                    <input
                      ref={aiInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      multiple
                      onChange={handleAiSelect}
                      className="hidden"
                    />
                  </div>

                  {/* File list */}
                  {aiFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {aiFiles.length} file{aiFiles.length > 1 ? "s" : ""} selected
                      </p>
                      {aiFiles.map((file, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                              <FileSpreadsheet className="h-4 w-4 text-purple-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAiFile(i)}
                            className="text-muted-foreground hover:text-red-400"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {aiFiles.length > 0 && (
                    <Button
                      onClick={handleAiImport}
                      className="w-full gap-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30"
                    >
                      <Sparkles className="h-4 w-4" />
                      Analyze &amp; Import
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Progress */}
            {aiImporting && (
              <Card className="glass">
                <CardContent className="py-10">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10">
                      <Loader2 className="h-7 w-7 text-purple-400 animate-spin" />
                    </div>
                    <p className="text-sm font-medium">{aiProgress || "Processing..."}</p>
                    <p className="text-xs text-muted-foreground">
                      This may take a moment while the AI analyzes your data
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Success */}
            {aiResult && !aiImporting && (
              <>
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Import Complete</CardTitle>
                    <CardDescription>
                      AI analyzed your spreadsheet{aiFiles.length > 1 ? "s" : ""} and created the following records.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Summary grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {aiResult.summary.entities > 0 && (
                        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
                            <Table2 className="h-4 w-4 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-indigo-400">{aiResult.summary.entities}</p>
                            <p className="text-[11px] text-muted-foreground">Entities</p>
                          </div>
                        </div>
                      )}
                      {aiResult.summary.contacts > 0 && (
                        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-cyan-400">{aiResult.summary.contacts}</p>
                            <p className="text-[11px] text-muted-foreground">Contacts</p>
                          </div>
                        </div>
                      )}
                      {aiResult.summary.projects > 0 && (
                        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                            <ArrowRight className="h-4 w-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-amber-400">{aiResult.summary.projects}</p>
                            <p className="text-[11px] text-muted-foreground">Projects</p>
                          </div>
                        </div>
                      )}
                      {aiResult.summary.tasks > 0 && (
                        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-emerald-400">{aiResult.summary.tasks}</p>
                            <p className="text-[11px] text-muted-foreground">Tasks</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {aiResult.errors && aiResult.errors.length > 0 && (
                      <div className="rounded-lg bg-white/[0.04] p-4 space-y-2 max-h-48 overflow-y-auto">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Warnings</p>
                        {aiResult.errors.map((err, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                            <span className="text-foreground/60">{err}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <Button onClick={resetAi} variant="outline" size="sm" className="gap-2">
                        <Upload className="h-3.5 w-3.5" />
                        Import More Files
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/home">Go to Dashboard →</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Error */}
            {aiError && !aiImporting && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-red-400">Import Failed</CardTitle>
                  <CardDescription>
                    Something went wrong while processing your files.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-4">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-300/80">{aiError}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={handleAiImport} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Retry
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetAi}>
                      Try Different Files
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {!aiImporting && !aiResult && !aiError && aiFiles.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  Drop any spreadsheet and let AI parse it automatically — no column mapping needed.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
