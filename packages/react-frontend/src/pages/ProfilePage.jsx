import {
  AlertTriangle,
  Check,
  Database,
  Edit3,
  Plus,
  Save,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { IngredientTypeahead } from '../components/IngredientTypeahead.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatusMessage } from '../components/StatusMessage.jsx';
import { TagInput } from '../components/TagInput.jsx';
import { pantryItems } from '../data/recipes.js';
import {
  fetchConstraintIngredientsByIds,
  fetchConstraints,
  saveConstraints
} from '../lib/constraintsApi.js';
import {
  createPantryItem,
  deletePantryItem,
  getIngredientCatalog,
  getPantryItems,
  updatePantryItem
} from '../lib/pantryApi.js';
import { getSavedSession } from '../lib/session.js';

const fallbackIngredientDatabase = [
  { id: 'tomatoes', name: 'Tomatoes', defaultUnit: 'whole' },
  {
    id: 'garlic-cloves',
    name: 'Garlic',
    defaultUnit: 'cloves'
  },
  { id: 'pasta', name: 'Pasta', defaultUnit: 'boxes' },
  {
    id: 'chicken-fillets',
    name: 'Chicken fillets',
    defaultUnit: 'fillets'
  },
  { id: 'mushrooms', name: 'Mushrooms', defaultUnit: 'cups' },
  { id: 'cream', name: 'Cream', defaultUnit: 'cups' },
  { id: 'rice', name: 'Rice', defaultUnit: 'cups' },
  { id: 'eggs', name: 'Eggs', defaultUnit: 'pieces' },
  { id: 'broccoli', name: 'Broccoli', defaultUnit: 'heads' },
  {
    id: 'olive-oil',
    name: 'Olive oil',
    defaultUnit: 'tbsp'
  }
];

const initialPantryItems = pantryItems.map((item) => {
  const [quantity, ...unitParts] = item.quantity.split(' ');
  const catalogMatch = fallbackIngredientDatabase.find(
    (ingredient) =>
      ingredient.name.toLowerCase() === item.name.toLowerCase()
  );

  return {
    ...item,
    ingredientId: catalogMatch?.id ?? item.id,
    quantity,
    unit: unitParts.join(' ')
  };
});

const emptyDraft = {
  ingredientName: 'Tomatoes',
  quantity: '4',
  unit: 'whole'
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

export function ProfilePage() {
  const [items, setItems] = useState(initialPantryItems);
  const [ingredientDatabase, setIngredientDatabase] = useState(
    fallbackIngredientDatabase
  );
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(
    'Search the canonical database before adding an item.'
  );
  const [allergies, setAllergies] = useState([]);
  const [medicalRestrictions, setMedicalRestrictions] =
    useState([]);
  const [neverIncludeIngredients, setNeverIncludeIngredients] =
    useState([]);
  const [isLoadingConstraints, setIsLoadingConstraints] =
    useState(true);
  const [isSavingConstraints, setIsSavingConstraints] =
    useState(false);
  const [constraintMessage, setConstraintMessage] =
    useState('');
  const [constraintError, setConstraintError] = useState('');

  const constraintStats = useMemo(
    () => [
      `${allergies.length} allergies`,
      `${medicalRestrictions.length} medical rules`,
      `${neverIncludeIngredients.length} blocked ingredients`
    ],
    [
      allergies.length,
      medicalRestrictions.length,
      neverIncludeIngredients.length
    ]
  );

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

    async function loadConstraints() {
      setIsLoadingConstraints(true);
      setConstraintError('');

      try {
        const constraints = await fetchConstraints();
        const ingredients =
          await fetchConstraintIngredientsByIds(
            constraints.neverIncludeIngredientIds
          );

        if (isCancelled) {
          return;
        }

        setAllergies(constraints.allergies);
        setMedicalRestrictions(constraints.medicalRestrictions);
        setNeverIncludeIngredients(ingredients);
      } catch (error) {
        if (!isCancelled) {
          setConstraintError(
            error instanceof Error
              ? error.message
              : 'Unable to load dietary rules.'
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingConstraints(false);
        }
      }
    }

    async function loadPantry() {
      try {
        const catalogPayload = await getIngredientCatalog();

        if (!isCancelled) {
          setIngredientDatabase(
            catalogPayload.ingredients.map((ingredient) => ({
              ...ingredient,
              defaultUnit:
                fallbackIngredientDatabase.find(
                  (item) => item.id === ingredient.id
                )?.defaultUnit ?? 'units'
            }))
          );
        }

        if (!getSavedSession()?.profileId) {
          return;
        }

        const pantryPayload = await getPantryItems();

        if (!isCancelled) {
          setItems(pantryPayload.ingredients.map(mapApiItem));
          setStatusMessage(
            'Pantry loaded from /api/ingredients using your OTP session profile.'
          );
        }
      } catch (error) {
        if (!isCancelled) {
          setStatusMessage(
            error instanceof Error
              ? `${error.message} Showing the local pantry preview.`
              : 'Showing the local pantry preview.'
          );
        }
      }
    }

    void loadConstraints();
    void loadPantry();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleSaveConstraints() {
    setIsSavingConstraints(true);
    setConstraintMessage('');
    setConstraintError('');

    try {
      const constraints = await saveConstraints({
        allergies,
        medicalRestrictions,
        neverIncludeIngredientIds: neverIncludeIngredients.map(
          (ingredient) => ingredient.id
        )
      });
      const ingredients = await fetchConstraintIngredientsByIds(
        constraints.neverIncludeIngredientIds
      );

      setAllergies(constraints.allergies);
      setMedicalRestrictions(constraints.medicalRestrictions);
      setNeverIncludeIngredients(ingredients);
      setConstraintMessage('Hard dietary rules saved.');
    } catch (error) {
      setConstraintError(
        error instanceof Error
          ? error.message
          : 'Unable to save dietary rules.'
      );
    } finally {
      setIsSavingConstraints(false);
    }
  }

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

    const nextItem = {
      id: editingId ?? matchedIngredient.id,
      ingredientId: matchedIngredient.id,
      name: matchedIngredient.name,
      quantity: draft.quantity,
      unit: draft.unit.trim() || matchedIngredient.defaultUnit,
      status: editingId ? 'Updated' : 'Canonical',
      color: editingId ? 'blue' : 'green'
    };

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
          `${matchedIngredient.name} saved through /api/ingredients.`
        );
      } catch (error) {
        setItems((current) =>
          editingId
            ? current.map((item) =>
                item.id === editingId ? nextItem : item
              )
            : [nextItem, ...current]
        );
        setStatusMessage(
          error instanceof Error
            ? `${error.message} Local preview updated.`
            : `${matchedIngredient.name} saved locally.`
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
            ? `${error.message} Removed from the local preview.`
            : `${item?.name ?? 'Ingredient'} removed locally.`
        );
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
        eyebrow="Account"
        title="Profile"
        subtitle="Track pantry items and hard dietary rules before group meals are generated."
        action="plus"
      />

      <section className="profile-card surface-card">
        <div className="profile-avatar">K</div>
        <div>
          <h2>Kartik</h2>
          <p>Customer / Tester</p>
          <div className="profile-pills">
            <span>{items.length} items</span>
            <span>3 groups</span>
          </div>
        </div>
      </section>

      <section
        className="constraints-card surface-card"
        aria-busy={isLoadingConstraints}>
        <div className="constraints-card__header">
          <div>
            <p className="eyebrow">Hard Rules</p>
            <h2>Dietary Restrictions</h2>
            <p>
              These rules block generated bundles for the whole
              group when a candidate includes a violating
              ingredient.
            </p>
          </div>
          <button
            className="button"
            type="button"
            onClick={handleSaveConstraints}
            disabled={
              isLoadingConstraints || isSavingConstraints
            }>
            {isSavingConstraints ? (
              <>
                <Save size={18} /> Saving
              </>
            ) : (
              <>
                <Check size={18} /> Save Rules
              </>
            )}
          </button>
        </div>

        <div
          className="constraint-summary"
          aria-label="Dietary restriction summary">
          {constraintStats.map((stat) => (
            <span key={stat}>{stat}</span>
          ))}
        </div>

        {isLoadingConstraints ? (
          <StatusMessage
            type="loading"
            title="Loading dietary rules"
            message="Fetching saved profile constraints before showing the editor."
          />
        ) : (
          <div className="constraints-form">
            <TagInput
              label="Allergies"
              placeholder="Add allergy"
              values={allergies}
              onChange={setAllergies}
            />
            <TagInput
              label="Medical Restrictions"
              placeholder="Add hard restriction"
              values={medicalRestrictions}
              onChange={setMedicalRestrictions}
            />
            <IngredientTypeahead
              selected={neverIncludeIngredients}
              onChange={setNeverIncludeIngredients}
            />
          </div>
        )}

        {constraintError && (
          <StatusMessage
            type="error"
            title="Dietary rules unavailable"
            message={constraintError}
          />
        )}
        {constraintMessage && !constraintError && (
          <p className="constraint-success" role="status">
            <Check size={16} /> {constraintMessage}
          </p>
        )}
        <p className="constraint-note">
          <AlertTriangle size={16} /> Hard rules are stricter
          than preferences and always hide violating bundles.
        </p>
      </section>

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
            <input
              name="ingredientName"
              list="ingredient-database"
              value={draft.ingredientName}
              onChange={updateDraft}
              placeholder="Search ingredient database"
            />
          </label>
          <datalist id="ingredient-database">
            {ingredientDatabase.map((ingredient) => (
              <option key={ingredient.id} value={ingredient.name} />
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
