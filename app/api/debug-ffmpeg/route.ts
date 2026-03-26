import { execSync } from "child_process";

export async function GET() {
  try {
    const ffmpegPath = require("ffmpeg-static") as string;
    const version = execSync(`"${ffmpegPath}" -version`, { timeout: 10000, stdio: "pipe" }).toString().split("\n")[0];
    const codecs = execSync(`"${ffmpegPath}" -codecs 2>&1 | head -5`, { timeout: 10000, stdio: "pipe" }).toString();
    return Response.json({ ffmpegPath, version, codecs: codecs.substring(0, 500) });
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message || "unknown";
    const stderr = (err as { stderr?: Buffer })?.stderr?.toString() || "";
    return Response.json({ error: msg.substring(0, 300), stderr: stderr.substring(0, 300) });
  }
}
