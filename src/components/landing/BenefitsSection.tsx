import { Check } from "lucide-react";

const benefits = [
  "Interface simples, sem termos complicados de finanças",
  "Foco em semanas — como você pensa sobre seus ganhos",
  "Funciona perfeitamente no celular",
  "Feito por quem entende a rotina de motorista",
];

const stats = [
  { value: "5min", label: "Para lançar uma semana" },
  { value: "100%", label: "Responsivo (mobile)" },
  { value: "24/7", label: "Acesso ao sistema" },
  { value: "∞", label: "Lançamentos ilimitados" },
];

export function BenefitsSection() {
  return (
    <section id="como-funciona" className="py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-secondary/30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left - Text content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Feito para quem{" "}
                <span className="text-primary">dirige todo dia</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                Sem planilhas complicadas. Sem apps genéricos. 
                Um sistema pensado especificamente para motoristas de app.
              </p>
            </div>
            
            <ul className="space-y-4">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-foreground/90">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Right - Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="p-5 md:p-6 rounded-xl bg-card border border-border text-center"
              >
                <p className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
