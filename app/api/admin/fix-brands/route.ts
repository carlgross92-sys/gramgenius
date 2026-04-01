import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const allBrands = await prisma.brandProfile.findMany();
    console.log("All brands:", allBrands.map(b => `${b.id} @${b.instagramHandle} "${b.name}"`));

    // Delete duplicate Karina brands (keep the one with most data)
    const karinaBrands = allBrands.filter(
      b => b.instagramHandle === "karinagarcia5019"
    );

    if (karinaBrands.length > 1) {
      const best = karinaBrands.sort((a, b) => {
        const sa = [a.targetAudience, a.contentPillars, a.niche].filter(f => f && f.length > 10).length;
        const sb = [b.targetAudience, b.contentPillars, b.niche].filter(f => f && f.length > 10).length;
        return sb - sa;
      })[0];

      const dupeIds = karinaBrands.filter(b => b.id !== best.id).map(b => b.id);
      // Delete associated data first
      for (const id of dupeIds) {
        await prisma.contentJob.deleteMany({ where: { brandProfileId: id } });
      }
      await prisma.brandProfile.deleteMany({ where: { id: { in: dupeIds } } });
      console.log(`Deleted ${dupeIds.length} duplicate Karina brands`);
    }

    // Update remaining Karina with full details
    const karina = await prisma.brandProfile.findFirst({ where: { instagramHandle: "karinagarcia5019" } });
    if (karina) {
      await prisma.brandProfile.update({
        where: { id: karina.id },
        data: {
          name: "Karina Garcia",
          niche: "Personal Brand",
          brandVoice: "Bold & Direct",
          targetAudience: "Conservative women and men aged 25-50 who support traditional values, patriotism, and Trump. Beautiful confident women who are proudly conservative.",
          contentPillars: JSON.stringify([
            "Conservative values and American pride",
            "Attractive lifestyle and fashion content",
            "Trump and MAGA support",
            "Faith family and traditional values",
            "Motivational and empowering women content",
          ]),
          postingGoal: 7,
          autoPostEnabled: true,
        },
      });
    }

    // Check if chewy_sacramento exists
    const chewy = await prisma.brandProfile.findFirst({
      where: {
        OR: [
          { instagramHandle: "chewy_sacramento" },
          { name: { contains: "Chewy" } },
          { name: { contains: "Funny Animal" } },
        ],
      },
    });

    if (!chewy) {
      await prisma.brandProfile.create({
        data: {
          instagramHandle: "chewy_sacramento",
          name: "Funny Animals",
          niche: "Entertainment",
          brandVoice: "Humorous",
          targetAudience: "Animal lovers aged 18-45, pet owners, people who scroll for funny animal content and laughs.",
          contentPillars: JSON.stringify([
            "Funny pet moments and fails",
            "Cute animal reactions and expressions",
            "Wild animal encounters and surprises",
            "Adorable baby animals",
            "Animals doing human things",
          ]),
          postingGoal: 7,
          autoPostEnabled: true,
          timezone: "America/Los_Angeles",
          bestTimesJson: JSON.stringify([
            { day: "Monday", hour: "19" },
            { day: "Tuesday", hour: "19" },
            { day: "Friday", hour: "18" },
            { day: "Saturday", hour: "11" },
            { day: "Sunday", hour: "11" },
          ]),
        },
      });
      console.log("Created chewy_sacramento brand");
    }

    // Create engines for both brands
    const finalBrands = await prisma.brandProfile.findMany();
    for (const brand of finalBrands) {
      const existing = await prisma.continuousEngine.findFirst({
        where: { brandProfileId: brand.id },
      });
      if (!existing) {
        await prisma.continuousEngine.create({
          data: {
            brandProfileId: brand.id,
            enabled: true,
            postsPerDay: 7,
            requireVoiceover: false,
            minQualityScore: 20,
          },
        });
        console.log(`Created engine for @${brand.instagramHandle}`);
      } else if (!existing.enabled) {
        await prisma.continuousEngine.update({
          where: { id: existing.id },
          data: { enabled: true, requireVoiceover: false, minQualityScore: 20 },
        });
      }
    }

    const result = await prisma.brandProfile.findMany();
    return Response.json({
      success: true,
      brands: result.map(b => ({ id: b.id, handle: b.instagramHandle, name: b.name })),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
