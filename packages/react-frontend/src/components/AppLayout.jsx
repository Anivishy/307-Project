import { ChefHat, Sparkles } from "lucide-react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav.jsx";

export function AppLayout() {
  return (
    <div className="app-shell">
      <main className="app-frame">
        <aside className="app-sidebar">
          <div className="app-brand">
            <ChefHat size={24} />
            <div>
              <strong>RecipeCollab</strong>
              <span>Shared pantry workspace</span>
            </div>
          </div>

          <p className="app-sidebar__copy">
            Plan group meals, track shared ingredients, and keep recipe decisions in one collaborative place.
          </p>

          <BottomNav />

          <section className="app-sidebar__cta surface-card" aria-label="Workspace summary">
            <Sparkles size={18} />
            <div>
              <strong>Meal planning hub</strong>
              <p>Recipes, groups, approvals, and pantry views all stay in the same dark citrus theme.</p>
            </div>
          </section>
        </aside>

        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
