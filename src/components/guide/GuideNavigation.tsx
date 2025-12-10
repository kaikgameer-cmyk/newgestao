import { cn } from "@/lib/utils";
import { GUIDE_SECTIONS } from "@/config/guideConfig";

interface GuideNavigationProps {
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

/**
 * Navegação lateral para o guia (desktop)
 * Permite pular diretamente para cada seção
 */
export function GuideNavigation({ activeSection, onSectionClick }: GuideNavigationProps) {
  return (
    <nav className="hidden lg:block sticky top-6 space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-3">
        Seções
      </p>
      {GUIDE_SECTIONS.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        
        return (
          <button
            key={section.id}
            onClick={() => onSectionClick(section.id)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{section.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
