import { NextResponse } from 'next/server';
import { handleApiError } from '../../../lib/api-response';
import {
  addPantryItem,
  listPantryItems
} from '../../../lib/ingredient-service';
import { getRequestUserId } from '../../../lib/request-user';

// These routes keep the old /api/ingredients URL, but the records are now
// user-owned pantry items linked to canonical ingredient catalog entries.
export async function GET(request: Request) {
  try {
    const pantryItems = await listPantryItems(
      getRequestUserId(request)
    );

    return NextResponse.json({ ingredients: pantryItems });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    // The owner comes from the request header, not the body, so users cannot create pantry items for someone else.
    const pantryItem = await addPantryItem(
      getRequestUserId(request),
      await request.json()
    );

    return NextResponse.json(pantryItem, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
