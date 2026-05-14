import { Filter, Search } from "lucide-react";
import { categories } from "../data/recipes.js";

export function SearchFilter({ search, onSearchChange, category, onCategoryChange }) {
  return (
    <section className="search-filter" aria-label="Search and filter recipes">
      <label className="search-filter__input">
        <Search size={21} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search your group pantry..."
        />
        <Filter size={20} />
      </label>
      <div className="category-row" role="list" aria-label="Recipe categories">
        {categories.map((item) => (
          <button
            key={item}
            className={item === category ? "is-active" : ""}
            onClick={() => onCategoryChange(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}
