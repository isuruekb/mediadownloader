import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { checkRateLimit } from "@/lib/rateLimit";

const execAsync = promisify(exec);

// Path to the downloaded yt-dlp binary
// In a true production app, yt-dlp is usually installed on the system instead of using a node_module binary,
// but for this Node/Next.js environment locally we use the automatically bundled one.
const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', binaryName);

export async function GET(request: Request) {
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }

  const isValidSource = url.includes("youtube.com") || url.includes("youtu.be") || 
                        url.includes("facebook.com") || url.includes("fb.watch") || url.includes("fb.video") ||
                        url.includes("tiktok.com") || url.includes("x.com") || url.includes("twitter.com") ||
                        url.includes("linkedin.com");

  if (!isValidSource) {
    return NextResponse.json({ error: "Invalid Supported URL" }, { status: 400 });
  }

  try {
    // We use a high maxBuffer because the JSON payload for youtube manifests can be very large
    const { stdout } = await execAsync(`"${ytDlpPath}" --dump-json --no-warnings --no-check-certificates "${url}"`, { maxBuffer: 1024 * 1024 * 10 });
    const info = JSON.parse(stdout);

    return NextResponse.json({
      title: info.title || "Social Media Video",
      duration: info.duration?.toString() || info.duration_string || "0",
      thumbnail: info.thumbnail || "",
      author: info.uploader || info.creator || "Unknown Author",
      isPrivate: false,
      isAgeRestricted: info.age_limit > 0
    });
  } catch (error: any) {
    console.error("Error fetching video info:", error);
    return NextResponse.json(
      { error: "Failed to fetch video info. It might be private or unavailable.", details: error?.stderr || error?.message },
      { status: 500 }
    );
  }
}
