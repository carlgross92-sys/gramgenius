"use client";

import { useEffect, useState } from "react";
import { DarkCard } from "@/components/ui/DarkCard";
import { GoldButton } from "@/components/ui/GoldButton";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Link2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Key,
} from "lucide-react";

interface MetaStatus {
  connected: boolean;
  tokenValid: boolean;
  tokenExpired: boolean;
  permanent: boolean;
  tokenType: string;
  userName: string;
  instagramUsername: string | null;
  instagramFollowers: number;
  instagramBusinessId: string | null;
  daysUntilExpiry: number | null;
}

export default function SettingsPage() {
  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const res = await fetch("/api/settings/meta");
      if (res.ok) {
        const data = await res.json();
        setMetaStatus(data as MetaStatus);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  async function saveToken() {
    if (!token.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token, instagramBusinessId: "17841401833980755" }),
      });
      const data = await res.json();
      if (data.valid && data.saved) {
        setSuccess(
          data.permanent
            ? "Permanent token saved — never expires!"
            : data.tokenType === "long_lived_60d"
            ? `Token saved — expires in ${data.daysUntilExpiry || 60} days`
            : "Token saved successfully"
        );
        setToken("");
        await loadStatus();
      } else {
        setError(data.error || "Failed to save token");
      }
    } catch {
      setError("Failed to save token");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
          <Settings className="h-6 w-6 text-[#f0b429]" />
          Settings
        </h1>
      </div>

      {/* Instagram Connection */}
      <DarkCard className="mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
          <Link2 className="h-5 w-5 text-[#f0b429]" />
          Instagram Connection
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 text-[#888]">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking...
          </div>
        ) : metaStatus?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#22c55e]" />
              <span className="text-[#22c55e] font-medium">Connected</span>
              {metaStatus.permanent ? (
                <span className="rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-xs text-[#22c55e]">Permanent</span>
              ) : null}
            </div>
            {metaStatus.instagramUsername ? (
              <p className="text-white">@{metaStatus.instagramUsername} ({metaStatus.instagramFollowers} followers)</p>
            ) : null}
            <p className="text-xs text-[#888]">
              Token: {metaStatus.tokenType === "page_permanent" ? "Page token (never expires)" : `${metaStatus.daysUntilExpiry ?? "?"} days remaining`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {metaStatus?.tokenExpired ? (
              <div className="flex items-center gap-2 text-[#ef4444]">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Token expired — paste a new one below</span>
              </div>
            ) : (
              <p className="text-sm text-[#888]">Paste your Meta access token to connect Instagram</p>
            )}

            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="EAAx..."
              className="border-[#1f1f1f] bg-[#0a0a0a] text-white font-mono"
            />

            <GoldButton onClick={saveToken} disabled={saving || !token.trim()} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
              Save & Connect
            </GoldButton>

            {error ? <p className="text-sm text-[#ef4444]">{error}</p> : null}
            {success ? <p className="text-sm text-[#22c55e]">{success}</p> : null}

            {/* Instructions */}
            <div className="rounded-lg bg-[#0a0a0a] p-3 border border-[#1f1f1f] text-xs text-[#888] space-y-1">
              <p className="text-[#f0b429] font-medium">How to get your token:</p>
              <p>1. Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-[#f0b429] underline">Graph API Explorer <ExternalLink className="inline h-3 w-3" /></a></p>
              <p>2. Select your app, add permissions: pages_show_list, instagram_content_publish</p>
              <p>3. Click Generate Access Token, select your page</p>
              <p>4. Paste the token above</p>
            </div>
          </div>
        )}
      </DarkCard>

      {/* API Keys Status */}
      <DarkCard>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
          <Key className="h-5 w-5 text-[#f0b429]" />
          API Keys
        </h2>
        <div className="space-y-2">
          {[
            { name: "Anthropic Claude", key: "ANTHROPIC_API_KEY", desc: "AI content generation" },
            { name: "OpenAI DALL-E", key: "OPENAI_API_KEY", desc: "Image generation" },
            { name: "ElevenLabs", key: "ELEVENLABS_API_KEY", desc: "Voiceover audio" },
            { name: "Pexels", key: "PEXELS_API_KEY", desc: "Real video footage" },
          ].map((api) => (
            <div key={api.key} className="flex items-center justify-between rounded-lg bg-[#0a0a0a] p-3 border border-[#1f1f1f]">
              <div>
                <p className="text-sm text-white">{api.name}</p>
                <p className="text-xs text-[#888]">{api.desc}</p>
              </div>
              <CheckCircle className="h-4 w-4 text-[#22c55e]" />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#888]">API keys are stored in Vercel environment variables</p>
      </DarkCard>
    </div>
  );
}
