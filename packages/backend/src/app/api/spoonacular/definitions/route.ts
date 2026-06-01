import { NextResponse } from 'next/server';

import { getSpoonacularDefinitions } from '@/lib/spoonacular/definitions';

export async function GET() {
  return NextResponse.json({
    definitions: getSpoonacularDefinitions()
  });
}
