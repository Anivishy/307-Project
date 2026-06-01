import { Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader.jsx";

const initialRecipe = {
  title: "",
  category: "Western",
  time: "",
  servings: "",
  ingredients: "",
  instructions: "",
};

export function AddRecipePage() {
  const [recipe, setRecipe] = useState(initialRecipe);
  const [submitted, setSubmitted] = useState(false);

  const formMessage = useMemo(() => {
    if (!submitted) {
      return "Add a recipe that your group can cook from shared ingredients.";
    }

    if (!recipe.title.trim() || !recipe.ingredients.trim() || !recipe.instructions.trim()) {
      return "Title, ingredients, and instructions are required.";
    }

    return "Recipe draft looks ready to save.";
  }, [recipe.ingredients, recipe.instructions, recipe.title, submitted]);

  function updateField(event) {
    const { name, value } = event.target;
    setRecipe((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="screen add-recipe-screen">
      <PageHeader
        title="Add Recipe"
        subtitle="Build a clean recipe card for your shared collection."
        action="plus"
      />

      <form className="form-grid add-recipe-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Recipe title</span>
          <input name="title" value={recipe.title} onChange={updateField} placeholder="Miso veggie fried rice" />
        </label>

        <div className="form-two-column">
          <label className="field">
            <span>Category</span>
            <select name="category" value={recipe.category} onChange={updateField}>
              <option>Western</option>
              <option>Bread</option>
              <option>Soup</option>
              <option>Dessert</option>
              <option>Coffee</option>
            </select>
          </label>
          <label className="field">
            <span>Time</span>
            <input name="time" value={recipe.time} onChange={updateField} placeholder="25 min" />
          </label>
        </div>

        <label className="field">
          <span>Servings</span>
          <input name="servings" value={recipe.servings} onChange={updateField} placeholder="4" />
        </label>

        <label className="field">
          <span>Ingredients</span>
          <textarea
            name="ingredients"
            value={recipe.ingredients}
            onChange={updateField}
            placeholder="Rice, eggs, broccoli, soy sauce"
          />
          <small>Use commas or new lines to separate ingredients.</small>
        </label>

        <label className="field">
          <span>Instructions</span>
          <textarea
            name="instructions"
            value={recipe.instructions}
            onChange={updateField}
            placeholder="Cook rice. Stir fry vegetables. Mix with sauce."
          />
        </label>

        <p className={`form-status ${submitted ? "is-active" : ""}`}>{formMessage}</p>

        <button className="button button--wide" type="submit">
          <Plus size={18} /> Save Recipe
        </button>
      </form>

      <section className="recipe-draft-card surface-card">
        <Sparkles size={20} />
        <div>
          <h2>{recipe.title || "Recipe preview"}</h2>
          <p>
            {recipe.category} {recipe.time && `| ${recipe.time}`} {recipe.servings && `| ${recipe.servings} servings`}
          </p>
        </div>
      </section>
    </section>
  );
}
