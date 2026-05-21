import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { SignInPage } from "./pages/SignInPage.jsx";
import { AuthCallbackPage } from "./pages/AuthCallbackPage.jsx";
import { RecipeListPage } from "./pages/RecipeListPage.jsx";
import { RecipeDetailPage } from "./pages/RecipeDetailPage.jsx";
import { AddRecipePage } from "./pages/AddRecipePage.jsx";
import { FavoritesPage } from "./pages/FavoritesPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { GroupsPage } from "./pages/GroupsPage.jsx";
import { GroupDetailPage } from "./pages/GroupDetailPage.jsx";
import { ApprovalsPage } from "./pages/ApprovalsPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<SignInPage mode="signin" />} />
      <Route path="/signup" element={<SignInPage mode="signup" />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<AppLayout />}>
        <Route path="/recipes" element={<RecipeListPage />} />
        <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
        <Route path="/add-recipe" element={<AddRecipePage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
