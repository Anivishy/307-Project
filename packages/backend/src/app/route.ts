import { NextResponse } from "next/server";

// Tiny smoke-test route from the initial Next.js setup; this is not a Recipe OS API.
export async function GET() {
  return NextResponse.json({ message: "Hello world!" });
}
