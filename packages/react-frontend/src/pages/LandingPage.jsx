import { ChefHat, Sparkles, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import creamyPan from "../../assets/creamy-pan.jpg";
import flameWok from "../../assets/flame-wok.jpg";

export function LandingPage() {
  return (
    <div className="landing-shell">
      <main className="landing-frame landing-phone">
        <section className="landing-content" aria-label="RecipeCollab landing page">
          <nav className="landing-nav landing-nav--inline">
            <Link to="/" className="brand-mark">
              <ChefHat size={22} />
              <span>RecipeCollab</span>
            </Link>
          </nav>

          <div className="landing-copy-block">
            <p className="eyebrow">Shared pantry cooking</p>
            <h1 className="hero-title">
              Shared pantry,
              <br />
              smarter dinners.
            </h1>
            <p className="landing-copy">
              Build a group pantry, find recipes from shared ingredients, and approve requests before your food is
              used. RecipeCollab keeps everyone on the same page for shared meals.
            </p>

            <div className="landing-actions">
              <Link to="/signup" className="button button--wide">
                Create Account
              </Link>
              <Link to="/signin" className="button button--dark button--wide" style={{ marginTop: "12px" }}>
                Sign In
              </Link>
            </div>

            <p className="landing-features-label muted">What you get</p>
            <div className="landing-feature-cards">
              <div className="landing-feature-card">
                <Sparkles size={18} />
                <strong>Recipe ideas</strong>
                <p>Get meal suggestions matched to what your group actually has on hand.</p>
              </div>
              <div className="landing-feature-card">
                <UsersRound size={18} />
                <strong>Group pantry</strong>
                <p>Track shared ingredients and see who owns what before anyone cooks.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-visual">
          <img className="landing-hero__image" src={flameWok} alt="Vegetables cooking in a pan" />
          <div className="landing-hero__shade" />
          <div className="landing-photo-card">
            <img src={creamyPan} alt="Creamy skillet recipe" />
          </div>
          <div className="landing-visual__caption surface-card">
            <strong>Shared meal planning</strong>
            <p>See what the house can cook before anyone shops or uses another person&apos;s ingredients.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
