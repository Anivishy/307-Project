import { ChefHat } from "lucide-react";

export function EmptyState({ title, message, action }) {
  return (
    <section className="empty-state">
      <div className="empty-state__icon">
        <ChefHat size={26} />
      </div>
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </section>
  );
}
