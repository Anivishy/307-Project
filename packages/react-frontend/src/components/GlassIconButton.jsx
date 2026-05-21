import { createElement } from "react";

export function GlassIconButton({ icon: Icon, label, className = "", accent = false, ...props }) {
  return (
    <button className={`glass-icon-button ${accent ? "glass-icon-button--accent" : ""} ${className}`} aria-label={label} {...props}>
      {createElement(Icon, { size: 21, strokeWidth: 2 })}
    </button>
  );
}
