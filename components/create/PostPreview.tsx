import * as React from "react";
import { Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostPreviewProps {
  caption: string;
  imageUrl?: string;
  hashtags?: string[];
  handle?: string;
  className?: string;
}

function PostPreview({
  caption,
  imageUrl,
  hashtags = [],
  handle = "yourbrand",
  className,
}: PostPreviewProps) {
  const [expanded, setExpanded] = React.useState(false);
  const truncatedCaption =
    caption.length > 120 && !expanded ? caption.slice(0, 120) : caption;

  return (
    <div
      className={cn(
        "w-full max-w-sm overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#111111]",
        className
      )}
    >
      {/* Profile header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#f0b429] to-[#d4940a]">
          <span className="text-xs font-bold text-black">
            {handle.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-semibold text-white">{handle}</span>
      </div>

      {/* Image */}
      <div className="aspect-square w-full bg-[#0a0a0a]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Post preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#333]">
            <span className="text-sm">No image</span>
          </div>
        )}
      </div>

      {/* Action icons */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Heart className="h-6 w-6 text-white" />
          <MessageCircle className="h-6 w-6 text-white" />
          <Send className="h-6 w-6 text-white" />
        </div>
        <Bookmark className="h-6 w-6 text-white" />
      </div>

      {/* Caption */}
      <div className="px-4 pb-4">
        <p className="text-sm text-white">
          <span className="mr-1 font-semibold">{handle}</span>
          {truncatedCaption}
          {caption.length > 120 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="ml-1 text-[#888888]"
            >
              more
            </button>
          )}
        </p>

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <p className="mt-1 text-xs text-[#666]">
            {hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ")}
          </p>
        )}
      </div>
    </div>
  );
}

export { PostPreview };
export type { PostPreviewProps };
