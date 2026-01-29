import { useState } from "react";
import { Menu, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { GUIDE_SECTIONS } from "@/config/guideConfig";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GuideMobileNavProps {
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

/**
 * Navegação mobile para o guia (drawer lateral)
 * Abre um sheet com lista de seções
 */
export function GuideMobileNav({ activeSection, onSectionClick }: GuideMobileNavProps) {
  const [open, setOpen] = useState(false);

  const handleSectionClick = (sectionId: string) => {
    onSectionClick(sectionId);
    setOpen(false);
  };

  const currentSection = GUIDE_SECTIONS.find(s => s.id === activeSection);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between lg:hidden mb-4"
        >
          <div className="flex items-center gap-2">
            <Menu className="w-4 h-4" />
            <span className="truncate">
              {currentSection?.title || "Selecionar seção"}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-left text-lg">Seções do Guia</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)]">
          <nav className="p-4 space-y-1">
            {GUIDE_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 text-sm rounded-lg transition-colors text-left",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{section.title}</span>
                </button>
              );
            })}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
