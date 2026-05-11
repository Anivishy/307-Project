import { NextResponse } from 'next/server';
import { handleApiError } from '../../../lib/api-response';
import {
  createIngredient,
  listIngredients
} from '../../../lib/ingredient-service';
import { getRequestUserId } from '../../../lib/request-user';

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
    const ingredient = await createIngredient(
      getRequestUserId(request),
      await request.json()
    );

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
