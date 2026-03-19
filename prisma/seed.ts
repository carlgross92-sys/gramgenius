import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hooks = [
    // Curiosity (10)
    { template: "Nobody talks about this side of [niche]:", category: "curiosity" },
    { template: "The [niche] secret that changed everything for me:", category: "curiosity" },
    { template: "What they don't tell you about [topic]:", category: "curiosity" },
    { template: "I discovered something that shocked me about [niche]:", category: "curiosity" },
    { template: "This one thing separates [beginners] from [experts] in [niche]:", category: "curiosity" },
    { template: "Most people get [topic] completely backwards. Here's why:", category: "curiosity" },
    { template: "I spent [time] learning [topic] so you don't have to:", category: "curiosity" },
    { template: "The real reason [common belief] is a myth:", category: "curiosity" },
    { template: "After [timeframe] in [niche], here's what I actually know:", category: "curiosity" },
    { template: "The [niche] truth nobody posts about:", category: "curiosity" },

    // Controversy (8)
    { template: "Hot take: [common practice] is actually hurting you", category: "controversy" },
    { template: "Unpopular opinion: [niche truth]", category: "controversy" },
    { template: "I'm going to say what everyone in [niche] is thinking:", category: "controversy" },
    { template: "Stop doing [popular thing]. Here's what actually works:", category: "controversy" },
    { template: "The [niche] advice you keep hearing is wrong. Here's why:", category: "controversy" },
    { template: "[Popular belief] is overrated. Fight me.", category: "controversy" },
    { template: "This is going to upset some people in [niche] but...", category: "controversy" },
    { template: "The [niche] industry doesn't want you to know this:", category: "controversy" },

    // FOMO (8)
    { template: "If you're not doing this in [niche], you're already behind:", category: "fomo" },
    { template: "Everyone in [niche] switched to this. Have you?", category: "fomo" },
    { template: "The [niche] strategy blowing up right now:", category: "fomo" },
    { template: "I gained [X result] in [timeframe] using this:", category: "fomo" },
    { template: "While you're [doing old thing], others are doing this:", category: "fomo" },
    { template: "This trend in [niche] is moving fast — catch it now:", category: "fomo" },
    { template: "The window for this [niche] opportunity is closing:", category: "fomo" },
    { template: "[Number] people already know this. Now you will too:", category: "fomo" },

    // Value (12)
    { template: "[Number] things I wish I knew when I started [niche]:", category: "value" },
    { template: "How to [achieve result] without [common obstacle]:", category: "value" },
    { template: "Step-by-step: [achieve desired outcome] in [timeframe]:", category: "value" },
    { template: "Free [niche] resource most people don't know exists:", category: "value" },
    { template: "The [niche] system that saved me [time/money/stress]:", category: "value" },
    { template: "Save this for later — [topic] explained simply:", category: "value" },
    { template: "Everything you need to know about [topic] in 60 seconds:", category: "value" },
    { template: "The beginner's guide to [topic] (no fluff):", category: "value" },
    { template: "How I [achieved result] without [expensive thing]:", category: "value" },
    { template: "Your [timeframe] plan to [goal]:", category: "value" },
    { template: "Quick tip: [actionable insight] → [result]", category: "value" },
    { template: "[Number] mistakes to avoid in [niche]:", category: "value" },

    // Story (7)
    { template: "I almost gave up on [niche] until this happened:", category: "story" },
    { template: "Last [timeframe], I hit my lowest point with [topic]. Here's what I did:", category: "story" },
    { template: "The moment everything clicked for me in [niche]:", category: "story" },
    { template: "6 months ago I knew nothing about [topic]. Now [result].", category: "story" },
    { template: "POV: You finally figured out [pain point]", category: "story" },
    { template: "This is the story of how [outcome happened]:", category: "story" },
    { template: "Real talk: [personal honest moment about niche]", category: "story" },

    // Question (5)
    { template: "What's the #1 thing holding you back from [goal]?", category: "question" },
    { template: "Am I the only one who [relatable experience in niche]?", category: "question" },
    { template: "Which type of [niche person] are you?", category: "question" },
    { template: "What would you do if [scenario in niche]?", category: "question" },
    { template: "Tell me your [niche goal] and I'll tell you where to start:", category: "question" },
  ];

  console.log(`Seeding ${hooks.length} hook templates...`);

  await prisma.hookTemplate.createMany({
    data: hooks.map((hook) => ({
      template: hook.template,
      category: hook.category,
      timesUsed: 0,
      avgEngagementRate: 0,
      isActive: true,
    })),
  });

  console.log(`Successfully seeded ${hooks.length} hook templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
