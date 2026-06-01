import {
  Database,
  Edit3,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader.jsx';
import {
  createPantryItem,
  deletePantryItem,
  getPantryItems,
  searchIngredientCatalog,
  updatePantryItem
} from '@/lib/pantryApi.js';
import { getSavedSession } from '@/lib/session.js';

const emptyDraft = {
  ingredientName: '',
  quantity: '1',
  unit: ''
};

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
  const [draft, setDraft] = useState(emptyDraft);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(
    'Search the canonical database before adding an item.'
  );

  const trimmedQuery = draft.ingredientName.trim();

  useEffect(() => {
    let isCancelled = false;

    async function loadPantry() {
      try {
        if (!getSavedSession()?.profileId) {
          if (!isCancelled) {
            setStatusMessage(
              'Sign in to load saved pantry items for your profile.'
            );
          }
          return;
        }

        const pantryPayload = await getPantryItems();

        if (!isCancelled) {
          setItems(pantryPayload.ingredients.map(mapApiItem));
          setStatusMessage(
            'Pantry loaded from /api/ingredients using your signed-in profile.'
          );
        }
      } catch (error) {
        if (!isCancelled) {
          setStatusMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load pantry items.'
          );
        }
      }
    }

    void loadPantry();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!trimmedQuery) {
      setSearchResults([]);
      setSelectedIngredient(null);
      return undefined;
    }

    if (
      selectedIngredient &&
      selectedIngredient.name.toLowerCase() ===
        trimmedQuery.toLowerCase()
    ) {
      setSearchResults([]);
      return undefined;
    }

    let isCurrentSearch = true;
    const timeoutId = window.setTimeout(() => {
      setIsSearching(true);
      searchIngredientCatalog(trimmedQuery)
        .then((ingredients) => {
          if (isCurrentSearch) {
            setSearchResults(ingredients);
          }
        })
        .catch(() => {
          if (isCurrentSearch) {
            setSearchResults([]);
          }
        })
        .finally(() => {
          if (isCurrentSearch) {
            setIsSearching(false);
          }
        });
    }, 250);

    return () => {
      isCurrentSearch = false;
      window.clearTimeout(timeoutId);
    };
  }, [trimmedQuery, selectedIngredient]);

  const matchedIngredient = useMemo(() => {
    if (
      selectedIngredient &&
      selectedIngredient.name.toLowerCase() ===
        trimmedQuery.toLowerCase()
    ) {
      return {
        ...selectedIngredient,
        defaultUnit: selectedIngredient.commonUnits?.[0] ?? 'units'
      };
    }

    return null;
  }, [selectedIngredient, trimmedQuery]);

  function updateDraft(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));

    if (name === 'ingredientName') {
      setSelectedIngredient(null);
    }
  }

  function selectIngredient(ingredient) {
    setSelectedIngredient(ingredient);
    setDraft((current) => ({
      ...current,
      ingredientName: ingredient.name,
      unit: ingredient.commonUnits?.[0] ?? current.unit
    }));
    setSearchResults([]);
  }

  function resetDraft() {
    setDraft(emptyDraft);
    setSelectedIngredient(null);
    setSearchResults([]);
    setEditingId(null);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!matchedIngredient) {
      setStatusMessage(
        'Pick an ingredient from the canonical database suggestions.'
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
            draft.unit.trim() ||
            matchedIngredient.defaultUnit
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
          `${matchedIngredient.name} saved through /api/ingredients.`
        );
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : `Unable to save ${matchedIngredient.name}.`
        );
      } finally {
        resetDraft();
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
    setSelectedIngredient({
      id: item.ingredientId,
      name: item.name,
      commonUnits: [item.unit].filter(Boolean)
    });
    setStatusMessage(`Editing ${item.name}.`);
  }

  function handleDelete(itemId) {
    const item = items.find((current) => current.id === itemId);

    async function deleteBackendItem() {
      try {
        await deletePantryItem(itemId);
        setStatusMessage(
          `${item?.name ?? 'Ingredient'} removed through /api/ingredients/${itemId}.`
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
        current.filter((currentItem) => currentItem.id !== itemId)
      );
    }

    void deleteBackendItem();
    if (editingId === itemId) {
      resetDraft();
    }
  }

  return (
    <section className="screen profile-screen">
      <PageHeader
        eyebrow="Pantry"
        title="My Pantry"
        subtitle="Track the ingredients available to your profile before group meals are generated."
        action="plus"
      />

      <form
        className="add-ingredient-card surface-card"
        onSubmit={handleSubmit}>
        <div className="section-heading">
          <h2>
            {editingId
              ? 'Edit Pantry Item'
              : 'Add from Database'}
          </h2>
          <Database size={20} />
        </div>

        <div className="pantry-form-grid">
          <label className="field">
            <span>Ingredient</span>
            <div className="ingredient-picker">
              <input
                name="ingredientName"
                value={draft.ingredientName}
                onChange={updateDraft}
                placeholder="Search ingredient database"
              />
              {(searchResults.length > 0 ||
                (trimmedQuery && isSearching)) && (
                <div className="typeahead-results" role="listbox">
                  {isSearching && (
                    <div className="result-row muted">
                      Searching...
                    </div>
                  )}
                  {!isSearching &&
                    searchResults.map((ingredient) => (
                      <button
                        key={ingredient.id}
                        type="button"
                        className="result-row"
                        onClick={() => selectIngredient(ingredient)}>
                        <span>{ingredient.name}</span>
                        <small>{ingredient.category}</small>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </label>

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
          {editingId && (
            <button
              className="button button--dark"
              type="button"
              onClick={resetDraft}>
              <X size={18} /> Cancel
            </button>
          )}
        </div>
      </form>

      <div className="section-heading profile-heading">
        <h2>Current Ingredients</h2>
        <button type="button">{items.length} tracked</button>
      </div>

      <div className="ingredient-stack">
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
    </section>
  );
}
