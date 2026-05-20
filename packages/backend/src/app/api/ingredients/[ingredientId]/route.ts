import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../lib/api-response';
import {
  deleteIngredient,
  updateIngredient
} from '../../../../lib/ingredient-service';
import { getRequestUserId } from '../../../../lib/request-user';

// PATCH and DELETE are scoped by both ingredientId and the caller's user id.
// That ownership check is what enforces "users manage their own pantry items."
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ingredientId: string }> }
) {
  try {
    const { ingredientId } = await params;
    const ingredient = await updateIngredient(
      await getRequestUserId(request),
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
      await getRequestUserId(request),
      ingredientId
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
