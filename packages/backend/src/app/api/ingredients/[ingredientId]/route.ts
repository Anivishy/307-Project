import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../lib/api-response';
import {
  deletePantryItem,
  updatePantryItem
} from '../../../../lib/ingredient-service';
import { getRequestUserId } from '../../../../lib/request-user';

// PATCH and DELETE are scoped by both ingredientId and the caller's user id.
// That ownership check is what enforces "users manage their own pantry items."
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ingredientId: string }> }
) {
  try {
    const { ingredientId: pantryItemId } = await params;
    const pantryItem = await updatePantryItem(
      getRequestUserId(request),
      pantryItemId,
      await request.json()
    );

    return NextResponse.json(pantryItem);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ ingredientId: string }> }
) {
  try {
    const { ingredientId: pantryItemId } = await params;
    await deletePantryItem(
      getRequestUserId(request),
      pantryItemId
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
