const required = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "RUNWAYML_API_KEY",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "DATABASE_URL",
];

const optional = [
  "BLOB_READ_WRITE_TOKEN",
  "CRON_SECRET",
  "META_ACCESS_TOKEN",
  "INSTAGRAM_BUSINESS_ACCOUNT_ID",
  "FACEBOOK_PAGE_ID",
  "META_APP_ID",
  "META_APP_SECRET",
];

export function checkEnv(): string[] {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`[GramGenius] Missing required env vars: ${missing.join(", ")}`);
  }
  const missingOptional = optional.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn(`[GramGenius] Missing optional env vars: ${missingOptional.join(", ")}`);
  }
  return missing;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}
