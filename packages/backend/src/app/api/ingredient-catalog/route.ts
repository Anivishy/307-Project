import { NextResponse } from 'next/server';
import { handleApiError } from '../../../lib/api-response';
import { listIngredientOptions } from '../../../lib/ingredient-service';

// GET /api/ingredient-catalog returns canonical dropdown choices for pantry items.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ingredientOptions = await listIngredientOptions(
      searchParams.get('search') ?? undefined
    );

    return NextResponse.json({
      ingredients: ingredientOptions
    });
  } catch (error) {
    return handleApiError(error);
  }
}
