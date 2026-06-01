import { Plus } from "lucide-react";
import { GlassIconButton } from "@/components/GlassIconButton.jsx";
import { NotificationBell } from "@/components/NotificationBell.jsx";

export function PageHeader({ eyebrow, title, subtitle, action = "bell" }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      <div className="page-header__actions">
        {action === "plus" && (
          <GlassIconButton icon={Plus} label="Add" accent />
        )}
        <NotificationBell />
      </div>
    </header>
  );
}
