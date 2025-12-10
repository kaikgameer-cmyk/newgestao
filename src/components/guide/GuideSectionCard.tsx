import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";
import { GuideSection } from "@/config/guideConfig";

interface GuideSectionCardProps {
  section: GuideSection;
}

/**
 * Componente de card para exibir uma seção do guia
 * Reutilizável e estilizado conforme o design system
 */
export function GuideSectionCard({ section }: GuideSectionCardProps) {
  const Icon = section.icon;

  return (
    <Card className="bg-card border-border" id={section.id}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-xl">{section.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Description */}
        <p className="text-muted-foreground">{section.description}</p>

        {/* Features */}
        <div className="space-y-4">
          {section.features.map((feature, index) => (
            <div key={index} className="border-l-2 border-primary/30 pl-4">
              <h4 className="font-medium text-foreground mb-1">{feature.title}</h4>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Tips */}
        {section.tips && section.tips.length > 0 && (
          <div className="bg-primary/5 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary font-medium text-sm">
              <Lightbulb className="w-4 h-4" />
              Dicas
            </div>
            <ul className="space-y-1">
              {section.tips.map((tip, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {tip.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
