import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

// List of commonly used icons for platforms and expense categories
const COMMON_ICONS = [
  // Transport / Vehicles
  "Car", "CarTaxiFront", "Bike", "Truck", "Navigation", "Route", "MapPin",
  // Fuel / Energy
  "Fuel", "Zap", "Battery", "BatteryCharging", "Plug",
  // Maintenance
  "Wrench", "Settings", "Cog", "Tool", "Hammer",
  // Cleaning
  "Droplets", "Droplet", "Sparkles", "Spray",
  // Food
  "Utensils", "UtensilsCrossed", "Coffee", "Pizza", "Sandwich",
  // Shopping
  "ShoppingCart", "ShoppingBag", "Package", "Box", "Gift",
  // Money / Finance
  "DollarSign", "CreditCard", "Wallet", "Banknote", "Coins", "PiggyBank",
  // Travel
  "Plane", "Train", "Bus", "Ticket", "Milestone",
  // Parking
  "ParkingCircle", "ParkingSquare", "CircleParking",
  // Communication
  "Phone", "Smartphone", "Mail", "MessageCircle",
  // User / Personal
  "User", "Users", "UserCircle", "Heart", "Star",
  // Documents
  "FileText", "Receipt", "ClipboardList", "Notebook",
  // General
  "Tag", "Bookmark", "Flag", "Award", "Trophy", "Crown",
  // Home / Building
  "Home", "Building", "Store", "Warehouse",
  // Health
  "Pill", "Stethoscope", "Activity", "HeartPulse",
  // Entertainment
  "Gamepad", "Music", "Film", "Tv",
  // Nature
  "Sun", "Cloud", "Leaf", "Tree",
] as const;

interface IconPickerProps {
  value?: string | null;
  onChange: (iconName: string) => void;
  color?: string;
}

export function IconPicker({ value, onChange, color = "#FFC700" }: IconPickerProps) {
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return COMMON_ICONS;
    const query = search.toLowerCase();
    return COMMON_ICONS.filter((name) =>
      name.toLowerCase().includes(query)
    );
  }, [search]);

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[iconName];
    if (!IconComponent || typeof IconComponent !== 'function') return null;
    return <IconComponent size={20} />;
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar ícone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Preview of selected icon */}
      {value && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
          <div
            className="p-2 rounded-md"
            style={{ backgroundColor: `${color}20` }}
          >
            <span style={{ color }}>
              {renderIcon(value)}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            Selecionado: <span className="font-medium text-foreground">{value}</span>
          </span>
        </div>
      )}

      {/* Icon Grid */}
      <ScrollArea className="h-48 rounded-lg border border-border p-2">
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
          {filteredIcons.map((iconName) => {
            const isSelected = value === iconName;
            return (
              <Button
                key={iconName}
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 transition-all",
                  isSelected && "ring-2 ring-primary bg-primary/10"
                )}
                onClick={() => onChange(iconName)}
                title={iconName}
              >
                <span style={{ color: isSelected ? color : undefined }}>
                  {renderIcon(iconName)}
                </span>
              </Button>
            );
          })}
        </div>
        {filteredIcons.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhum ícone encontrado
          </p>
        )}
      </ScrollArea>
    </div>
  );
}
