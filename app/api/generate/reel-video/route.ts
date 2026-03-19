import { NextRequest } from "next/server";
import { generateImage } from "@/lib/openai";
import { imageToVideo, pollTask, downloadVideo } from "@/lib/runway";

interface Scene {
  sceneNumber: number;
  duration: string;
  onScreenText: string;
  voiceoverLine: string;
  visualDescription: string;
  bRollSuggestion: string;
}

interface SceneResult {
  sceneNumber: number;
  imageUrl: string | null;
  videoUrl: string | null;
  error: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenes, postId } = body;

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return Response.json(
        { error: "Missing required field: scenes (array)" },
        { status: 400 }
      );
    }

    const sceneResults: SceneResult[] = [];

    for (const scene of scenes as Scene[]) {
      const result: SceneResult = {
        sceneNumber: scene.sceneNumber,
        imageUrl: null,
        videoUrl: null,
        error: null,
      };

      try {
        const { imageUrl } = await generateImage(
          `${scene.visualDescription}. Cinematic, high quality, Instagram Reel frame. No text, no words, no watermarks.`,
          "1024x1792",
          "hd",
          "vivid"
        );
        result.imageUrl = imageUrl;

        try {
          const task = await imageToVideo(
            imageUrl,
            scene.visualDescription,
            5,
            "9:16"
          );

          const completedTask = await pollTask(task);

          if (completedTask.outputUrl) {
            const videoPath = await downloadVideo(
              completedTask.outputUrl,
              `scene_${scene.sceneNumber}_${postId || "draft"}.mp4`
            );
            result.videoUrl = videoPath;
          } else {
            result.error = "Runway video generation timed out or failed";
          }
        } catch (runwayError) {
          console.error(
            `Runway failed for scene ${scene.sceneNumber}:`,
            runwayError
          );
          result.error = `Runway video generation failed: ${runwayError instanceof Error ? runwayError.message : "Unknown error"}`;
        }
      } catch (imageError) {
        console.error(
          `Image generation failed for scene ${scene.sceneNumber}:`,
          imageError
        );
        result.error = `Image generation failed: ${imageError instanceof Error ? imageError.message : "Unknown error"}`;
      }

      sceneResults.push(result);
    }

    const scenePaths = sceneResults
      .filter((s) => s.videoUrl)
      .map((s) => s.videoUrl);

    return Response.json({
      scenePaths,
      scenes: sceneResults,
      totalScenes: scenes.length,
      successfulScenes: scenePaths.length,
      failedScenes: scenes.length - scenePaths.length,
    });
  } catch (error) {
    console.error("Failed to generate reel video:", error);
    return Response.json(
      { error: "Failed to generate reel video" },
      { status: 500 }
    );
  }
}
