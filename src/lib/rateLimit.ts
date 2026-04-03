import { NextResponse } from 'next/server';

// Simple in-memory rate limiter (Warning: for production with multiple instances/edge runtime, use Redis/Upstash)
const requestCounts = new Map<string, { count: number, resetTime: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 10;     // Max 10 requests per minute per IP

export function checkRateLimit(req: Request): NextResponse | null {
  // Get IP from headers
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0] || realIp || "unknown-ip";

  const now = Date.now();
  const record = requestCounts.get(ip) || { count: 0, resetTime: now + WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + WINDOW_MS;
  } else {
    record.count += 1;
  }

  requestCounts.set(ip, record);

  if (record.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute before trying again." }, 
      { status: 429 }
    );
  }

  return null;
}
