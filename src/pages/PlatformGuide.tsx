import { useState, useEffect } from "react";
import { Book } from "lucide-react";
import { GUIDE_SECTIONS, GUIDE_INTRO } from "@/config/guideConfig";
import { GuideSectionCard } from "@/components/guide/GuideSectionCard";
import { GuideNavigation } from "@/components/guide/GuideNavigation";

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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Book className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{GUIDE_INTRO.subtitle}</h1>
              <p className="text-muted-foreground">{GUIDE_INTRO.title}</p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            {GUIDE_INTRO.description}
          </p>
        </div>

        {/* Content with sidebar navigation */}
        <div className="flex gap-8">
          {/* Sidebar navigation (desktop) */}
          <aside className="w-56 shrink-0">
            <GuideNavigation
              activeSection={activeSection}
              onSectionClick={handleSectionClick}
            />
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 space-y-6">
            {GUIDE_SECTIONS.map((section) => (
              <GuideSectionCard key={section.id} section={section} />
            ))}

            {/* Footer note */}
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>
                Dúvidas? Entre em contato pelo email{" "}
                <a
                  href="mailto:drivercontrolcontato@outlook.com"
                  className="text-primary hover:underline"
                >
                  drivercontrolcontato@outlook.com
                </a>
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
