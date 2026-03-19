export async function GET() {
  const checks: Record<string, string> = {};

  // Check each env var: present, placeholder, or missing
  const vars = [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "RUNWAYML_API_KEY",
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_VOICE_ID",
    "DATABASE_URL",
    "BLOB_READ_WRITE_TOKEN",
    "CRON_SECRET",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "META_ACCESS_TOKEN",
  ];

  for (const key of vars) {
    const val = process.env[key];
    if (!val) {
      checks[key] = "MISSING";
    } else if (val.includes("your_") || val.includes("_here")) {
      checks[key] = "PLACEHOLDER";
    } else {
      // Show first 8 chars + length for verification without exposing full key
      checks[key] = `SET (${val.substring(0, 8)}... len=${val.length})`;
    }
  }

  // Quick ElevenLabs connectivity test
  let elevenlabsStatus = "not tested";
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY || "" },
    });
    elevenlabsStatus = `HTTP ${res.status} ${res.ok ? "OK" : "FAIL"}`;
  } catch (e) {
    elevenlabsStatus = `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }

  return Response.json({
    env: checks,
    tests: { elevenlabs: elevenlabsStatus },
    timestamp: new Date().toISOString(),
  });
}
