import { NextResponse } from "next/server";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { checkRateLimit } from "@/lib/rateLimit";

const execAsync = promisify(exec);

const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', binaryName);

export async function GET(request: Request) {
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const format = searchParams.get("format") || "mp4";

  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }

  const isValidSource = url.includes("youtube.com") || url.includes("youtu.be") || 
                        url.includes("facebook.com") || url.includes("fb.watch") || url.includes("fb.video") ||
                        url.includes("tiktok.com") || url.includes("x.com") || url.includes("twitter.com") ||
                        url.includes("linkedin.com");

  if (!isValidSource) {
    return NextResponse.json({ error: "Invalid or missing URL" }, { status: 400 });
  }

  try {
    // Get title quickly
    const { stdout: titleOut } = await execAsync(`"${ytDlpPath}" --print "title" --no-warnings --no-check-certificates "${url}"`);
    const title = titleOut.trim().replace(/[^a-z0-9\s]/gi, '_').replace(/\s+/g, '_').toLowerCase() || "download";

    const contentType = format === "mp3" ? "audio/mpeg" : "video/mp4";
    const extension = format === "mp3" ? "mp3" : "mp4";
    const formatArg = format === 'mp3' ? 'bestaudio' : 'best';

    const child = spawn(ytDlpPath, [
      '--no-check-certificates', 
      '--no-warnings', 
      '-f', formatArg, 
      '-o', '-', 
      url
    ]);

    const readable = new ReadableStream({
        start(controller) {
            child.stdout?.on("data", (chunk) => {
                controller.enqueue(new Uint8Array(chunk));
            });
            child.stdout?.on("end", () => {
                controller.close();
            });
            child.stdout?.on("error", (err) => {
                controller.error(err);
            });
            child.stderr?.on("data", (data) => {
                console.log(`yt-dlp stderr: ${data.toString()}`);
            });
            child.on("error", (err) => {
                console.error("yt-dlp spawn error:", err);
                controller.error(err);
            });
            child.on("close", (code) => {
                if (code !== 0) console.log(`yt-dlp exited with code ${code}`);
            });
        },
        cancel() {
            child.kill();
        }
    });

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${title}.${extension}"`);
    headers.set('Content-Type', contentType);

    return new NextResponse(readable, {
      status: 200,
      headers
    });
  } catch (error: any) {
     console.error("Error downloading:", error);
     return NextResponse.json({ error: "Failed to download" }, { status: 500 });
  }
}
