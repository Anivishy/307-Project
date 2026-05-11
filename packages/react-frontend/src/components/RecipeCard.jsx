import { ArrowUpRight, Clock3, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export function RecipeCard({ recipe, compact = false }) {
  return (
    <article className={`recipe-card ${compact ? "recipe-card--compact" : ""}`}>
      <img src={recipe.image} alt={recipe.title} />
      <div className="recipe-card__shade" />
      <button className={`recipe-card__heart ${recipe.saved ? "is-saved" : ""}`} aria-label="Save recipe">
        <Heart size={20} fill={recipe.saved ? "currentColor" : "none"} />
      </button>
      <Link className="recipe-card__open" to={`/recipes/${recipe.id}`} aria-label={`Open ${recipe.title}`}>
        <ArrowUpRight size={20} />
      </Link>
      <div className="recipe-card__content">
        <h2>{recipe.title}</h2>
        <span className="recipe-card__time">
          <Clock3 size={13} /> {recipe.time}
        </span>
      </div>
    </article>
  );
}
