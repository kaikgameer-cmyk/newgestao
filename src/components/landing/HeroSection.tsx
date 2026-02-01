import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center pt-16 overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[120px]" />
      
      <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border">
            <span className="text-sm text-muted-foreground">Feito para motoristas de Uber, 99 e InDrive</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
            Saiba quanto você{" "}
            <span className="text-primary">realmente</span>{" "}
            está ganhando.
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Controle financeiro simples para motoristas de app. 
            Veja quanto entrou, quanto saiu e quanto sobrou no fim da semana.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/login">
              <Button size="lg" className="h-12 px-8 text-base font-medium gap-2">
                Entrar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button variant="ghost" size="lg" className="h-12 px-8 text-base font-medium text-muted-foreground hover:text-foreground">
                Como funciona
              </Button>
            </a>
          </div>

          {/* Dashboard Preview */}
          <div className="relative pt-12 md:pt-16">
            <div className="relative mx-auto max-w-3xl">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-2xl" />
              
              {/* Dashboard mockup */}
              <div className="relative bg-card border border-border rounded-2xl p-4 md:p-6 shadow-lg">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <img src="/logo-ng.png" alt="NG" className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Semana atual</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-positive-muted text-positive font-medium">
                    +12% vs anterior
                  </span>
                </div>
                
                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 md:gap-4 mb-4">
                  <div className="p-3 md:p-4 rounded-xl bg-secondary/50">
                    <p className="text-xs text-muted-foreground mb-1">Receita</p>
                    <p className="text-lg md:text-2xl font-bold text-positive">R$ 2.450</p>
                  </div>
                  <div className="p-3 md:p-4 rounded-xl bg-secondary/50">
                    <p className="text-xs text-muted-foreground mb-1">Despesas</p>
                    <p className="text-lg md:text-2xl font-bold text-negative">R$ 630</p>
                  </div>
                  <div className="p-3 md:p-4 rounded-xl bg-secondary/50">
                    <p className="text-xs text-muted-foreground mb-1">Lucro</p>
                    <p className="text-lg md:text-2xl font-bold text-foreground">R$ 1.820</p>
                  </div>
                </div>
                
                {/* Chart mock */}
                <div className="p-3 md:p-4 rounded-xl bg-secondary/30">
                  <div className="flex items-end gap-1.5 h-20 md:h-24">
                    {[35, 55, 40, 70, 50, 65, 85].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary/20 rounded-t-sm hover:bg-primary/40 transition-colors"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground mt-2">
                    <span>Seg</span>
                    <span>Ter</span>
                    <span>Qua</span>
                    <span>Qui</span>
                    <span>Sex</span>
                    <span>Sáb</span>
                    <span>Dom</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
          <ChevronDown className="w-6 h-6 text-muted-foreground/50" />
        </div>
      </div>
    </section>
  );
}
