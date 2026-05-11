import { ArrowRight, Check, ChefHat, Sparkles, UsersRound } from "lucide-react";
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
            <Link to="/signin" className="landing-nav__link">
              Sign In
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
              <Link to="/recipes" className="landing-cta" aria-label="Get started">
                <span className="landing-cta__check">
                  <Check size={23} />
                </span>
                <span>Get Started</span>
                <ArrowRight size={22} />
              </Link>
            </div>

            <div className="landing-feature-row">
              <span>
                <Sparkles size={16} /> Recipe ideas
              </span>
              <span>
                <UsersRound size={16} /> Group pantry
              </span>
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
