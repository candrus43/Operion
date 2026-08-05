"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  UserPlus,
  Trash2,
  Shield,
  Loader2,
  Mail,
  Crown,
  Briefcase,
  Building2,
  User,
  Eye,
  AlertCircle,
  Check,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { SettingsNav } from "../settings-nav"

interface UserData {
  id: string
  name: string
  email: string
  image: string | null
  role: string
  createdAt: string
}

interface TeamPageProps {
  currentUserId: string
  currentUserRole: string
  orgId: string
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Shield; color: string; description: string }> = {
  OWNER: {
    label: "Owner",
    icon: Crown,
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    description: "Full access to all features, billing, and team management",
  },
  EXECUTIVE_ASSISTANT: {
    label: "EA",
    icon: Briefcase,
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    description: "Task management, scheduling, and team coordination",
  },
  OPERATIONS_MANAGER: {
    label: "Ops Manager",
    icon: Building2,
    color: "text-green-400 border-green-500/30 bg-green-500/10",
    description: "Project and entity operations management",
  },
  STAFF: {
    label: "Staff",
    icon: User,
    color: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
    description: "Basic task assignment and document access",
  },
  READ_ONLY: {
    label: "Read Only",
    icon: Eye,
    color: "text-zinc-500 border-zinc-500/30 bg-zinc-500/10",
    description: "View-only access to the workspace",
  },
}

export function TeamPage({ currentUserId, currentUserRole, orgId }: TeamPageProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)

  // Invite form
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("STAFF")

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error("Failed to fetch users:", err)
      toast.error("Failed to load team members")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error("Name and email are required")
      return
    }

    setInviting(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to invite user")
        return
      }

      setUsers((prev) => [...prev, data])
      setInviteOpen(false)
      setInviteName("")
      setInviteEmail("")
      setInviteRole("STAFF")

      if (data.inviteEmailSent) {
        toast.success(`${data.name} has been invited!`)
      } else {
        toast.success(`${data.name} added. Email not sent — share the login link directly.`, {
          duration: 6000,
        })
      }
    } catch (err) {
      console.error("Invite failed:", err)
      toast.error("Failed to invite user")
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRoleId(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to update role")
        return
      }

      const updated = await res.json()
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u))
      )
      toast.success(`Role updated to ${ROLE_CONFIG[newRole]?.label || newRole}`)
    } catch (err) {
      console.error("Role update failed:", err)
      toast.error("Failed to update role")
    } finally {
      setUpdatingRoleId(null)
    }
  }

  const handleRemove = async (userId: string) => {
    setRemovingId(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to remove user")
        return
      }

      const data = await res.json()
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      toast.success(`${data.removed?.name || "User"} has been removed`)
    } catch (err) {
      console.error("Remove failed:", err)
      toast.error("Failed to remove user")
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-8">
      <SettingsNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization members and their roles.
          </p>
        </div>
        {currentUserRole === "OWNER" && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-black hover:bg-zinc-200">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="border-[#262626] glass sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Add someone to your organization. They&apos;ll receive an email invitation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Name</Label>
                  <Input
                    id="invite-name"
                    placeholder="Jane Smith"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="border-[#262626] bg-[#0d0d0d]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="jane@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="border-[#262626] bg-[#0d0d0d]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger
                      id="invite-role"
                      className="border-[#262626] bg-[#0d0d0d]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[#262626] glass">
                      <SelectItem value="EXECUTIVE_ASSISTANT">EA (Executive Assistant)</SelectItem>
                      <SelectItem value="OPERATIONS_MANAGER">Ops Manager</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="READ_ONLY">Read Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                  className="border-[#262626] bg-white/[0.04] hover:bg-[#222]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviting || !inviteName.trim() || !inviteEmail.trim()}
                  className="bg-white text-black hover:bg-zinc-200"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Separator className="bg-[#262626]" />

      {/* Team Members Table */}
      <Card className="border-[#262626] glass">
        <CardHeader>
          <CardTitle className="text-lg">Members</CardTitle>
          <CardDescription>
            {users.length} member{users.length !== 1 ? "s" : ""} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#262626] hover:bg-transparent">
                <TableHead className="text-muted-foreground">Member</TableHead>
                <TableHead className="text-muted-foreground">Role</TableHead>
                <TableHead className="text-muted-foreground hidden sm:table-cell">
                  Joined
                </TableHead>
                {currentUserRole === "OWNER" && (
                  <TableHead className="text-muted-foreground w-20 text-right">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.STAFF
                const RoleIcon = roleConfig.icon
                const isCurrentUser = user.id === currentUserId
                const isOwner = user.role === "OWNER"

                return (
                  <TableRow key={user.id} className="border-[#262626]">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-sm font-medium">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name}
                              className="h-9 w-9 rounded-full"
                            />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {user.name}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {currentUserRole === "OWNER" && !isCurrentUser && user.role !== "OWNER" ? (
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                          disabled={updatingRoleId === user.id}
                        >
                          <SelectTrigger
                            className={cn(
                              "h-7 w-[130px] border-[#262626] bg-[#0d0d0d] text-xs",
                              roleConfig.color
                            )}
                          >
                            {updatingRoleId === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <span className="flex items-center gap-1.5">
                                <RoleIcon className="h-3 w-3" />
                                {roleConfig.label}
                              </span>
                            )}
                          </SelectTrigger>
                          <SelectContent className="border-[#262626] glass">
                            <SelectItem value="EXECUTIVE_ASSISTANT">EA</SelectItem>
                            <SelectItem value="OPERATIONS_MANAGER">Ops Manager</SelectItem>
                            <SelectItem value="STAFF">Staff</SelectItem>
                            <SelectItem value="READ_ONLY">Read Only</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn("text-xs", roleConfig.color)}
                        >
                          <RoleIcon className="mr-1 h-3 w-3" />
                          {roleConfig.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    {currentUserRole === "OWNER" && (
                      <TableCell className="text-right">
                        {!isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(user.id)}
                            disabled={removingId === user.id}
                            className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          >
                            {removingId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card className="border-[#262626] glass">
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
          <CardDescription>
            Understand what each role can access in Operion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(ROLE_CONFIG).map(([key, config]) => {
            const Icon = config.icon
            return (
              <div
                key={key}
                className="flex items-start gap-3 rounded-lg border border-[#262626] bg-[#0d0d0d] p-3"
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.color)} />
                <div>
                  <p className="text-sm font-medium text-white">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ")
}
