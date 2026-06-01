import { ArrowLeft, Clock3, Flame, Heart, UsersRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { GlassIconButton } from "@/components/GlassIconButton.jsx";
import { EmptyState } from "@/components/EmptyState.jsx";
import { recipes } from "@/data/recipes.js";

export function RecipeDetailPage() {
  const { recipeId } = useParams();
  const recipe = recipes.find((item) => item.id === recipeId);

  if (!recipe) {
    return (
      <section className="screen">
        <EmptyState
          title="Recipe not found"
          message="The recipe link is not available anymore."
          action={
            <Link className="button" to="/recipes">
              Back to Recipes
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="screen screen--full recipe-detail-screen">
      <div className="recipe-detail-hero">
        <img src={recipe.image} alt={recipe.title} />
        <div className="recipe-detail-hero__shade" />
        <Link className="detail-back-button" to="/recipes" aria-label="Back to recipes">
          <ArrowLeft size={22} />
        </Link>
        <GlassIconButton icon={Heart} label="Save recipe" className="detail-save-button" accent={recipe.saved} />
      </div>

      <article className="recipe-detail-panel">
        <div className="detail-handle" />
        <p className="eyebrow">{recipe.category}</p>
        <h1>{recipe.title}</h1>
        <p className="recipe-detail-description">{recipe.description}</p>

        <div className="recipe-meta-row">
          <span>
            <Clock3 size={16} /> {recipe.time}
          </span>
          <span>
            <UsersRound size={16} /> {recipe.servings} servings
          </span>
          <span>
            <Flame size={16} /> {recipe.difficulty}
          </span>
        </div>

        <section className="detail-section">
          <h2>Ingredients</h2>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </section>

        <section className="detail-section">
          <h2>Instructions</h2>
          <ol className="instruction-list">
            {recipe.instructions.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </article>
    </section>
  );
}
