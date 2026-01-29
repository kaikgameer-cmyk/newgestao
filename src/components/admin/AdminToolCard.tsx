import { ReactNode, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminToolMetric {
  label: string;
  value: string | number;
  variant?: "default" | "success" | "warning" | "destructive";
}

interface AdminToolCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  metrics?: AdminToolMetric[];
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Card colapsável para ferramentas administrativas
 * Exibe resumo quando fechado, interface completa quando aberto
 */
export function AdminToolCard({
  icon,
  title,
  description,
  metrics = [],
  children,
  defaultOpen = false,
}: AdminToolCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getVariantClasses = (variant: AdminToolMetric["variant"]) => {
    switch (variant) {
      case "success":
        return "bg-green-500/10 text-green-500 border-green-500/30";
      case "warning":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      case "destructive":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  return (
    <Card className="overflow-hidden transition-all duration-200">
      {/* Header - Always visible */}
      <CardHeader
        className={cn(
          "cursor-pointer select-none transition-colors hover:bg-muted/50",
          isOpen && "border-b"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon, Title, Description */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base">{title}</h3>
              <p className="text-sm text-muted-foreground truncate">{description}</p>
              
              {/* Metrics - Visible when closed */}
              {!isOpen && metrics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {metrics.map((metric, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className={cn("text-xs", getVariantClasses(metric.variant))}
                    >
                      {metric.label}: {metric.value}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Toggle Icon */}
          <button
            className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </CardHeader>

      {/* Content - Collapsible */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <CardContent className="pt-4">
          {children}
        </CardContent>
      </div>
    </Card>
  );
}
