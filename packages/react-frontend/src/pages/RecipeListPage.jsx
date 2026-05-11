import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChefHat, Clock3, Sparkles, UsersRound } from "lucide-react";
import { EmptyState } from "../components/EmptyState.jsx";
import { GlassIconButton } from "../components/GlassIconButton.jsx";
import { RecipeCard } from "../components/RecipeCard.jsx";
import { SearchFilter } from "../components/SearchFilter.jsx";
import { StatusMessage } from "../components/StatusMessage.jsx";
import { recipes } from "../data/recipes.js";

export function RecipeListPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [viewState, setViewState] = useState("ready");

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesSearch = recipe.title.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "All" || recipe.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [category, search]);

  return (
    <section className="screen recipe-list-screen">
      <div className="dashboard-greeting">
        <div className="avatar-chip">K</div>
        <span>Hi Kartik</span>
        <GlassIconButton icon={ChefHat} label="Cooking status" />
      </div>

      <header className="recipe-list-hero">
        <h1>
          What's cooking
          <br />
          today?
        </h1>
      </header>

      <SearchFilter search={search} onSearchChange={setSearch} category={category} onCategoryChange={setCategory} />

      <div className="quick-actions">
        <Link to="/profile">
          <ChefHat size={24} />
          <span>Pantry</span>
        </Link>
        <Link to="/groups">
          <UsersRound size={24} />
          <span>Groups</span>
        </Link>
        <Link to="/add-recipe">
          <Sparkles size={24} />
          <span>Add</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            setViewState((current) => (current === "ready" ? "loading" : current === "loading" ? "error" : "ready"));
          }}
        >
          <Clock3 size={24} />
          <span>Status</span>
        </button>
      </div>

      <div className="section-heading">
        <h2>Trending Recipes</h2>
        <Link to="/favorites">Saved</Link>
      </div>

      {viewState === "loading" && (
        <StatusMessage type="loading" title="Loading recipes" message="The recipe cards are getting ready." />
      )}

      {viewState === "error" && (
        <StatusMessage
          type="error"
          title="Recipe list unavailable"
          message="Use the status button again to return to the normal list."
        />
      )}

      {viewState === "ready" && filteredRecipes.length === 0 && (
        <EmptyState
          title="No recipes found"
          message="Try a different search term or category filter."
          action={
            <button className="button" type="button" onClick={() => setSearch("")}>
              Clear Search
            </button>
          }
        />
      )}

      {viewState === "ready" && filteredRecipes.length > 0 && (
        <div className="recipe-stack">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} compact />
          ))}
        </div>
      )}
    </section>
  );
}
