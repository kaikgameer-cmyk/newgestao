import * as LucideIcons from "lucide-react";
import { Tag, LucideIcon } from "lucide-react";

// Default icon mappings for legacy data
const legacyIconMap: Record<string, string> = {
  // Old names to new Lucide component names
  fuel: "Fuel",
  zap: "Zap",
  wrench: "Wrench",
  droplets: "Droplets",
  milestone: "Milestone",
  "parking-circle": "ParkingCircle",
  "utensils-crossed": "UtensilsCrossed",
  car: "Car",
  bike: "Bike",
  package: "Package",
  truck: "Truck",
  "shopping-bag": "ShoppingBag",
  box: "Box",
  "circle-dot": "CircleDot",
};

// Default icons for known category/platform keys
const defaultIconByKey: Record<string, string> = {
  // Expense categories
  combustivel: "Fuel",
  eletrico: "Zap",
  manutencao: "Wrench",
  lavagem: "Droplets",
  pedagio: "Ticket",
  estacionamento: "ParkingCircle",
  alimentacao: "Utensils",
  // Platforms
  "99": "Car",
  uber: "CarTaxiFront",
  indrive: "Navigation",
  particular: "User",
  lojinha: "ShoppingCart",
};

interface CategoryIconProps {
  iconName?: string | null;
  categoryKey?: string | null;
  color?: string;
  size?: number;
  className?: string;
}

export function CategoryIcon({
  iconName,
  categoryKey,
  color,
  size = 16,
  className = "",
}: CategoryIconProps) {
  // Resolve the icon name
  let resolvedIconName: string | null = null;

  if (iconName) {
    // Check if it's a legacy name
    resolvedIconName = legacyIconMap[iconName.toLowerCase()] || iconName;
  } else if (categoryKey) {
    // Use default based on key
    resolvedIconName = defaultIconByKey[categoryKey.toLowerCase()] || null;
  }

  // Try to get the icon component
  if (resolvedIconName) {
    const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[resolvedIconName];
    if (IconComponent && typeof IconComponent === 'function') {
      return (
        <IconComponent
          size={size}
          className={className}
          style={{ color: color || "currentColor" }}
        />
      );
    }
  }

  // Fallback: render a colored dot or Tag icon
  if (color) {
    return (
      <div
        className={`rounded-full ${className}`}
        style={{
          backgroundColor: color,
          width: size * 0.75,
          height: size * 0.75,
        }}
      />
    );
  }

  // Ultimate fallback
  return (
    <Tag
      size={size}
      className={className}
      style={{ color: color || "currentColor" }}
    />
  );
}
