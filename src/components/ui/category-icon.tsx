import {
  Fuel,
  Zap,
  Wrench,
  Droplets,
  Milestone,
  ParkingCircle,
  UtensilsCrossed,
  CircleDot,
  Car,
  Bike,
  Package,
  Truck,
  ShoppingBag,
  Box,
  LucideIcon,
} from "lucide-react";

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  // Expense categories
  fuel: Fuel,
  zap: Zap,
  wrench: Wrench,
  droplets: Droplets,
  milestone: Milestone,
  "parking-circle": ParkingCircle,
  "utensils-crossed": UtensilsCrossed,
  // Platform icons
  car: Car,
  bike: Bike,
  package: Package,
  truck: Truck,
  "shopping-bag": ShoppingBag,
  box: Box,
  "circle-dot": CircleDot,
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
