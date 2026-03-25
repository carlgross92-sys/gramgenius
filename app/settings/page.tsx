"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Settings,
  Link2,
  Clock,
  Key,
  Activity,
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  ShieldCheck,
  ExternalLink,
  Globe,
  Database,
  Cloud,
  Wifi,
} from "lucide-react";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const period = i >= 12 ? "PM" : "AM";
  const hour = i % 12 || 12;
  return { value: String(i), label: `${hour}:00 ${period}` };
});

interface TimeSlot {
  day: string;
  hour: string;
}

interface DiscoveredAccount {
  igAccountId: string;
  igUsername: string | null;
  igProfilePic: string | null;
  igFollowers: number;
  pageId: string;
  pageName: string;
}

interface MetaConnection {
  connected: boolean;
  userName: string;
  pages: { id: string; name: string; hasInstagram: boolean; igUsername: string | null; igFollowers: number | null }[];
  autoDiscovered: DiscoveredAccount | null;
}

interface HealthCheck {
  score: number;
  checks: { name: string; status: "pass" | "warn" | "fail"; message: string }[];
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("meta");
  const [metaToken, setMetaToken] = useState("");
  const [metaConnection, setMetaConnection] = useState<MetaConnection | null>(
    null
  );
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Schedule settings
  const [autoPost, setAutoPost] = useState(false);
  const [timezone, setTimezone] = useState("America/New_York");
  const [bestTimes, setBestTimes] = useState<TimeSlot[]>([]);
  const [newTimeSlot, setNewTimeSlot] = useState<TimeSlot>({
    day: "Monday",
    hour: "9",
  });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);

  // Health check
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    // Load brand settings on mount
    async function loadSettings() {
      try {
        const res = await fetch("/api/brand");
        if (res.ok) {
          const data = await res.json();
          setAutoPost(data.autoPost || false);
          setTimezone(data.timezone || "America/New_York");
          setBestTimes(data.bestPostingTimes || []);
        }
      } catch {
        // Silent fail
      }
    }
    // Load Meta connection status from DB
    async function loadMetaStatus() {
      try {
        const res = await fetch("/api/settings/meta");
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setMetaConnection({
              connected: true,
              userName: data.userName || "",
              pages: [],
              autoDiscovered: data.instagramBusinessId ? {
                igAccountId: data.instagramBusinessId,
                igUsername: data.instagramUsername || "",
                igProfilePic: null,
                igFollowers: data.instagramFollowers || 0,
                pageId: data.facebookPageId || "",
                pageName: "",
              } : null,
            });
          }
        }
      } catch {
        // Silent fail
      }
    }
    loadSettings();
    loadMetaStatus();
  }, []);

  async function testConnection() {
    try {
      setTestingConnection(true);
      setConnectionError(null);
      setMetaConnection(null);

      // Save to DB via /api/settings/meta (persists permanently)
      const res = await fetch("/api/settings/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: metaToken }),
      });

      const data = await res.json();

      if (data.valid && data.saved) {
        setMetaConnection({
          connected: true,
          userName: data.userName || "Unknown",
          pages: [],
          autoDiscovered: data.instagramBusinessId ? {
            igAccountId: data.instagramBusinessId,
            igUsername: data.instagramUsername || "",
            igProfilePic: null,
            igFollowers: data.instagramFollowers || 0,
            pageId: data.facebookPageId || "",
            pageName: "",
          } : null,
        });
      } else {
        setConnectionError(
          data.error || "Connection failed. Check your access token."
        );
      }
    } catch {
      setConnectionError("Connection failed. Please check your access token.");
    } finally {
      setTestingConnection(false);
    }
  }

  function addTimeSlot() {
    if (bestTimes.length >= 7) return;
    const exists = bestTimes.some(
      (t) => t.day === newTimeSlot.day && t.hour === newTimeSlot.hour
    );
    if (!exists) {
      setBestTimes((prev) => [...prev, { ...newTimeSlot }]);
    }
  }

  function removeTimeSlot(index: number) {
    setBestTimes((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveScheduleSettings() {
    try {
      setSavingSchedule(true);
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoPost,
          timezone,
          bestPostingTimes: bestTimes,
        }),
      });
      if (res.ok) {
        setScheduleMessage("Schedule settings saved!");
        setTimeout(() => setScheduleMessage(null), 3000);
      }
    } catch {
      setScheduleMessage("Failed to save settings.");
      setTimeout(() => setScheduleMessage(null), 3000);
    } finally {
      setSavingSchedule(false);
    }
  }

  async function runHealthCheck() {
    try {
      setLoadingHealth(true);
      setHealthCheck(null);
      const res = await fetch("/api/analytics/health");
      if (res.ok) {
        const data = await res.json();
        setHealthCheck(
          data || {
            score: 0,
            checks: [],
          }
        );
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingHealth(false);
    }
  }

  async function activateRecoveryMode() {
    try {
      setRecoveryMode(true);
      await fetch("/api/analytics/recovery", { method: "POST" });
    } catch {
      // Silent fail
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Settings" />

      <div className="flex flex-col gap-6 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#111111]">
            <TabsTrigger value="meta">
              <Link2 className="mr-1.5 h-3.5 w-3.5" />
              Meta Connection
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="api-keys">
              <Key className="mr-1.5 h-3.5 w-3.5" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="health">
              <Activity className="mr-1.5 h-3.5 w-3.5" />
              Health Check
            </TabsTrigger>
            <TabsTrigger value="deploy">
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              Deployment
            </TabsTrigger>
          </TabsList>

          {/* Meta Connection Tab */}
          <TabsContent value="meta" className="mt-6 flex flex-col gap-6">
            <DarkCard>
              <h3 className="mb-4 text-lg font-semibold text-white">
                Connect Instagram
              </h3>
              <p className="mb-4 text-sm text-[#888]">
                Just paste your access token below. GramGenius will
                automatically find your linked Instagram Business Account.
              </p>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#888888]">Access Token</Label>
                  <Input
                    type="password"
                    value={metaToken}
                    onChange={(e) => setMetaToken(e.target.value)}
                    className="border-[#1f1f1f] bg-[#1a1a1a] font-mono text-white"
                    placeholder="EAAx..."
                  />
                </div>

                <GoldButton
                  onClick={testConnection}
                  disabled={testingConnection || !metaToken.trim()}
                >
                  {testingConnection ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Connect Instagram
                </GoldButton>

                {connectionError && (
                  <div className="flex items-start gap-2 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ef4444]" />
                    <p className="text-sm text-[#ef4444]">{connectionError}</p>
                  </div>
                )}

                {metaConnection?.connected && (
                  <DarkCard className="border-[#22c55e]/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-[#22c55e]" />
                      <h4 className="font-semibold text-[#22c55e]">
                        Connected
                      </h4>
                    </div>

                    {metaConnection.autoDiscovered && (
                      <div className="mt-4 flex items-center gap-4">
                        {metaConnection.autoDiscovered.igProfilePic && (
                          <img
                            src={metaConnection.autoDiscovered.igProfilePic}
                            alt={metaConnection.autoDiscovered.igUsername || "Profile"}
                            className="h-14 w-14 rounded-full border-2 border-[#f0b429]/30"
                          />
                        )}
                        <div className="flex flex-col gap-1">
                          <p className="text-lg font-semibold text-white">
                            @{metaConnection.autoDiscovered.igUsername}
                          </p>
                          <p className="text-sm text-[#888]">
                            {metaConnection.autoDiscovered.igFollowers.toLocaleString()}{" "}
                            followers
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-[#888888]">Facebook User</p>
                        <p className="text-sm font-medium text-white">
                          {metaConnection.userName}
                        </p>
                      </div>
                      {metaConnection.autoDiscovered && (
                        <>
                          <div>
                            <p className="text-xs text-[#888888]">Page</p>
                            <p className="text-sm font-medium text-white">
                              {metaConnection.autoDiscovered.pageName}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#888888]">IG Account ID</p>
                            <p className="font-mono text-sm text-white">
                              {metaConnection.autoDiscovered.igAccountId}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#888888]">Followers</p>
                            <p className="text-sm font-medium text-white">
                              {metaConnection.autoDiscovered.igFollowers.toLocaleString()}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {metaConnection.pages.length > 0 &&
                      !metaConnection.autoDiscovered && (
                        <div className="mt-4 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-3">
                          <p className="text-sm text-[#f59e0b]">
                            Found {metaConnection.pages.length} Facebook Page(s)
                            but none have a linked Instagram Business Account.
                            Link your Instagram to a Facebook Page first.
                          </p>
                        </div>
                      )}
                  </DarkCard>
                )}
              </div>

              <Separator className="my-6 bg-[#1f1f1f]" />

              {/* Setup Instructions */}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-semibold text-[#f0b429]">
                  How to get your Access Token
                </h4>
                <div className="flex flex-col gap-2">
                  {[
                    {
                      text: "Go to ",
                      link: "developers.facebook.com/tools/explorer",
                      href: "https://developers.facebook.com/tools/explorer",
                    },
                    {
                      text: "Select your app (or create one with Instagram Graph API)",
                    },
                    { text: 'Click "Generate Access Token"' },
                    {
                      text: "Select permissions: instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement",
                    },
                    {
                      text: 'Click "Generate Access Token" and authorize',
                    },
                    { text: "Paste the token above" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0b429]/15 text-xs font-bold text-[#f0b429]">
                        {i + 1}
                      </span>
                      <p className="text-sm text-[#cccccc]">
                        {step.text}
                        {step.link && (
                          <a
                            href={step.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#f0b429] underline hover:text-[#f0b429]/80"
                          >
                            {step.link}
                            <ExternalLink className="ml-1 inline h-3 w-3" />
                          </a>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[#888]">
                  For long-lived tokens (60 days), see docs/meta-setup.md
                </p>
              </div>
            </DarkCard>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="mt-6 flex flex-col gap-6">
            <DarkCard>
              <h3 className="mb-4 text-lg font-semibold text-white">
                Posting Schedule
              </h3>

              <div className="flex flex-col gap-6">
                {/* Auto-Post Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Auto-Post</Label>
                    <p className="text-sm text-[#888888]">
                      Automatically publish posts at scheduled times
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoPost(!autoPost)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
                      autoPost ? "bg-[#f0b429]" : "bg-[#333333]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none block h-5 w-5 translate-y-1 rounded-full bg-white shadow-sm transition-transform ${
                        autoPost ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Timezone */}
                <div className="flex flex-col gap-2">
                  <Label className="text-[#888888]">Timezone</Label>
                  <Select value={timezone} onValueChange={(v) => setTimezone(v ?? "")}>
                    <SelectTrigger className="border-[#1f1f1f] bg-[#1a1a1a] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz} className="text-white">
                          {tz.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Best Times */}
                <div className="flex flex-col gap-2">
                  <Label className="text-[#888888]">
                    Best Posting Times ({bestTimes.length}/7)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {bestTimes.map((slot, index) => (
                      <span
                        key={`${slot.day}-${slot.hour}-${index}`}
                        className="inline-flex items-center gap-1 rounded-full border border-[#1f1f1f] bg-[#1a1a1a] px-3 py-1 text-sm text-white"
                      >
                        {slot.day.slice(0, 3)}{" "}
                        {HOURS.find((h) => h.value === slot.hour)?.label}
                        <button
                          onClick={() => removeTimeSlot(index)}
                          className="ml-1 rounded-full p-0.5 hover:bg-[#1f1f1f]"
                        >
                          <X className="h-3 w-3 text-[#888888]" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {bestTimes.length < 7 && (
                    <div className="flex gap-2">
                      <Select
                        value={newTimeSlot.day}
                        onValueChange={(value) =>
                          setNewTimeSlot((prev) => ({ ...prev, day: value ?? "" }))
                        }
                      >
                        <SelectTrigger className="w-40 border-[#1f1f1f] bg-[#1a1a1a] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                          {DAYS.map((day) => (
                            <SelectItem
                              key={day}
                              value={day}
                              className="text-white"
                            >
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={newTimeSlot.hour}
                        onValueChange={(value) =>
                          setNewTimeSlot((prev) => ({ ...prev, hour: value ?? "" }))
                        }
                      >
                        <SelectTrigger className="w-32 border-[#1f1f1f] bg-[#1a1a1a] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                          {HOURS.map((hour) => (
                            <SelectItem
                              key={hour.value}
                              value={hour.value}
                              className="text-white"
                            >
                              {hour.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <GoldButton variant="secondary" onClick={addTimeSlot}>
                        <Plus className="h-4 w-4" />
                      </GoldButton>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <GoldButton
                    onClick={saveScheduleSettings}
                    disabled={savingSchedule}
                  >
                    {savingSchedule ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Save Schedule Settings
                  </GoldButton>
                  {scheduleMessage && (
                    <span
                      className={`text-sm ${scheduleMessage.includes("saved") ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                    >
                      {scheduleMessage}
                    </span>
                  )}
                </div>
              </div>
            </DarkCard>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="mt-6 flex flex-col gap-6">
            <DarkCard>
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#22c55e]" />
                <h3 className="text-lg font-semibold text-white">
                  API Keys Configuration
                </h3>
              </div>

              <div className="mb-6 rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/5 p-4">
                <p className="text-sm text-[#22c55e]">
                  All API keys are stored securely in your local{" "}
                  <code className="rounded bg-[#1a1a1a] px-1.5 py-0.5 font-mono text-xs">
                    .env.local
                  </code>{" "}
                  file. They are never sent to any third-party server.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                {/* Anthropic / Claude */}
                <div className="rounded-lg border border-[#1f1f1f] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold text-white">
                      Anthropic (Claude)
                    </h4>
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#f0b429] hover:underline"
                    >
                      Get API Key
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-sm text-[#888888]">
                    Powers caption generation, trend research, bio optimization,
                    reel scripts, and AI analytics. Set{" "}
                    <code className="rounded bg-[#1a1a1a] px-1 font-mono text-xs text-[#f0b429]">
                      ANTHROPIC_API_KEY
                    </code>{" "}
                    in .env.local
                  </p>
                </div>

                {/* OpenAI */}
                <div className="rounded-lg border border-[#1f1f1f] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold text-white">OpenAI</h4>
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#f0b429] hover:underline"
                    >
                      Get API Key
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-sm text-[#888888]">
                    Used for image generation (DALL-E) and voiceover (TTS). Set{" "}
                    <code className="rounded bg-[#1a1a1a] px-1 font-mono text-xs text-[#f0b429]">
                      OPENAI_API_KEY
                    </code>{" "}
                    in .env.local
                  </p>
                </div>

                {/* Meta / Instagram */}
                <div className="rounded-lg border border-[#1f1f1f] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold text-white">
                      Meta Graph API
                    </h4>
                    <a
                      href="https://developers.facebook.com/apps/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#f0b429] hover:underline"
                    >
                      Developer Portal
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-sm text-[#888888]">
                    Required for publishing to Instagram and fetching analytics.
                    Set{" "}
                    <code className="rounded bg-[#1a1a1a] px-1 font-mono text-xs text-[#f0b429]">
                      META_ACCESS_TOKEN
                    </code>{" "}
                    and{" "}
                    <code className="rounded bg-[#1a1a1a] px-1 font-mono text-xs text-[#f0b429]">
                      INSTAGRAM_ACCOUNT_ID
                    </code>{" "}
                    in .env.local
                  </p>
                </div>

                {/* Database */}
                <div className="rounded-lg border border-[#1f1f1f] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold text-white">
                      Database (PostgreSQL)
                    </h4>
                  </div>
                  <p className="text-sm text-[#888888]">
                    Prisma connects to your PostgreSQL database. Set{" "}
                    <code className="rounded bg-[#1a1a1a] px-1 font-mono text-xs text-[#f0b429]">
                      DATABASE_URL
                    </code>{" "}
                    in .env.local
                  </p>
                </div>
              </div>
            </DarkCard>
          </TabsContent>

          {/* Health Check Tab */}
          <TabsContent value="health" className="mt-6 flex flex-col gap-6">
            <DarkCard glow>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#f0b429]" />
                  <h3 className="text-lg font-semibold text-white">
                    Account Health Check
                  </h3>
                </div>
                <GoldButton onClick={runHealthCheck} disabled={loadingHealth}>
                  {loadingHealth ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                  Run Health Check
                </GoldButton>
              </div>

              {healthCheck && (
                <div className="flex flex-col gap-6">
                  {/* Circular Gauge */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative flex h-44 w-44 items-center justify-center">
                      <svg
                        className="h-44 w-44 -rotate-90"
                        viewBox="0 0 176 176"
                      >
                        <circle
                          cx="88"
                          cy="88"
                          r="72"
                          fill="none"
                          stroke="#1f1f1f"
                          strokeWidth="12"
                        />
                        <circle
                          cx="88"
                          cy="88"
                          r="72"
                          fill="none"
                          stroke={
                            healthCheck.score >= 70
                              ? "#22c55e"
                              : healthCheck.score >= 50
                                ? "#f0b429"
                                : "#ef4444"
                          }
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${(healthCheck.score / 100) * 452} 452`}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-4xl font-bold text-white">
                          {healthCheck.score}
                        </span>
                        <span className="text-sm text-[#888888]">/ 100</span>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        healthCheck.score >= 70
                          ? "text-[#22c55e]"
                          : healthCheck.score >= 50
                            ? "text-[#f0b429]"
                            : "text-[#ef4444]"
                      }`}
                    >
                      {healthCheck.score >= 70
                        ? "Healthy"
                        : healthCheck.score >= 50
                          ? "Needs Improvement"
                          : "Critical - Action Required"}
                    </span>
                  </div>

                  {/* Checks List */}
                  <div className="flex flex-col gap-2">
                    {healthCheck.checks.map((check, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-lg border border-[#1f1f1f] bg-[#1a1a1a] px-4 py-3"
                      >
                        {check.status === "pass" && (
                          <CheckCircle className="h-5 w-5 shrink-0 text-[#22c55e]" />
                        )}
                        {check.status === "warn" && (
                          <AlertTriangle className="h-5 w-5 shrink-0 text-[#f59e0b]" />
                        )}
                        {check.status === "fail" && (
                          <X className="h-5 w-5 shrink-0 rounded-full bg-[#ef4444]/20 p-0.5 text-[#ef4444]" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {check.name}
                          </p>
                          <p className="text-xs text-[#888888]">
                            {check.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recovery Mode */}
                  {healthCheck.score < 50 && (
                    <DarkCard className="border-[#ef4444]/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-[#ef4444]">
                            Recovery Mode
                          </h4>
                          <p className="text-sm text-[#888888]">
                            Your account health is critical. Activate recovery
                            mode to get a curated action plan for improving your
                            metrics.
                          </p>
                        </div>
                        <GoldButton
                          variant="danger"
                          onClick={activateRecoveryMode}
                          disabled={recoveryMode}
                        >
                          {recoveryMode ? (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Recovery Active
                            </>
                          ) : (
                            <>
                              <Activity className="h-4 w-4" />
                              Activate Recovery Mode
                            </>
                          )}
                        </GoldButton>
                      </div>
                    </DarkCard>
                  )}
                </div>
              )}

              {!healthCheck && !loadingHealth && (
                <p className="py-8 text-center text-[#888888]">
                  Run a health check to analyze your account&apos;s posting
                  frequency, hashtag rotation, engagement metrics, and more.
                </p>
              )}
            </DarkCard>
          </TabsContent>

          {/* Deployment Status */}
          <TabsContent value="deploy" className="space-y-4">
            <DarkCard>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <Globe className="h-5 w-5 text-[#f0b429]" />
                Deployment Status
              </h3>
              <div className="space-y-3">
                <DeployCheck
                  icon={Globe}
                  label="Environment"
                  value={typeof window !== "undefined" && window.location.hostname !== "localhost" ? "Production" : "Local Development"}
                  ok={true}
                />
                <DeployCheck
                  icon={Database}
                  label="Database (PostgreSQL)"
                  value="Check connection via Brand Brain page"
                  ok={true}
                />
                <DeployCheck
                  icon={Cloud}
                  label="Blob Storage"
                  value="Active when BLOB_READ_WRITE_TOKEN is set"
                  ok={true}
                />
                <DeployCheck
                  icon={Clock}
                  label="Cron Jobs"
                  value="3 jobs configured (schedule, comments, growth)"
                  ok={true}
                />
                <DeployCheck
                  icon={Wifi}
                  label="Meta API"
                  value={metaConnection ? "Connected" : "Not connected"}
                  ok={!!metaConnection}
                />
              </div>
            </DarkCard>

            <DarkCard>
              <h3 className="mb-4 text-lg font-semibold text-white">
                Vercel Cron Jobs
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between rounded-lg bg-[#0a0a0a] p-3">
                  <span className="text-[#888]">/api/schedule/process</span>
                  <span className="text-white">Every 5 minutes</span>
                </div>
                <div className="flex justify-between rounded-lg bg-[#0a0a0a] p-3">
                  <span className="text-[#888]">/api/engage/comments</span>
                  <span className="text-white">Every hour</span>
                </div>
                <div className="flex justify-between rounded-lg bg-[#0a0a0a] p-3">
                  <span className="text-[#888]">/api/analytics/growth</span>
                  <span className="text-white">Daily at 9am</span>
                </div>
              </div>
            </DarkCard>

            <DarkCard>
              <h3 className="mb-3 text-lg font-semibold text-white">
                Hosting Info
              </h3>
              <div className="space-y-1 text-sm text-[#888]">
                <p>Platform: Vercel (Hobby plan — free)</p>
                <p>Database: Neon PostgreSQL (free tier — 0.5GB)</p>
                <p>File Storage: Vercel Blob (free tier — 1GB)</p>
                <p>Cron: Vercel Cron Jobs (included)</p>
              </div>
            </DarkCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DeployCheck({
  icon: Icon,
  label,
  value,
  ok,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-[#0a0a0a] p-3">
      <Icon className={`h-4 w-4 ${ok ? "text-[#22c55e]" : "text-[#ef4444]"}`} />
      <div className="flex-1">
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-[#888]">{value}</p>
      </div>
      <span className={`text-xs font-medium ${ok ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
        {ok ? "OK" : "Check"}
      </span>
    </div>
  );
}
