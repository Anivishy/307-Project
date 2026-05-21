import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { RecipeCard } from "../components/RecipeCard.jsx";
import { recipes } from "../data/recipes.js";

export function FavoritesPage() {
  const savedRecipes = recipes.filter((recipe) => recipe.saved);

  return (
    <section className="screen favorites-screen">
      <PageHeader
        eyebrow="Saved"
        title="Favorites"
        subtitle="Recipes you saved for quick group cooking."
      />

      {savedRecipes.length === 0 ? (
        <EmptyState
          title="No saved recipes yet"
          message="Save recipes from the main list and they will show up here."
          action={
            <Link className="button" to="/recipes">
              Browse Recipes
            </Link>
          }
        />
      ) : (
        <div className="recipe-stack">
          {savedRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} compact />
          ))}
        </div>
      )}
    </section>
  );
}
