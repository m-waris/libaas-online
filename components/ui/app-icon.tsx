import type { LucideIcon } from "lucide-react";

export function AppIcon({
  icon: Icon,
  size = 18,
  className,
}: {
  icon: LucideIcon;
  size?: number;
  className?: string;
}) {
  return (
    <Icon
      aria-hidden="true"
      className={className ? `app-icon ${className}` : "app-icon"}
      focusable="false"
      size={size}
      strokeWidth={1.65}
    />
  );
}
