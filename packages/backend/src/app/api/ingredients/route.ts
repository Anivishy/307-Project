import { NextResponse } from 'next/server';
import { handleApiError } from '../../../lib/api-response';
import {
  createIngredient,
  listIngredients
} from '../../../lib/ingredient-service';
import { getRequestUserId } from '../../../lib/request-user';

// These routes currently treat "ingredients" as a user's pantry items.
// A future canonical ingredient database should probably use a separate route name.
export async function GET(request: Request) {
  try {
    const ingredients = await listIngredients(
      getRequestUserId(request)
    );

    return NextResponse.json({ ingredients });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    // The owner comes from the request header, not the body, so users cannot create pantry items for someone else.
    const ingredient = await createIngredient(
      getRequestUserId(request),
      await request.json()
    );

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
