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

    return Response.json({ brand });
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
    const {
      name,
      instagramHandle,
      niche,
      targetAudience,
      brandVoice,
      contentPillars,
      postingGoal,
      autoPostEnabled,
      timezone,
      bestTimesJson,
    } = body;

    if (!name || !instagramHandle || !niche || !targetAudience || !brandVoice) {
      return Response.json(
        { error: "Missing required fields: name, instagramHandle, niche, targetAudience, brandVoice" },
        { status: 400 }
      );
    }

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
          contentPillars: contentPillars ?? existing.contentPillars,
          postingGoal: postingGoal ?? existing.postingGoal,
          autoPostEnabled: autoPostEnabled ?? existing.autoPostEnabled,
          timezone: timezone ?? existing.timezone,
          bestTimesJson: bestTimesJson ?? existing.bestTimesJson,
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
          contentPillars: contentPillars ?? "[]",
          postingGoal: postingGoal ?? 4,
          autoPostEnabled: autoPostEnabled ?? false,
          timezone: timezone ?? "America/Los_Angeles",
          bestTimesJson: bestTimesJson ?? "[]",
        },
      });
    }

    return Response.json({ brand }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("Failed to save brand profile:", error);
    return Response.json(
      { error: "Failed to save brand profile" },
      { status: 500 }
    );
  }
}
