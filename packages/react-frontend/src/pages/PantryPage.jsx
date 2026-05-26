import {
  Database,
  Edit3,
  PackageOpen,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import {
  createPantryItem,
  deletePantryItem,
  getIngredientCatalog,
  getPantryItems,
  updatePantryItem
} from '../lib/pantryApi.js';
import { getSavedSession } from '../lib/session.js';

const emptyDraft = {
  ingredientName: '',
  quantity: '1',
  unit: ''
};

function mapCatalogIngredient(ingredient) {
  return {
    ...ingredient,
    defaultUnit: ingredient.commonUnits?.[0] ?? 'units'
  };
}

function mapApiItem(item) {
  return {
    id: item.id,
    ingredientId:
      item.canonicalIngredientId ??
      item.name.toLowerCase().replace(/\s+/g, '-'),
    name: item.name,
    quantity: String(item.quantity ?? ''),
    unit: item.unit ?? '',
    status: 'Synced',
    color: 'blue'
  };
}

export function PantryPage() {
  const [items, setItems] = useState([]);
  const [ingredientDatabase, setIngredientDatabase] = useState(
    []
  );
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    'Search the ingredient database before adding an item.'
  );
  const [isLoading, setIsLoading] = useState(true);

  const matchedIngredient = useMemo(() => {
    const normalizedName = draft.ingredientName
      .trim()
      .toLowerCase();

    return ingredientDatabase.find(
      (ingredient) =>
        ingredient.name.toLowerCase() === normalizedName ||
        ingredient.id === normalizedName
    );
  }, [draft.ingredientName, ingredientDatabase]);

  useEffect(() => {
    let isCancelled = false;

    async function loadPantry() {
      setIsLoading(true);

      try {
        const catalogPayload = await getIngredientCatalog();

        if (!isCancelled) {
          setIngredientDatabase(
            catalogPayload.ingredients.map(mapCatalogIngredient)
          );
        }

        if (!getSavedSession()?.profileId) {
          return;
        }

        const pantryPayload = await getPantryItems();

        if (!isCancelled) {
          setItems(pantryPayload.ingredients.map(mapApiItem));
          setStatusMessage('Your pantry is ready.');
        }
      } catch (error) {
        if (!isCancelled) {
          setStatusMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load pantry items.'
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPantry();

    return () => {
      isCancelled = true;
    };
  }, []);

  function updateDraft(event) {
    const { name, value } = event.target;
    setDraft((current) => {
      const nextDraft = { ...current, [name]: value };

      if (name === 'ingredientName') {
        const nextMatch = ingredientDatabase.find(
          (ingredient) =>
            ingredient.name.toLowerCase() ===
            value.trim().toLowerCase()
        );

        if (nextMatch) {
          nextDraft.unit = nextMatch.defaultUnit;
        }
      }

      return nextDraft;
    });
  }

  function resetDraft() {
    setDraft(emptyDraft);
    setEditingId(null);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    resetDraft();
  }

  function openAddDialog() {
    resetDraft();
    setStatusMessage(
      'Search the ingredient database before adding an item.'
    );
    setIsDialogOpen(true);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!matchedIngredient) {
      setStatusMessage(
        'Pick an ingredient from the database suggestions.'
      );
      return;
    }

    if (!draft.quantity || Number(draft.quantity) <= 0) {
      setStatusMessage('Quantity must be greater than zero.');
      return;
    }

    const duplicate = items.find(
      (item) =>
        item.ingredientId === matchedIngredient.id &&
        item.id !== editingId
    );

    if (duplicate) {
      setStatusMessage(
        `${matchedIngredient.name} is already in your pantry. Edit the existing row instead.`
      );
      return;
    }

    async function saveBackendItem() {
      try {
        const payload = {
          canonicalIngredientId: matchedIngredient.id,
          name: matchedIngredient.name,
          quantity: draft.quantity,
          unit:
            draft.unit.trim() || matchedIngredient.defaultUnit
        };
        const savedItem = editingId
          ? await updatePantryItem(editingId, payload)
          : await createPantryItem(payload);
        const displayItem = mapApiItem(savedItem);

        setItems((current) =>
          editingId
            ? current.map((item) =>
                item.id === editingId ? displayItem : item
              )
            : [displayItem, ...current]
        );
        setStatusMessage(
          `${matchedIngredient.name} saved to your pantry.`
        );
        closeDialog();
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : `Unable to save ${matchedIngredient.name}.`
        );
      }
    }

    void saveBackendItem();
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setDraft({
      ingredientName: item.name,
      quantity: item.quantity,
      unit: item.unit
    });
    setStatusMessage(`Editing ${item.name}.`);
    setIsDialogOpen(true);
  }

  function handleDelete(itemId) {
    const item = items.find((current) => current.id === itemId);

    async function deleteBackendItem() {
      try {
        await deletePantryItem(itemId);
        setStatusMessage(
          `${item?.name ?? 'Ingredient'} removed from your pantry.`
        );
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : `Unable to remove ${item?.name ?? 'Ingredient'}.`
        );
        return;
      }

      setItems((current) =>
        current.filter(
          (currentItem) => currentItem.id !== itemId
        )
      );
    }

    void deleteBackendItem();
    if (editingId === itemId) {
      closeDialog();
    }
  }

  return (
    <section className="screen pantry-screen">
      <PageHeader
        eyebrow="Ingredients"
        title="My Pantry"
        subtitle="Track the ingredients you can contribute to group meals."
        action="plus"
        actionLabel="Add pantry item"
        onActionClick={openAddDialog}
      />

      <section className="pantry-summary surface-card">
        <div>
          <p className="eyebrow">Available</p>
          <h2>{items.length} pantry items</h2>
        </div>
        <PackageOpen size={22} />
      </section>

      <p className="pantry-status">{statusMessage}</p>

      <div className="section-heading profile-heading">
        <h2>Current Ingredients</h2>
        <button type="button">{items.length} tracked</button>
      </div>

      {isLoading ? (
        <div className="ingredient-stack">
          <article className="ingredient-row">
            <span className="ingredient-dot ingredient-dot--blue">
              ...
            </span>
            <div>
              <h3>Loading pantry</h3>
              <p>Checking saved ingredients</p>
            </div>
          </article>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No pantry items yet"
          message="Add ingredients from the database to start building your pantry."
          action={
            <button
              className="button"
              type="button"
              onClick={openAddDialog}>
              <Plus size={18} /> Add Item
            </button>
          }
        />
      ) : (
        <div className="ingredient-stack pantry-list">
          {items.map((item) => (
            <article className="ingredient-row" key={item.id}>
              <span
                className={`ingredient-dot ingredient-dot--${item.color}`}>
                {item.name[0]}
              </span>
              <div>
                <h3>{item.name}</h3>
                <p>
                  {item.quantity} {item.unit}
                </p>
              </div>
              <span className="ingredient-status">
                {item.status}
              </span>
              <button
                aria-label={`Edit ${item.name}`}
                type="button"
                onClick={() => handleEdit(item)}>
                <Edit3 size={18} />
              </button>
              <button
                aria-label={`Delete ${item.name}`}
                type="button"
                onClick={() => handleDelete(item.id)}>
                <Trash2 size={18} />
              </button>
            </article>
          ))}
        </div>
      )}

      {isDialogOpen && (
        <div className="dialog-backdrop">
          <form
            className="pantry-dialog surface-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pantry-dialog-title"
            onSubmit={handleSubmit}>
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Database</p>
                <h2 id="pantry-dialog-title">
                  {editingId
                    ? 'Edit Pantry Item'
                    : 'Add Pantry Item'}
                </h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close"
                onClick={closeDialog}>
                <X size={18} />
              </button>
            </div>

            <div className="pantry-form-grid">
              <label className="field">
                <span>Ingredient</span>
                <input
                  name="ingredientName"
                  list="pantry-ingredient-database"
                  value={draft.ingredientName}
                  onChange={updateDraft}
                  placeholder="Search ingredient database"
                />
              </label>
              <datalist id="pantry-ingredient-database">
                {ingredientDatabase.map((ingredient) => (
                  <option
                    key={ingredient.id}
                    value={ingredient.name}
                  />
                ))}
              </datalist>

              <label className="field">
                <span>Quantity</span>
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  step="0.25"
                  value={draft.quantity}
                  onChange={updateDraft}
                />
              </label>

              <label className="field">
                <span>Unit</span>
                <input
                  name="unit"
                  value={draft.unit}
                  onChange={updateDraft}
                  placeholder="cups"
                />
              </label>
            </div>

            <p
              className={`pantry-status ${matchedIngredient ? 'is-matched' : ''}`}>
              {statusMessage}
            </p>

            <div className="pantry-actions">
              <button className="button" type="submit">
                <Plus size={18} />{' '}
                {editingId ? 'Save Changes' : 'Add Item'}
              </button>
              <button
                className="button button--dark"
                type="button"
                onClick={closeDialog}>
                <X size={18} /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
