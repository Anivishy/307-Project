import { NextRequest, NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { handleApiError } from '@/lib/api-response';
import {
  findCatalogIngredientsByIds,
  searchCatalogIngredients
} from '@/lib/ingredient-catalog-service';
import { isSpoonacularCatalogMockMode } from '@/lib/spoonacular/config';

function parseLimit(value: string | null) {
  const limit = Number(value ?? '15');
  return Number.isFinite(limit) ? limit : 15;
}

function serializeCatalogResponse(
  ingredients: Awaited<
    ReturnType<typeof searchCatalogIngredients>
  >['ingredients'],
  source: 'spoonacular' | 'mock'
) {
  return {
    ingredients: ingredients.map((ingredient) => ({
      id: ingredient.id,
      spoonacularId: ingredient.spoonacularId,
      name: ingredient.name,
      category: ingredient.category,
      commonUnits: ingredient.commonUnits,
      image: ingredient.image
    })),
    source
  };
}

export async function GET(request: NextRequest) {
  try {
    const ids = request.nextUrl.searchParams.get('ids');
    const query = request.nextUrl.searchParams.get('q') ?? '';
    const limit = parseLimit(
      request.nextUrl.searchParams.get('limit')
    );

    if (ids) {
      const ingredients = await findCatalogIngredientsByIds(
        ids.split(',')
      );

      return NextResponse.json({
        ingredients,
        source: isSpoonacularCatalogMockMode() ? 'mock' : 'spoonacular'
      });
    }

    const result = await searchCatalogIngredients(query, limit);

    return NextResponse.json(
      serializeCatalogResponse(result.ingredients, result.source)
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return handleApiError(error);
    }

    return handleApiError(
      new ApiError(500, 'Unable to search the ingredient catalog.')
    );
  }
}
