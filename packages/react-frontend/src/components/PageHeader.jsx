import { Bell, Plus } from "lucide-react";
import { GlassIconButton } from "@/components/GlassIconButton.jsx";

export function PageHeader({ eyebrow, title, subtitle, action = "bell" }) {
  const ActionIcon = action === "plus" ? Plus : Bell;

  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      <GlassIconButton icon={ActionIcon} label={action === "plus" ? "Add" : "Notifications"} accent={action === "plus"} />
    </header>
  );
}
