"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Handshake,
  Search,
  Users,
  MessageSquare,
  Copy,
} from "lucide-react";

interface CollabProspect {
  id: string;
  handle: string;
  followers: number;
  engagementRate: number;
  niche: string;
  whyTheyWork: string;
  status: CollabStatus;
}

type CollabStatus =
  | "Not Contacted"
  | "Contacted"
  | "Responded"
  | "Collab Planned"
  | "Completed";

const COLLAB_STATUSES: CollabStatus[] = [
  "Not Contacted",
  "Contacted",
  "Responded",
  "Collab Planned",
  "Completed",
];

const STATUS_COLORS: Record<CollabStatus, string> = {
  "Not Contacted": "text-[#888888]",
  Contacted: "text-[#f0b429]",
  Responded: "text-blue-400",
  "Collab Planned": "text-purple-400",
  Completed: "text-[#22c55e]",
};

export default function CollabsPage() {
  const [keyword, setKeyword] = useState("");
  const [minFollowers, setMinFollowers] = useState("");
  const [maxFollowers, setMaxFollowers] = useState("");
  const [searching, setSearching] = useState(false);
  const [prospects, setProspects] = useState<CollabProspect[]>([]);
  const [pitchModal, setPitchModal] = useState(false);
  const [selectedProspect, setSelectedProspect] =
    useState<CollabProspect | null>(null);
  const [draftPitch, setDraftPitch] = useState("");
  const [generatingPitch, setGeneratingPitch] = useState(false);

  async function findProspects() {
    if (!keyword.trim()) return;
    try {
      setSearching(true);
      setProspects([]);
      const res = await fetch("/api/collabs/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          minFollowers: minFollowers ? Number(minFollowers) : undefined,
          maxFollowers: maxFollowers ? Number(maxFollowers) : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const results = (data.prospects || data || []).map(
          (p: CollabProspect) => ({
            ...p,
            status: p.status || "Not Contacted",
          })
        );
        setProspects(results);
      }
    } catch {
      // Silent fail
    } finally {
      setSearching(false);
    }
  }

  async function draftPitchForProspect(prospect: CollabProspect) {
    setSelectedProspect(prospect);
    setPitchModal(true);
    setDraftPitch("");
    try {
      setGeneratingPitch(true);
      const res = await fetch("/api/collabs/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: prospect.handle,
          niche: prospect.niche,
          whyTheyWork: prospect.whyTheyWork,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraftPitch(data.pitch || data.message || "");
      }
    } catch {
      setDraftPitch("Failed to generate pitch. Please try again.");
    } finally {
      setGeneratingPitch(false);
    }
  }

  function updateStatus(id: string, status: CollabStatus) {
    setProspects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
  }

  function copyPitch() {
    if (draftPitch) {
      navigator.clipboard.writeText(draftPitch);
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Collab Finder" />

      <div className="flex flex-col gap-6 p-6">
        {/* Search Section */}
        <DarkCard glow>
          <div className="mb-4 flex items-center gap-2">
            <Handshake className="h-5 w-5 text-[#f0b429]" />
            <h3 className="text-lg font-semibold text-white">
              Find Collaboration Prospects
            </h3>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-[#888888]">Niche Keyword</Label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && findProspects()}
                className="border-[#1f1f1f] bg-[#1a1a1a] text-white"
                placeholder="e.g., fitness, cooking, real estate..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[#888888]">Min Followers</Label>
                <Input
                  type="number"
                  value={minFollowers}
                  onChange={(e) => setMinFollowers(e.target.value)}
                  className="border-[#1f1f1f] bg-[#1a1a1a] text-white"
                  placeholder="1000"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[#888888]">Max Followers</Label>
                <Input
                  type="number"
                  value={maxFollowers}
                  onChange={(e) => setMaxFollowers(e.target.value)}
                  className="border-[#1f1f1f] bg-[#1a1a1a] text-white"
                  placeholder="100000"
                />
              </div>
            </div>

            <GoldButton
              onClick={findProspects}
              disabled={searching || !keyword.trim()}
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Find Prospects
            </GoldButton>
          </div>
        </DarkCard>

        {/* Loading */}
        {searching && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#f0b429]" />
            <p className="text-sm text-[#888888]">
              Searching for collaboration prospects...
            </p>
          </div>
        )}

        {/* Results Table */}
        {prospects.length > 0 && (
          <DarkCard>
            <h3 className="mb-4 text-lg font-semibold text-white">
              Prospects ({prospects.length})
            </h3>

            <ScrollArea className="max-h-[600px]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1f1f1f]">
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#888888]">
                        Handle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#888888]">
                        Followers
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#888888]">
                        Engagement
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#888888]">
                        Niche
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#888888]">
                        Why They&apos;d Work
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#888888]">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[#888888]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospects.map((prospect) => (
                      <tr
                        key={prospect.id}
                        className="border-b border-[#1f1f1f]/50 transition-colors hover:bg-[#1a1a1a]"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-[#f0b429]">
                          @{prospect.handle}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#cccccc]">
                          {prospect.followers >= 1000000
                            ? `${(prospect.followers / 1000000).toFixed(1)}M`
                            : prospect.followers >= 1000
                              ? `${(prospect.followers / 1000).toFixed(0)}K`
                              : prospect.followers}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#22c55e]">
                          {prospect.engagementRate.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-[#cccccc]">
                          {prospect.niche}
                        </td>
                        <td className="max-w-[200px] px-4 py-3 text-sm text-[#888888]">
                          <p className="truncate">{prospect.whyTheyWork}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={prospect.status}
                            onValueChange={(value) =>
                              updateStatus(
                                prospect.id,
                                value as CollabStatus
                              )
                            }
                          >
                            <SelectTrigger
                              className={`w-36 border-[#1f1f1f] bg-[#1a1a1a] text-sm ${STATUS_COLORS[prospect.status]}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                              {COLLAB_STATUSES.map((status) => (
                                <SelectItem
                                  key={status}
                                  value={status}
                                  className={`text-sm ${STATUS_COLORS[status]}`}
                                >
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <GoldButton
                            variant="secondary"
                            onClick={() => draftPitchForProspect(prospect)}
                          >
                            <MessageSquare className="h-3 w-3" />
                            Draft Pitch
                          </GoldButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </DarkCard>
        )}

        {/* Empty state */}
        {!searching && prospects.length === 0 && (
          <DarkCard className="py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-[#333333]" />
            <p className="text-[#888888]">
              Enter a niche keyword and follower range to find potential
              collaboration partners.
            </p>
          </DarkCard>
        )}
      </div>

      {/* Pitch Modal */}
      <Dialog open={pitchModal} onOpenChange={setPitchModal}>
        <DialogContent className="border-[#1f1f1f] bg-[#111111] text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Pitch for @{selectedProspect?.handle}
            </DialogTitle>
          </DialogHeader>

          {generatingPitch ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#f0b429]" />
              <p className="text-sm text-[#888888]">Crafting pitch...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Textarea
                value={draftPitch}
                onChange={(e) => setDraftPitch(e.target.value)}
                className="min-h-[200px] border-[#1f1f1f] bg-[#1a1a1a] text-white"
              />
              <div className="flex gap-3">
                <GoldButton onClick={copyPitch} className="flex-1">
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </GoldButton>
                <GoldButton
                  variant="secondary"
                  onClick={() => setPitchModal(false)}
                >
                  Close
                </GoldButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
