"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuthStore } from "@/store/auth-store"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { X, User, Phone, Link as LinkIcon } from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ProfileForm {
  profilePic: string
  phone: string
  dateOfBirth: string
  gender: string
  bio: string
  address: string
  jobTitle: string
  department: string
}

interface EmergencyForm {
  name: string
  phone: string
  relationship: string
}

interface SocialForm {
  linkedin: string
  twitter: string
  website: string
}

const PROFILE_DEFAULTS: ProfileForm = {
  profilePic: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  bio: "",
  address: "",
  jobTitle: "",
  department: "",
}

const EMERGENCY_DEFAULTS: EmergencyForm = { name: "", phone: "", relationship: "" }
const SOCIAL_DEFAULTS: SocialForm = { linkedin: "", twitter: "", website: "" }

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function AccountPage() {
  const router = useRouter()
  const storeUser = useAuthStore((s) => s.user)
  const { data: session } = useSession()
  const userName = storeUser?.name ?? session?.user?.name ?? ""
  const userEmail = storeUser?.email ?? session?.user?.email ?? ""

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingEmergency, setSavingEmergency] = useState(false)
  const [savingSocial, setSavingSocial] = useState(false)

  const [profile, setProfile] = useState<ProfileForm>(PROFILE_DEFAULTS)
  const [emergency, setEmergency] = useState<EmergencyForm>(EMERGENCY_DEFAULTS)
  const [social, setSocial] = useState<SocialForm>(SOCIAL_DEFAULTS)

  // ── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/user-profile")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        const p = data.profile
        if (!p) return
        setProfile({
          profilePic: p.profilePic ?? "",
          phone: p.phone ?? "",
          dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : "",
          gender: p.gender ?? "",
          bio: p.bio ?? "",
          address: p.address ?? "",
          jobTitle: p.jobTitle ?? "",
          department: p.department ?? "",
        })
        setEmergency({
          name: p.emergencyContact?.name ?? "",
          phone: p.emergencyContact?.phone ?? "",
          relationship: p.emergencyContact?.relationship ?? "",
        })
        setSocial({
          linkedin: p.socialLinks?.linkedin ?? "",
          twitter: p.socialLinks?.twitter ?? "",
          website: p.socialLinks?.website ?? "",
        })
      } catch {
        // profile may not exist yet — that's fine
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Save helpers ──────────────────────────────────────────────────────────
  async function savePartial(payload: object, setSaving: (v: boolean) => void) {
    setSaving(true)
    try {
      const res = await fetch("/api/user-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save")
      toast.success("Saved successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault()
    await savePartial(
      {
        ...profile,
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString() : undefined,
        gender: profile.gender || undefined,
      },
      setSavingProfile
    )
  }

  async function handleSaveEmergency(e: FormEvent) {
    e.preventDefault()
    await savePartial(
      {
        emergencyContact: emergency.name && emergency.phone ? emergency : undefined,
      },
      setSavingEmergency
    )
  }

  async function handleSaveSocial(e: FormEvent) {
    e.preventDefault()
    await savePartial({ socialLinks: social }, setSavingSocial)
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full relative">
        <Button variant="ghost" size="icon" disabled className="absolute top-6 right-6 text-muted-foreground">
          <X className="size-5" />
        </Button>
        <div className="flex flex-col gap-2 mb-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-4 border-b pb-0 mt-2">
          <Skeleton className="h-10 w-24 rounded-none rounded-t-md" />
          <Skeleton className="h-10 w-24 rounded-none rounded-t-md" />
          <Skeleton className="h-10 w-24 rounded-none rounded-t-md" />
        </div>
        <div className="flex flex-col gap-6 mt-2">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full relative">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        className="absolute top-6 right-6 text-muted-foreground hover:text-foreground cursor-pointer"
        title="Go back"
      >
        <X className="size-5" />
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your personal profile and contact information.
        </p>
      </div>

      <Tabs defaultValue="profile" className="flex flex-col md:flex-row gap-8 items-start w-full">
        {/* ── Sidebar nav ─────────────────────────────────────────────────── */}
        <TabsList className="flex flex-row md:flex-col h-auto w-full md:w-56 bg-muted/40 p-1.5 shrink-0 rounded-xl gap-0.5">
          <TabsTrigger
            value="profile"
            className="w-full justify-start px-3 py-2.5 gap-2.5 cursor-pointer rounded-lg text-sm font-medium text-muted-foreground transition-all
              data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
          >
            <User className="size-4 shrink-0" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="contact"
            className="w-full justify-start px-3 py-2.5 gap-2.5 cursor-pointer rounded-lg text-sm font-medium text-muted-foreground transition-all
              data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
          >
            <Phone className="size-4 shrink-0" />
            Contact
          </TabsTrigger>
          <TabsTrigger
            value="social"
            className="w-full justify-start px-3 py-2.5 gap-2.5 cursor-pointer rounded-lg text-sm font-medium text-muted-foreground transition-all
              data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
          >
            <LinkIcon className="size-4 shrink-0" />
            Social Links
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 w-full min-w-0">
          {/* ── Profile Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="profile" className="flex flex-col gap-6 mt-0">
            {/* Avatar + identity */}
            <Card>
              <CardHeader>
                <CardTitle>Photo &amp; Identity</CardTitle>
                <CardDescription>
                  How others see you across the app.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-5">
                <Avatar className="size-16 shrink-0">
                  <AvatarImage src={profile.profilePic || undefined} alt={userName} />
                  <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-none">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Update your photo URL below in the Profile Info form.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Profile info */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Info</CardTitle>
                <CardDescription>
                  Personal details that appear on your profile.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="profilePic">Profile Picture URL</Label>
                    <Input
                      id="profilePic"
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={profile.profilePic}
                      onChange={(e) => setProfile((p) => ({ ...p, profilePic: e.target.value }))}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="jobTitle">Job Title</Label>
                      <Input
                        id="jobTitle"
                        placeholder="e.g. Product Designer"
                        value={profile.jobTitle}
                        onChange={(e) => setProfile((p) => ({ ...p, jobTitle: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        placeholder="e.g. Engineering"
                        value={profile.department}
                        onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={profile.dateOfBirth}
                        onChange={(e) => setProfile((p) => ({ ...p, dateOfBirth: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={profile.gender}
                        onValueChange={(v) => setProfile((p) => ({ ...p, gender: v }))}
                      >
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non-binary">Non-binary</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="A short description about yourself…"
                      rows={3}
                      maxLength={500}
                      value={profile.bio}
                      onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground text-right">{profile.bio.length}/500</p>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={savingProfile}>
                      {savingProfile ? "Saving…" : "Save Profile"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Contact Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="contact" className="flex flex-col gap-6 mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Contact Details</CardTitle>
                <CardDescription>Your phone number and address.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 555 000 0000"
                        value={profile.phone}
                        onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main St, City, Country"
                      value={profile.address}
                      onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={savingProfile}>
                      {savingProfile ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
                <CardDescription>
                  Someone we can reach out to in case of emergency.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveEmergency} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="ec-name">Full Name</Label>
                      <Input
                        id="ec-name"
                        placeholder="Jane Doe"
                        value={emergency.name}
                        onChange={(e) => setEmergency((p) => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="ec-phone">Phone Number</Label>
                      <Input
                        id="ec-phone"
                        type="tel"
                        placeholder="+1 555 000 0000"
                        value={emergency.phone}
                        onChange={(e) => setEmergency((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="ec-relationship">Relationship</Label>
                      <Input
                        id="ec-relationship"
                        placeholder="e.g. Spouse, Parent"
                        value={emergency.relationship}
                        onChange={(e) => setEmergency((p) => ({ ...p, relationship: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={savingEmergency}>
                      {savingEmergency ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Social Tab ──────────────────────────────────────────────────── */}
          <TabsContent value="social" className="flex flex-col gap-6 mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Social Links</CardTitle>
                <CardDescription>
                  Optional links to your online presence.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSocial} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      type="url"
                      placeholder="https://linkedin.com/in/yourname"
                      value={social.linkedin}
                      onChange={(e) => setSocial((p) => ({ ...p, linkedin: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="twitter">Twitter / X</Label>
                    <Input
                      id="twitter"
                      type="url"
                      placeholder="https://twitter.com/yourhandle"
                      value={social.twitter}
                      onChange={(e) => setSocial((p) => ({ ...p, twitter: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://yourwebsite.com"
                      value={social.website}
                      onChange={(e) => setSocial((p) => ({ ...p, website: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={savingSocial}>
                      {savingSocial ? "Saving…" : "Save Social Links"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
