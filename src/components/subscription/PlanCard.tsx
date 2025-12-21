import { Check, Zap, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  name: string;
  price: string;
  period: string;
  equivalent?: string;
  isCurrentPlan: boolean;
  isPopular?: boolean;
  isBestValue?: boolean;
  hasSubscription: boolean;
  onSelect: () => void;
}

export function PlanCard({
  name,
  price,
  period,
  equivalent,
  isCurrentPlan,
  isPopular,
  isBestValue,
  hasSubscription,
  onSelect,
}: PlanCardProps) {
  // Show badge priority: current > bestValue > popular
  const showCurrentBadge = isCurrentPlan;
  const showBestValueBadge = !isCurrentPlan && isBestValue;
  const showPopularBadge = !isCurrentPlan && !isBestValue && isPopular;

  return (
    <div
      className={cn(
        "relative group flex flex-col rounded-2xl p-6 transition-all duration-300",
        "bg-card border border-border",
        // Hover effects for non-current plans
        !isCurrentPlan && "hover:border-primary/50 hover:shadow-primary cursor-pointer",
        // Current plan has subtle green accent
        isCurrentPlan && "border-success/30 bg-success/5",
        // Best value gets prominent styling
        isBestValue && !isCurrentPlan && "border-primary/30"
      )}
      onClick={!isCurrentPlan ? onSelect : undefined}
    >
      {/* Badge - Top right corner for current, Top center for others */}
      {showCurrentBadge && (
        <div className="absolute -top-3 right-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-success/20 text-success border border-success/30">
            <Check className="w-3 h-3" />
            Plano Atual
          </span>
        </div>
      )}
      
      {showBestValueBadge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground shadow-md">
            <TrendingUp className="w-3 h-3" />
            Mais Econômico
          </span>
        </div>
      )}
      
      {showPopularBadge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground shadow-md">
            <Sparkles className="w-3 h-3" />
            Mais Popular
          </span>
        </div>
      )}

      {/* Plan name */}
      <h3 className="text-lg font-semibold text-foreground text-center mt-2">
        {name}
      </h3>

      {/* Price section - show the full priceLabel */}
      <div className="flex items-center justify-center mt-4 mb-1">
        <span className="text-xl font-bold text-foreground tracking-tight">
          {price}
        </span>
        {period && <span className="text-sm text-muted-foreground ml-1">{period}</span>}
      </div>

      {/* Equivalent pricing for annual */}
      {equivalent && (
        <p className="text-center text-xs text-primary font-medium mb-4">
          Equivale a {equivalent}
        </p>
      )}
      
      {!equivalent && <div className="h-5 mb-4" />}

      {/* Action button */}
      {isCurrentPlan ? (
        <button
          disabled
          className="w-full mt-auto py-3 px-4 rounded-xl text-sm font-medium bg-muted text-muted-foreground cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Plano Atual
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={cn(
            "w-full mt-auto py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200",
            "flex items-center justify-center gap-2",
            "bg-primary text-primary-foreground",
            "hover:scale-[1.02] hover:shadow-primary-hover active:scale-[0.98]"
          )}
        >
          <Zap className="w-4 h-4" />
          {hasSubscription ? "Alterar" : "Assinar"}
        </button>
      )}
    </div>
  );
}
