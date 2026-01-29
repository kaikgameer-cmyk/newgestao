import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { GuideSection } from "@/config/guideConfig";

interface GuideSectionCardProps {
  section: GuideSection;
}

/**
 * Componente de card para exibir uma seção do guia
 * Inclui features, regras, erros comuns e dicas
 * Responsivo para mobile/tablet/desktop
 */
export function GuideSectionCard({ section }: GuideSectionCardProps) {
  const Icon = section.icon;

  return (
    <Card className="bg-card border-border" id={section.id}>
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <CardTitle className="text-lg sm:text-xl">{section.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Description */}
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {section.description}
        </p>

        {/* Features - "Como usar" */}
        <div className="space-y-3 sm:space-y-4">
          <h4 className="text-xs sm:text-sm font-medium text-primary uppercase tracking-wide">
            Como funciona
          </h4>
          {section.features.map((feature, index) => (
            <div key={index} className="border-l-2 border-primary/30 pl-3 sm:pl-4">
              <h5 className="font-medium text-sm sm:text-base text-foreground mb-1">
                {feature.title}
              </h5>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Rules - "Regras importantes" */}
        {section.rules && section.rules.length > 0 && (
          <div className="bg-secondary/50 rounded-lg p-3 sm:p-4 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-medium text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              Regras importantes
            </div>
            <ul className="space-y-2">
              {section.rules.map((rule, index) => (
                <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span className="leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Common Errors - "Erros comuns / como resolver" */}
        {section.commonErrors && section.commonErrors.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 sm:p-4 space-y-3">
            <div className="flex items-center gap-2 text-destructive font-medium text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Erros comuns e soluções
            </div>
            <div className="space-y-3">
              {section.commonErrors.map((item, index) => (
                <div key={index} className="text-xs sm:text-sm space-y-1">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                    <span className="text-foreground font-medium leading-relaxed">{item.error}</span>
                  </div>
                  <div className="flex items-start gap-2 ml-5">
                    <CheckCircle2 className="w-3 h-3 text-success shrink-0 mt-0.5" />
                    <span className="text-muted-foreground leading-relaxed">{item.solution}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips - "Dicas" */}
        {section.tips && section.tips.length > 0 && (
          <div className="bg-primary/5 rounded-lg p-3 sm:p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary font-medium text-xs sm:text-sm">
              <Lightbulb className="w-4 h-4 shrink-0" />
              Dicas
            </div>
            <ul className="space-y-1">
              {section.tips.map((tip, index) => (
                <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary shrink-0">•</span>
                  <span className="leading-relaxed">{tip.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
