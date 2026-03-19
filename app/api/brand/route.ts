import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const brand = await prisma.brandProfile.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!brand) {
      return Response.json({ brand: null }, { status: 200 });
    }

    // Return both raw fields and mapped names for page compatibility
    let parsedPillars: string[] = [];
    try { parsedPillars = JSON.parse(brand.contentPillars); } catch { parsedPillars = []; }
    let parsedTimes: unknown[] = [];
    try { parsedTimes = JSON.parse(brand.bestTimesJson); } catch { parsedTimes = []; }

    return Response.json({
      ...brand,
      // Mapped names for the brand page
      brandName: brand.name,
      handle: brand.instagramHandle,
      autoPost: brand.autoPostEnabled,
      contentPillars: parsedPillars,
      bestPostingTimes: parsedTimes,
    });
  } catch (error) {
    console.error("Failed to load brand profile:", error);
    return Response.json(
      { error: "Failed to load brand profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Accept both naming conventions (page sends brandName/handle, schema uses name/instagramHandle)
    const name = body.name || body.brandName;
    const instagramHandle = body.instagramHandle || body.handle;
    const niche = body.niche;
    const targetAudience = body.targetAudience;
    const brandVoice = body.brandVoice;
    const contentPillars = body.contentPillars;
    const postingGoal = body.postingGoal;
    const autoPostEnabled = body.autoPostEnabled ?? body.autoPost;
    const timezone = body.timezone;
    const bestTimesJson = body.bestTimesJson || (body.bestPostingTimes ? JSON.stringify(body.bestPostingTimes) : undefined);

    if (!name || !instagramHandle || !niche || !targetAudience || !brandVoice) {
      return Response.json(
        { error: `Missing required fields. Got: name=${!!name}, handle=${!!instagramHandle}, niche=${!!niche}, audience=${!!targetAudience}, voice=${!!brandVoice}` },
        { status: 400 }
      );
    }

    // Serialize arrays to JSON strings for the DB
    const pillarsStr = Array.isArray(contentPillars) ? JSON.stringify(contentPillars) : contentPillars;
    const timesStr = typeof bestTimesJson === "string" ? bestTimesJson : (bestTimesJson ? JSON.stringify(bestTimesJson) : undefined);

    const existing = await prisma.brandProfile.findFirst();

    let brand;
    if (existing) {
      brand = await prisma.brandProfile.update({
        where: { id: existing.id },
        data: {
          name,
          instagramHandle,
          niche,
          targetAudience,
          brandVoice,
          contentPillars: pillarsStr ?? existing.contentPillars,
          postingGoal: postingGoal ?? existing.postingGoal,
          autoPostEnabled: autoPostEnabled ?? existing.autoPostEnabled,
          timezone: timezone ?? existing.timezone,
          bestTimesJson: timesStr ?? existing.bestTimesJson,
        },
      });
    } else {
      brand = await prisma.brandProfile.create({
        data: {
          name,
          instagramHandle,
          niche,
          targetAudience,
          brandVoice,
          contentPillars: pillarsStr ?? "[]",
          postingGoal: postingGoal ?? 4,
          autoPostEnabled: autoPostEnabled ?? false,
          timezone: timezone ?? "America/Los_Angeles",
          bestTimesJson: timesStr ?? "[]",
        },
      });
    }

    return Response.json({ brand }, { status: existing ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to save brand profile:", message);
    return Response.json(
      { error: `Failed to save brand profile: ${message}` },
      { status: 500 }
    );
  }
}
