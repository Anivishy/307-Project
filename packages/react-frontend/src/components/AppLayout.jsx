import { ChefHat, LogOut, Sparkles } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  clearSession,
  getSavedSession
} from '@/lib/session.js';
import { BottomNav } from '@/components/BottomNav.jsx';

export function AppLayout() {
  const navigate = useNavigate();
  const session = getSavedSession();

  function handleSignOut() {
    clearSession();
    navigate('/signin', { replace: true });
  }

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
            Plan group meals, track shared ingredients, and keep
            recipe decisions in one collaborative place.
          </p>

          <BottomNav />

          {session && (
            <section
              className="app-session"
              aria-label="Signed in account">
              <div>
                <span>Signed in</span>
                <strong>{session.email}</strong>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out">
                <LogOut size={18} />
              </button>
            </section>
          )}

          <section
            className="app-sidebar__cta surface-card"
            aria-label="Workspace summary">
            <Sparkles size={18} />
            <div>
              <strong>Meal planning hub</strong>
              <p>
                Recipes, groups, approvals, and pantry views all
                stay in the same dark citrus theme.
              </p>
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
