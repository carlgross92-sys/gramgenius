import prisma from "@/lib/prisma";
import { generateWithClaude } from "@/lib/anthropic";
import { generateImage } from "@/lib/openai";
import { imageToVideo, pollTask, downloadVideo } from "@/lib/runway";
import { textToSpeech, saveAudio } from "@/lib/elevenlabs";
import {
  createImageContainer,
  createReelContainer,
  pollContainerStatus,
  publishContainer,
} from "@/lib/meta";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface MediaAgentInput {
  postType: "FEED" | "CAROUSEL" | "REEL" | "STORY";
  topic: string;
  caption: string;
  hashtags: string[];
  visualConcept: {
    dallePrompt: string;
    colorMood?: string;
    compositionStyle?: string;
    visualType?: string;
  };
  strategy: { format?: string; tone?: string };
  autoPost: boolean;
  postId?: string; // existing post to update
}

export interface ReelScene {
  sceneNumber: number;
  onScreenText: string;
  voiceoverLine: string;
  visualDescription: string;
  duration: number;
  imageUrl?: string;
  videoUrl?: string;
}

export interface MediaAgentOutput {
  imageUrl?: string;
  reelScript?: { hookText: string; scenes: ReelScene[]; musicMood: string };
  sceneImages: string[];
  sceneVideos: string[];
  voiceoverUrl?: string;
  instagramPostId?: string;
  instagramUrl?: string;
  mediaLibraryIds: string[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Helper — default empty output
// ---------------------------------------------------------------------------

function emptyOutput(): MediaAgentOutput {
  return {
    sceneImages: [],
    sceneVideos: [],
    mediaLibraryIds: [],
    errors: [],
  };
}

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
        status: data.status || "SAVED",
      },
    });
    return record.id;
  } catch (error) {
    console.error("[saveToMediaLibrary] Failed to save:", error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// generateFeedMedia
// ---------------------------------------------------------------------------

export async function generateFeedMedia(
  input: MediaAgentInput
): Promise<MediaAgentOutput> {
  const output = emptyOutput();

  try {
    // 1. Enhance the DALL-E prompt via Claude
    const enhancedPrompt = await generateWithClaude(
      "You are a DALL-E prompt engineer. Enhance the given prompt to be photorealistic, cinematic, with funny animals context, vibrant colors. Never include text in the image. Keep the final prompt under 900 characters. Return ONLY the enhanced prompt text, nothing else.",
      `Enhance this DALL-E prompt: "${input.visualConcept.dallePrompt}"${
        input.visualConcept.colorMood
          ? ` Color mood: ${input.visualConcept.colorMood}.`
          : ""
      }${
        input.visualConcept.compositionStyle
          ? ` Composition: ${input.visualConcept.compositionStyle}.`
          : ""
      }`,
      1024
    );

    const finalPrompt = enhancedPrompt.slice(0, 900);

    // 2. Generate image — already saves to Vercel Blob
    const { imageUrl, revisedPrompt } = await generateImage(
      finalPrompt,
      "1024x1792",
      "hd",
      "vivid"
    );

    output.imageUrl = imageUrl;

    // 3. Save to MediaLibrary
    const mediaId = await saveToMediaLibrary({
      type: "IMAGE",
      url: imageUrl,
      topic: input.topic,
      caption: input.caption,
      hashtags: (input.hashtags || []).join(", "),
      postType: "FEED",
      status: "SAVED",
    });
    output.mediaLibraryIds.push(mediaId);

    // 4. If postId provided, update the Post record
    if (input.postId) {
      try {
        await prisma.post.update({
          where: { id: input.postId },
          data: {
            imageUrl,
            imagePrompt: revisedPrompt,
          },
        });
      } catch (updateError) {
        console.error(
          "[generateFeedMedia] Failed to update Post record:",
          updateError
        );
        output.errors.push("Failed to update Post record with image URL");
      }
    }
  } catch (error) {
    console.error("[generateFeedMedia] Error:", error);
    output.errors.push(
      `Feed media generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return output;
}

// ---------------------------------------------------------------------------
// generateReelMedia
// ---------------------------------------------------------------------------

export async function generateReelMedia(
  input: MediaAgentInput
): Promise<MediaAgentOutput> {
  const output = emptyOutput();

  try {
    // 1. Generate reel script via Claude
    const scriptJson = await generateWithClaude(
      `You are a creative director for funny animal Instagram Reels. Generate a reel script as valid JSON with this exact structure:
{
  "hookText": "attention-grabbing hook text",
  "scenes": [
    {
      "sceneNumber": 1,
      "onScreenText": "text overlay for the scene",
      "voiceoverLine": "narration for this scene",
      "visualDescription": "detailed visual description for image generation",
      "duration": 5
    }
  ],
  "musicMood": "upbeat/dramatic/chill/etc"
}
Generate exactly 3 scenes to keep API costs low. Each scene duration should be 5 seconds. Make it funny, engaging, and shareable. Topic context: ${input.strategy.tone ? `Tone: ${input.strategy.tone}.` : ""} ${input.strategy.format ? `Format: ${input.strategy.format}.` : ""}
Return ONLY valid JSON, no markdown, no code blocks.`,
      `Create a reel script about: "${input.topic}"\nCaption context: "${input.caption}"`,
      2048
    );

    let reelScript: {
      hookText: string;
      scenes: ReelScene[];
      musicMood: string;
    };

    try {
      const cleaned = scriptJson
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      reelScript = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("[generateReelMedia] Failed to parse reel script:", parseError);
      output.errors.push("Failed to parse reel script from Claude");
      return output;
    }

    output.reelScript = reelScript;

    // 2. Process each scene (max 3, with try/catch per scene)
    const scenes = (reelScript.scenes || []).slice(0, 3);

    for (const scene of scenes) {
      try {
        // 2a. Generate image for this scene
        const scenePrompt = `${scene.visualDescription} funny animals, cinematic, vibrant, no text`;
        const { imageUrl } = await generateImage(
          scenePrompt,
          "1024x1792",
          "hd",
          "vivid"
        );

        scene.imageUrl = imageUrl;
        output.sceneImages.push(imageUrl);

        // Save image to MediaLibrary
        const imageMediaId = await saveToMediaLibrary({
          type: "IMAGE",
          url: imageUrl,
          topic: input.topic,
          caption: `Reel scene ${scene.sceneNumber}: ${scene.onScreenText}`,
          hashtags: (input.hashtags || []).join(", "),
          postType: "REEL",
          status: "SAVED",
        });
        output.mediaLibraryIds.push(imageMediaId);

        // 2b. Try Runway ML image-to-video
        try {
          const taskId = await imageToVideo(
            imageUrl,
            scene.visualDescription,
            5,
            "720:1280"
          );

          const taskResult = await pollTask(taskId);

          if (taskResult.status === "SUCCEEDED" && taskResult.outputUrl) {
            const filename = `reel-scene-${scene.sceneNumber}-${Date.now()}.mp4`;
            const videoUrl = await downloadVideo(taskResult.outputUrl, filename);

            scene.videoUrl = videoUrl;
            output.sceneVideos.push(videoUrl);

            // Save video to MediaLibrary
            const videoMediaId = await saveToMediaLibrary({
              type: "VIDEO",
              url: videoUrl,
              thumbnailUrl: imageUrl,
              topic: input.topic,
              caption: `Reel scene ${scene.sceneNumber} video`,
              hashtags: (input.hashtags || []).join(", "),
              postType: "REEL",
              status: "SAVED",
            });
            output.mediaLibraryIds.push(videoMediaId);
          } else {
            console.error(
              `[generateReelMedia] Runway task did not succeed for scene ${scene.sceneNumber}: ${taskResult.status}`
            );
            output.errors.push(
              `Runway video generation incomplete for scene ${scene.sceneNumber}`
            );
          }
        } catch (runwayError) {
          console.error(
            `[generateReelMedia] Runway failed for scene ${scene.sceneNumber}:`,
            runwayError
          );
          output.errors.push(
            `Runway failed for scene ${scene.sceneNumber}: ${
              runwayError instanceof Error
                ? runwayError.message
                : String(runwayError)
            }`
          );
          // Continue — we still have the image
        }
      } catch (sceneError) {
        console.error(
          `[generateReelMedia] Scene ${scene.sceneNumber} failed entirely:`,
          sceneError
        );
        output.errors.push(
          `Scene ${scene.sceneNumber} failed: ${
            sceneError instanceof Error
              ? sceneError.message
              : String(sceneError)
          }`
        );
        // Continue to next scene
      }
    }

    // 3. Generate voiceover from all scene voiceover lines
    try {
      const fullScript = (scenes || [])
        .map((s) => s.voiceoverLine)
        .filter(Boolean)
        .join(" ... ");

      if (fullScript.trim()) {
        const audioBuffer = await textToSpeech(fullScript);
        const voiceoverUrl = await saveAudio(audioBuffer);
        output.voiceoverUrl = voiceoverUrl;
      }
    } catch (voiceoverError) {
      console.error("[generateReelMedia] Voiceover generation failed:", voiceoverError);
      output.errors.push(
        `Voiceover generation failed: ${
          voiceoverError instanceof Error
            ? voiceoverError.message
            : String(voiceoverError)
        }`
      );
      // Continue without voiceover
    }

    // 4. If postId provided, update Post record
    if (input.postId) {
      try {
        const primaryVideoUrl =
          (output.sceneVideos || [])[0] || (output.sceneImages || [])[0] || null;

        await prisma.post.update({
          where: { id: input.postId },
          data: {
            videoUrl: primaryVideoUrl,
            voiceoverUrl: output.voiceoverUrl || null,
            reelScript: JSON.stringify(reelScript),
          },
        });
      } catch (updateError) {
        console.error(
          "[generateReelMedia] Failed to update Post record:",
          updateError
        );
        output.errors.push("Failed to update Post record with reel data");
      }
    }
  } catch (error) {
    console.error("[generateReelMedia] Error:", error);
    output.errors.push(
      `Reel media generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return output;
}

// ---------------------------------------------------------------------------
// postToInstagram
// ---------------------------------------------------------------------------

export async function postToInstagram(input: {
  postType: string;
  imageUrl?: string;
  videoUrl?: string;
  caption: string;
  hashtags: string[];
}): Promise<{ instagramPostId: string; instagramUrl: string }> {
  try {
    // 1. Format caption with hashtags, truncate to 2200 chars
    const formattedCaption = (
      input.caption +
      "\n\n" +
      (input.hashtags || []).join(" ")
    ).slice(0, 2200);

    let postId: string;

    if (input.postType === "REEL" && input.videoUrl) {
      // 2. Reel: create container → poll → publish
      const containerId = await createReelContainer(
        input.videoUrl,
        formattedCaption
      );
      await pollContainerStatus(containerId);
      postId = await publishContainer(containerId);
    } else if (input.imageUrl) {
      // 3. Feed image: create container → publish
      const containerId = await createImageContainer(
        input.imageUrl,
        formattedCaption
      );
      postId = await publishContainer(containerId);
    } else {
      throw new Error(
        "Cannot post to Instagram: no image URL for FEED or no video URL for REEL"
      );
    }

    const instagramUrl = `https://www.instagram.com/p/${postId}/`;

    // 4. Update MediaLibrary entries that match the posted URL
    try {
      const urlToMatch = input.videoUrl || input.imageUrl;
      if (urlToMatch) {
        await prisma.mediaLibrary.updateMany({
          where: { url: urlToMatch },
          data: {
            status: "POSTED",
            instagramPostId: postId,
            instagramUrl,
          },
        });
      }
    } catch (updateError) {
      console.error(
        "[postToInstagram] Failed to update MediaLibrary status:",
        updateError
      );
      // Non-fatal — the post was already published
    }

    return { instagramPostId: postId, instagramUrl };
  } catch (error) {
    console.error("[postToInstagram] Error:", error);
    throw new Error(
      `Instagram posting failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// ---------------------------------------------------------------------------
// runMediaAgent — main orchestrator
// ---------------------------------------------------------------------------

export async function runMediaAgent(
  input: MediaAgentInput
): Promise<MediaAgentOutput> {
  let output: MediaAgentOutput;

  try {
    // Generate media based on post type
    if (input.postType === "REEL") {
      output = await generateReelMedia(input);
    } else {
      // FEED, CAROUSEL, STORY all use feed media generation
      output = await generateFeedMedia(input);
    }

    // Optionally post to Instagram
    if (input.autoPost) {
      try {
        const postPayload: {
          postType: string;
          imageUrl?: string;
          videoUrl?: string;
          caption: string;
          hashtags: string[];
        } = {
          postType: input.postType,
          caption: input.caption,
          hashtags: input.hashtags || [],
        };

        if (input.postType === "REEL") {
          // Prefer the first video, fall back to first image
          postPayload.videoUrl =
            (output.sceneVideos || [])[0] || undefined;
          postPayload.imageUrl =
            (output.sceneImages || [])[0] || output.imageUrl || undefined;

          // If we have no video at all, fall back to posting as a feed image
          if (!postPayload.videoUrl && postPayload.imageUrl) {
            postPayload.postType = "FEED";
          }
        } else {
          postPayload.imageUrl = output.imageUrl;
        }

        if (postPayload.imageUrl || postPayload.videoUrl) {
          const igResult = await postToInstagram(postPayload);
          output.instagramPostId = igResult.instagramPostId;
          output.instagramUrl = igResult.instagramUrl;

          // Update the Post record with Instagram details
          if (input.postId) {
            try {
              await prisma.post.update({
                where: { id: input.postId },
                data: {
                  instagramPostId: igResult.instagramPostId,
                  status: "PUBLISHED",
                  publishedAt: new Date(),
                },
              });
            } catch (updateError) {
              console.error(
                "[runMediaAgent] Failed to update Post with IG details:",
                updateError
              );
              output.errors.push(
                "Failed to update Post record with Instagram details"
              );
            }
          }
        } else {
          output.errors.push(
            "Auto-post skipped: no image or video URL available"
          );
        }
      } catch (postError) {
        console.error("[runMediaAgent] Instagram posting failed:", postError);
        output.errors.push(
          `Instagram posting failed: ${
            postError instanceof Error
              ? postError.message
              : String(postError)
          }`
        );
      }
    }
  } catch (error) {
    console.error("[runMediaAgent] Fatal error:", error);
    output = emptyOutput();
    output.errors.push(
      `Media agent failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return output;
}
