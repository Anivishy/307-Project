import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../lib/api-response';
import {
  deleteIngredient,
  updateIngredient
} from '../../../../lib/ingredient-service';
import { getRequestUserId } from '../../../../lib/request-user';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ingredientId: string }> }
) {
  try {
    const { ingredientId } = await params;
    const ingredient = await updateIngredient(
      getRequestUserId(request),
      ingredientId,
      await request.json()
    );

    return NextResponse.json(ingredient);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ ingredientId: string }> }
) {
  try {
    const { ingredientId } = await params;
    await deleteIngredient(
      getRequestUserId(request),
      ingredientId
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
