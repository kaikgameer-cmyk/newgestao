import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Fuel, CreditCard, Calendar } from "lucide-react";
import logo from "@/assets/logo-ng.png";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Text */}
          <div className="space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <img src={logo} alt="New Gestão" className="w-5 h-5" />
              <span className="text-sm text-primary font-medium">Para motoristas de app</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Controle financeiro{" "}
              <span className="text-gradient-primary">sem complicação.</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-lg">
              Veja quanto entrou, quanto saiu e quanto sobrou no fim da semana. Simples assim.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#recursos">
                <Button variant="hero" size="xl">
                  Ver recursos
                </Button>
              </a>
              <a href="#como-funciona">
                <Button variant="glass" size="xl">
                  Como funciona
                </Button>
              </a>
            </div>
          </div>
          
          {/* Right side - Mock Dashboard */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
            
            <Card variant="elevated" className="relative p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Semana atual</span>
                <span className="text-xs px-2 py-1 rounded-full bg-success/20 text-success">+12% vs anterior</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <TrendingUp className="w-5 h-5 text-primary mb-2" />
                  <p className="text-2xl font-bold">R$ 2.450</p>
                  <p className="text-xs text-muted-foreground">Receita total</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50">
                  <Fuel className="w-5 h-5 text-primary mb-2" />
                  <p className="text-2xl font-bold">R$ 380</p>
                  <p className="text-xs text-muted-foreground">Combustível</p>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-primary">
                <p className="text-sm text-primary-foreground/80">Lucro líquido</p>
                <p className="text-3xl font-bold text-primary-foreground">R$ 1.820</p>
              </div>
              
              {/* Mini chart mock */}
              <div className="flex items-end gap-1 h-16 pt-4">
                {[40, 65, 45, 80, 55, 70, 90].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-primary/40 rounded-t transition-all hover:bg-primary"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>
            </Card>
            
            {/* Floating cards */}
            <Card className="absolute -left-8 top-1/4 p-3 animate-float shadow-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Nubank</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">R$ 245 em fatura</p>
            </Card>
            
            <Card className="absolute -right-4 bottom-1/4 p-3 animate-float shadow-lg" style={{ animationDelay: "1s" }}>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Média/dia</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">R$ 260 de lucro</p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
