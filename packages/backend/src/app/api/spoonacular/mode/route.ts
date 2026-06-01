import { NextResponse } from 'next/server';

import { getSpoonacularModeSummary } from '@/lib/spoonacular/config';

export async function GET() {
  return NextResponse.json(getSpoonacularModeSummary());
}
