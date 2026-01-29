import { useState, useEffect } from "react";
import { Book } from "lucide-react";
import { GUIDE_SECTIONS, GUIDE_INTRO } from "@/config/guideConfig";
import { GuideSectionCard } from "@/components/guide/GuideSectionCard";
import { GuideNavigation } from "@/components/guide/GuideNavigation";
import { GuideMobileNav } from "@/components/guide/GuideMobileNav";

/**
 * Página de Guia da Plataforma
 * Exibe todas as seções de ajuda com navegação lateral
 * 
 * Para atualizar o conteúdo, edite: src/config/guideConfig.ts
 */
export default function PlatformGuide() {
  const [activeSection, setActiveSection] = useState(GUIDE_SECTIONS[0]?.id || "");

  // Scroll to section when clicked
  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Update active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const sections = GUIDE_SECTIONS.map((s) => ({
        id: s.id,
        element: document.getElementById(s.id),
      }));

      for (const section of sections) {
        if (section.element) {
          const rect = section.element.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom > 150) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Book className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{GUIDE_INTRO.subtitle}</h1>
              <p className="text-sm text-muted-foreground truncate">{GUIDE_INTRO.title}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            {GUIDE_INTRO.description}
          </p>
        </div>

        {/* Mobile Navigation */}
        <GuideMobileNav
          activeSection={activeSection}
          onSectionClick={handleSectionClick}
        />

        {/* Content with sidebar navigation */}
        <div className="flex gap-8">
          {/* Sidebar navigation (desktop only) */}
          <aside className="hidden lg:block w-64 shrink-0">
            <GuideNavigation
              activeSection={activeSection}
              onSectionClick={handleSectionClick}
            />
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 space-y-4 sm:space-y-6">
            {GUIDE_SECTIONS.map((section) => (
              <GuideSectionCard key={section.id} section={section} />
            ))}

            {/* Footer note */}
            <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm space-y-2">
              <p>
                Dúvidas? Entre em contato pelo email{" "}
                <a
                  href="mailto:newgestao.contato@outlook.com"
                  className="text-primary hover:underline"
                >
                  newgestao.contato@outlook.com
                </a>
              </p>
              <p className="text-xs">
                Última atualização: Dezembro 2025
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
