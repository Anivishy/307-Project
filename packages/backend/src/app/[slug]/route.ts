import { NextRequest, NextResponse } from "next/server";

// Dynamic-route example kept for learning the App Router's [param] convention.
// It should be removed or moved under /api/debug before production.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  return NextResponse.json({ message: `Hello ${slug}!` });
}
