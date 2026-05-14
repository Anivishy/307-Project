import { Edit3, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader.jsx";
import { pantryItems } from "../data/recipes.js";

export function ProfilePage() {
  return (
    <section className="screen profile-screen">
      <PageHeader
        eyebrow="Account"
        title="Profile Pantry"
        subtitle="Track quantities before your group uses ingredients."
        action="plus"
      />

      <section className="profile-card surface-card">
        <div className="profile-avatar">K</div>
        <div>
          <h2>Kartik</h2>
          <p>Customer / Tester</p>
          <div className="profile-pills">
            <span>24 items</span>
            <span>3 groups</span>
          </div>
        </div>
      </section>

      <section className="add-ingredient-card surface-card">
        <h2>Add Ingredient</h2>
        <div className="add-ingredient-row">
          <span>Tomatoes</span>
          <span>4</span>
          <span>cups</span>
          <button aria-label="Add ingredient">
            <Plus size={18} />
          </button>
        </div>
      </section>

      <div className="section-heading profile-heading">
        <h2>Current Ingredients</h2>
        <button type="button">Edit List</button>
      </div>

      <div className="ingredient-stack">
        {pantryItems.map((item) => (
          <article className="ingredient-row" key={item.id}>
            <span className={`ingredient-dot ingredient-dot--${item.color}`}>{item.name[0]}</span>
            <div>
              <h3>{item.name}</h3>
              <p>{item.quantity}</p>
            </div>
            <span className="ingredient-status">{item.status}</span>
            <button aria-label={`Edit ${item.name}`}>
              <Edit3 size={18} />
            </button>
            <button aria-label={`Delete ${item.name}`}>
              <Trash2 size={18} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
