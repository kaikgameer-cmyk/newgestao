import {
  Fuel,
  Zap,
  Wrench,
  Droplets,
  Milestone,
  ParkingCircle,
  UtensilsCrossed,
  CircleDot,
  LucideIcon,
} from "lucide-react";

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  fuel: Fuel,
  zap: Zap,
  wrench: Wrench,
  droplets: Droplets,
  milestone: Milestone,
  "parking-circle": ParkingCircle,
  "utensils-crossed": UtensilsCrossed,
};

interface CategoryIconProps {
  iconName?: string | null;
  color?: string;
  size?: number;
  className?: string;
}

export function CategoryIcon({
  iconName,
  color,
  size = 16,
  className = "",
}: CategoryIconProps) {
  // If no icon name or not found, render a colored dot
  if (!iconName || !iconMap[iconName]) {
    return (
      <div
        className={`rounded-full ${className}`}
        style={{
          backgroundColor: color || "#EF4444",
          width: size * 0.75,
          height: size * 0.75,
        }}
      />
    );
  }

  const IconComponent = iconMap[iconName];

  return (
    <IconComponent
      size={size}
      className={className}
      style={{ color: color || "#EF4444" }}
    />
  );
}
