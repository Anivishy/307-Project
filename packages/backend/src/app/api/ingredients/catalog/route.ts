import { NextRequest, NextResponse } from 'next/server';

import {
  findIngredientById,
  searchIngredients
} from '@/lib/constraints/ingredients';

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids');
  const query = request.nextUrl.searchParams.get('q') ?? '';
  const limit = Number(
    request.nextUrl.searchParams.get('limit') ?? '15'
  );

  if (ids) {
    return NextResponse.json({
      ingredients: ids
        .split(',')
        .map((id) => findIngredientById(id))
        .filter((ingredient) => ingredient !== undefined)
    });
  }

  return NextResponse.json({
    ingredients: searchIngredients(
      query,
      Number.isFinite(limit) ? limit : 15
    )
  });
}
