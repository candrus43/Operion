"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { priorityColor, statusColor, projectStatusColor, phaseColor, docTypeColor, docTypeLabel } from "@/lib/colors"
import {
  FolderKanban,
  CheckSquare,
  FileText,
  Users,
  Info,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building2,
} from "lucide-react"

type Tabs = "overview" | "projects" | "tasks" | "documents" | "contacts"

interface EntityTabsProps {
  entity: any
}

const tabDefs: { key: Tabs; label: string; icon: typeof Info }[] = [
  { key: "overview", label: "Overview", icon: Info },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "contacts", label: "Contacts", icon: Users },
]


export function EntityTabs({ entity }: EntityTabsProps) {
  const [activeTab, setActiveTab] = useState<Tabs>("overview")
  let metadata: Record<string, any> = {}
  try { metadata = JSON.parse(entity.metadata) } catch {}

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex items-center gap-1 border-b border-white/[0.05] pb-0 mb-6 overflow-x-auto">
        {tabDefs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
              activeTab === tab.key
                ? "text-white border-b-2 border-white -mb-[1px]"
                : "text-muted-foreground hover:text-foreground/70"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.key !== "overview" && (
              <span className="text-[10px] text-muted-foreground ml-1">
                {tab.key === "projects" && entity.projects.length}
                {tab.key === "tasks" && entity.tasks.length}
                {tab.key === "documents" && entity.documents.length}
                {tab.key === "contacts" && entity.contacts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Entity Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{entity.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm font-medium">{entity.type.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm font-medium">
                    {new Date(entity.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                  <span className="text-sm text-muted-foreground">Updated</span>
                  <span className="text-sm font-medium">
                    {new Date(entity.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(metadata).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No metadata defined for this entity.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(metadata).map(([key, val]) => (
                      <div key={key} className="flex justify-between py-1.5 border-b border-white/[0.03]">
                        <span className="text-sm text-muted-foreground capitalize">{key}</span>
                        <span className="text-sm font-medium">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Summary */}
            <Card className="glass md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Activity Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="text-center rounded-xl bg-white/[0.04] p-4">
                    <div className="text-2xl font-bold">{entity._count?.projects || entity.projects.length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Active Projects</div>
                  </div>
                  <div className="text-center rounded-xl bg-white/[0.04] p-4">
                    <div className="text-2xl font-bold">
                      {entity.tasks.filter((t: any) => t.status !== "DONE").length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Open Tasks</div>
                  </div>
                  <div className="text-center rounded-xl bg-white/[0.04] p-4">
                    <div className="text-2xl font-bold">
                      {entity.tasks.filter((t: any) => t.priority === "CRITICAL" && t.status !== "DONE").length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Critical Items</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="space-y-3">
            {entity.projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] mb-4">
                  <FolderKanban className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">No projects yet</p>
                <p className="text-sm text-muted-foreground mt-1">Projects linked to this entity will appear here.</p>
              </div>
            ) : (
              entity.projects.map((project: any) => (
                <Card key={project.id} className="glass hover:bg-white/[0.07] transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">{project.name}</CardTitle>
                        {project.description && (
                          <CardDescription className="text-xs mt-1 line-clamp-1">{project.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", projectStatusColor(project.status))}>
                        {project.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{project.progress}% complete</span>
                        <span className="text-muted-foreground">{project.phase?.replace("_", " ")}</span>
                      </div>
                      <Progress value={project.progress} className="h-1.5" />
                      {(project.startDate || project.targetDate) && (
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          {project.startDate && (
                            <span>Start: {new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          )}
                          {project.targetDate && (
                            <span>Target: {new Date(project.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="space-y-2">
            {entity.tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] mb-4">
                  <CheckSquare className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">No tasks yet</p>
                <p className="text-sm text-muted-foreground mt-1">Tasks linked to this entity will appear here.</p>
              </div>
            ) : (
              entity.tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg glass hover:bg-white/[0.07] transition-colors p-3 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", priorityColor(task.priority))}>
                        {task.priority}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(task.status))}>
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {task.project && (
                        <span className="text-[11px] text-muted-foreground/60">{task.project.name}</span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                  {task.assignee && (
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="text-[10px] bg-[#222]">
                        {task.assignee.name?.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="space-y-2">
            {entity.documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] mb-4">
                  <FileText className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">No documents yet</p>
                <p className="text-sm text-muted-foreground mt-1">Documents linked to this entity will appear here.</p>
              </div>
            ) : (
              entity.documents.map((doc: any) => {
                const dc = docTypeColor(doc.type)
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg glass hover:bg-white/[0.07] transition-colors p-3 cursor-pointer"
                  >
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", dc)}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", dc)}>
                          {doc.type.replace("_", " ")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === "contacts" && (
          <div className="space-y-2">
            {entity.contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] mb-4">
                  <Users className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">No contacts yet</p>
                <p className="text-sm text-muted-foreground mt-1">Contacts linked to this entity will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {entity.contacts.map((contact: any) => (
                  <Card key={contact.id} className="glass hover:bg-white/[0.07] transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="text-xs bg-[#222]">
                            {contact.name?.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{contact.name}</p>
                          {contact.position && (
                            <p className="text-[11px] text-muted-foreground truncate">{contact.position}</p>
                          )}
                          {contact.company && (
                            <p className="text-[11px] text-muted-foreground/60 truncate">{contact.company}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-white/[0.03]">
                        {contact.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
