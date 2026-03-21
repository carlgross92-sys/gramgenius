import prisma from "@/lib/prisma";
import { generateWithClaude } from "@/lib/anthropic";
import { generateImage } from "@/lib/openai";
import { textToSpeech, saveAudio } from "@/lib/elevenlabs";
import {
  createImageContainer,
  createReelContainer,
  pollContainerStatus,
  publishContainer,
} from "@/lib/meta";
import {
  searchAnimalVideo,
  downloadAndSaveVideo,
} from "@/lib/pexels";
import type { PexelsVideo } from "@/lib/pexels";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface MediaAgentInput {
  postType: "FEED" | "CAROUSEL" | "REEL" | "STORY";
  topic: string;
  caption: string;
  hashtags: string[];
  subject?: string;
  visualConcept: {
    dallePrompt: string;
    colorMood?: string;
    compositionStyle?: string;
    visualType?: string;
  };
  strategy: { format?: string; tone?: string };
  autoPost: boolean;
  postId?: string;
}

export interface MediaAgentOutput {
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  voiceoverUrl?: string;
  voiceoverScript?: string;
  videoDuration?: number;
  photographer?: string;
  pexelsUrl?: string;
  videoSource?: string;
  instagramPostId?: string;
  instagramUrl?: string;
  instagramError?: string;
  mediaLibraryIds: string[];
  errors: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Helper — default empty output
// ---------------------------------------------------------------------------

function emptyOutput(): MediaAgentOutput {
  return {
    mediaLibraryIds: [],
    errors: [],
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Voiceover script templates
// ---------------------------------------------------------------------------

const VOICEOVER_TEMPLATES = [
  (animal: string) =>
    `Wait... is that ${animal} really doing that? I can't stop watching!`,
  (animal: string) =>
    `This ${animal} woke up and chose absolute chaos. You have to see this.`,
  (animal: string) =>
    `Nobody told this ${animal} it can't do that. And honestly? Legend.`,
  (animal: string) =>
    `If you're having a bad day, this ${animal} is about to fix that.`,
  (animal: string) =>
    `This ${animal} has more personality than most people I know. Just watch.`,
];

// ---------------------------------------------------------------------------
// saveToMediaLibrary
// ---------------------------------------------------------------------------

export async function saveToMediaLibrary(data: {
  type: string;
  url: string;
  thumbnailUrl?: string;
  topic: string;
  caption?: string;
  hashtags?: string;
  postType: string;
  videoSource?: string;
  photographer?: string;
  pexelsUrl?: string;
  voiceoverUrl?: string;
  duration?: number;
  status?: string;
}): Promise<string> {
  try {
    const record = await prisma.mediaLibrary.create({
      data: {
        type: data.type,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl || null,
        topic: data.topic,
        caption: data.caption || null,
        hashtags: data.hashtags || null,
        postType: data.postType,
        videoSource: data.videoSource || null,
        photographer: data.photographer || null,
        pexelsUrl: data.pexelsUrl || null,
        voiceoverUrl: data.voiceoverUrl || null,
        duration: data.duration || null,
        status: data.status || "SAVED",
      },
    });
    return record.id;
  } catch (error) {
    console.log("[Media Agent] Failed to save to MediaLibrary:", error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// runMediaAgent — main orchestrator
// ---------------------------------------------------------------------------

export async function runMediaAgent(
  input: MediaAgentInput
): Promise<MediaAgentOutput> {
  const output = emptyOutput();

  // -----------------------------------------------------------------------
  // Step 1: Extract animal from topic/subject
  // -----------------------------------------------------------------------

  let animal = "";

  try {
    if (input.subject) {
      animal = input.subject;
      console.log(`[Media Agent] Using provided subject: "${animal}"`);
    } else {
      console.log("[Media Agent] Extracting animal from topic via Claude...");
      animal = await generateWithClaude(
        "Extract the exact animal from this topic. Return ONLY the animal name, nothing else. No punctuation, no explanation.",
        `Extract the exact animal from this topic: '${input.topic}'. Return ONLY the animal name.`,
        64
      );
      animal = animal.trim().toLowerCase();
      console.log(`[Media Agent] Extracted animal: "${animal}"`);
    }
  } catch (error) {
    console.log("[Media Agent] Failed to extract animal:", error);
    output.errors.push(
      `Animal extraction failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    // Use a fallback from the topic
    animal = input.topic.split(" ").slice(0, 2).join(" ");
  }

  // -----------------------------------------------------------------------
  // Step 2: Search Pexels for real video
  // -----------------------------------------------------------------------

  let pexelsVideo: PexelsVideo | null = null;

  try {
    console.log(`[Media Agent] Searching Pexels for "${animal}"...`);
    pexelsVideo = await searchAnimalVideo(input.topic, animal);
    console.log(
      `[Media Agent] Found Pexels video: id=${pexelsVideo.id} duration=${pexelsVideo.duration}s`
    );

    // Download and save to Vercel Blob
    const savedUrl = await downloadAndSaveVideo(
      pexelsVideo.url,
      `reel-${Date.now()}`
    );

    output.videoUrl = savedUrl;
    output.thumbnailUrl = pexelsVideo.thumbnailUrl;
    output.photographer = pexelsVideo.photographer;
    output.pexelsUrl = pexelsVideo.pexelsUrl;
    output.videoDuration = pexelsVideo.duration;
    output.videoSource = "PEXELS";

    console.log(`[Media Agent] Video saved to Blob: ${savedUrl}`);
  } catch (error) {
    console.log("[Media Agent] Pexels video search failed:", error);
    output.warnings.push(
      `Pexels video failed: ${
        error instanceof Error ? error.message : String(error)
      }. Falling back to image only.`
    );
    // Continue — will fallback to image only
  }

  // -----------------------------------------------------------------------
  // Step 3: Generate DALL-E thumbnail image
  // -----------------------------------------------------------------------

  try {
    let imagePrompt = `Funny ${animal}, photorealistic, cinematic, vibrant, portrait, no text, no watermarks`;
    if (input.subject) {
      imagePrompt = `${input.subject}, ${imagePrompt}`;
    }

    console.log("[Media Agent] Generating DALL-E thumbnail...");
    const { imageUrl } = await generateImage(
      imagePrompt,
      "1024x1792",
      "hd",
      "vivid"
    );

    output.imageUrl = imageUrl;
    console.log(`[Media Agent] DALL-E image generated: ${imageUrl}`);
  } catch (error) {
    console.log("[Media Agent] DALL-E image generation failed:", error);
    output.errors.push(
      `DALL-E image failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    // Use Pexels thumbnail as fallback
    if (pexelsVideo?.thumbnailUrl) {
      output.imageUrl = pexelsVideo.thumbnailUrl;
      output.warnings.push("Using Pexels thumbnail as image fallback");
      console.log(
        `[Media Agent] Using Pexels thumbnail as fallback: ${pexelsVideo.thumbnailUrl}`
      );
    }
  }

  // -----------------------------------------------------------------------
  // Step 4: Generate ElevenLabs voiceover
  // -----------------------------------------------------------------------

  try {
    // Pick randomly from fun templates
    const template =
      VOICEOVER_TEMPLATES[
        Math.floor(Math.random() * VOICEOVER_TEMPLATES.length)
      ];
    const script = template(animal);

    console.log(`[Media Agent] Generating voiceover: "${script}"`);

    const audioBuffer = await textToSpeech(script);
    const voiceoverUrl = await saveAudio(audioBuffer);

    output.voiceoverUrl = voiceoverUrl;
    output.voiceoverScript = script;

    console.log(`[Media Agent] Voiceover saved: ${voiceoverUrl}`);
  } catch (error) {
    console.log("[Media Agent] Voiceover generation failed:", error);
    output.warnings.push(
      `Voiceover failed: ${
        error instanceof Error ? error.message : String(error)
      }. Continuing without voiceover.`
    );
    // Continue without voiceover
  }

  // -----------------------------------------------------------------------
  // Step 5: Save to MediaLibrary
  // -----------------------------------------------------------------------

  try {
    const mediaUrl = output.videoUrl || output.imageUrl;

    if (mediaUrl) {
      const mediaId = await saveToMediaLibrary({
        type: output.videoUrl ? "VIDEO" : "IMAGE",
        url: mediaUrl,
        thumbnailUrl: output.thumbnailUrl || output.imageUrl,
        topic: input.topic,
        caption: input.caption,
        hashtags: (input.hashtags || []).join(", "),
        postType: input.postType,
        videoSource: output.videoSource,
        photographer: output.photographer,
        pexelsUrl: output.pexelsUrl,
        voiceoverUrl: output.voiceoverUrl,
        duration: output.videoDuration,
        status: "SAVED",
      });
      output.mediaLibraryIds.push(mediaId);
      console.log(`[Media Agent] Saved to MediaLibrary: ${mediaId}`);
    }
  } catch (error) {
    console.log("[Media Agent] Failed to save to MediaLibrary:", error);
    output.errors.push(
      `MediaLibrary save failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // -----------------------------------------------------------------------
  // Step 6: Update Post record if postId provided
  // -----------------------------------------------------------------------

  if (input.postId) {
    try {
      await prisma.post.update({
        where: { id: input.postId },
        data: {
          imageUrl: output.imageUrl || null,
          videoUrl: output.videoUrl || null,
          voiceoverUrl: output.voiceoverUrl || null,
        },
      });
      console.log(`[Media Agent] Updated Post record: ${input.postId}`);
    } catch (error) {
      console.log("[Media Agent] Failed to update Post record:", error);
      output.errors.push(
        `Post update failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // -----------------------------------------------------------------------
  // Step 7: Auto-post to Instagram if requested
  // -----------------------------------------------------------------------

  if (input.autoPost) {
    try {
      const formattedCaption = (
        input.caption +
        "\n\n" +
        (input.hashtags || []).join(" ")
      ).slice(0, 2200);

      let igPostId: string | undefined;

      if (input.postType === "REEL" && output.videoUrl) {
        // Reel: create container -> poll -> publish
        console.log("[Media Agent] Posting Reel to Instagram...");
        const containerId = await createReelContainer(
          output.videoUrl,
          formattedCaption
        );
        await pollContainerStatus(containerId);
        igPostId = await publishContainer(containerId);
      } else if (output.imageUrl) {
        // Feed image: create container -> publish
        console.log("[Media Agent] Posting Feed image to Instagram...");
        const containerId = await createImageContainer(
          output.imageUrl,
          formattedCaption
        );
        igPostId = await publishContainer(containerId);
      } else {
        output.warnings.push(
          "Auto-post skipped: no image or video URL available"
        );
      }

      if (igPostId) {
        output.instagramPostId = igPostId;
        output.instagramUrl = `https://www.instagram.com/p/${igPostId}/`;
        console.log(
          `[Media Agent] Published to Instagram: ${output.instagramUrl}`
        );

        // Update Post record with Instagram details
        if (input.postId) {
          try {
            await prisma.post.update({
              where: { id: input.postId },
              data: {
                instagramPostId: igPostId,
                status: "PUBLISHED",
                publishedAt: new Date(),
              },
            });
          } catch (updateError) {
            console.log(
              "[Media Agent] Failed to update Post with IG details:",
              updateError
            );
            output.errors.push(
              "Failed to update Post record with Instagram details"
            );
          }
        }

        // Update MediaLibrary status
        try {
          const urlToMatch = output.videoUrl || output.imageUrl;
          if (urlToMatch) {
            await prisma.mediaLibrary.updateMany({
              where: { url: urlToMatch },
              data: {
                status: "POSTED",
                instagramPostId: igPostId,
                instagramUrl: output.instagramUrl,
              },
            });
          }
        } catch (updateError) {
          console.log(
            "[Media Agent] Failed to update MediaLibrary status:",
            updateError
          );
          // Non-fatal
        }
      }
    } catch (error) {
      console.log("[Media Agent] Instagram posting failed:", error);
      output.instagramError =
        error instanceof Error ? error.message : String(error);
      output.errors.push(
        `Instagram posting failed: ${output.instagramError}`
      );
      // Don't crash — posting failure is non-fatal
    }
  }

  console.log(
    `[Media Agent] Complete. Errors: ${output.errors.length}, Warnings: ${output.warnings.length}`
  );

  return output;
}
