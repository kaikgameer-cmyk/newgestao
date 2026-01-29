import { BarChart3, Calendar, Fuel, CreditCard } from "lucide-react";

const previews = [
  {
    icon: BarChart3,
    title: "Dashboard",
    description: "Resumo completo de receitas, despesas e lucro",
  },
  {
    icon: Calendar,
    title: "Visão Semanal",
    description: "Acompanhe seu desempenho semana a semana",
  },
  {
    icon: Fuel,
    title: "Combustível",
    description: "Histórico de abastecimentos e métricas",
  },
  {
    icon: CreditCard,
    title: "Cartões",
    description: "Controle de faturas e gastos",
  },
];

export function PreviewsSection() {
  return (
    <section className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Conheça as <span className="text-primary">telas</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Interface limpa e objetiva para você focar no que importa
          </p>
        </div>
        
        {/* Previews grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="group rounded-xl bg-card border border-border overflow-hidden hover:border-border-strong transition-colors"
            >
              {/* Preview area */}
              <div className="aspect-[4/3] bg-secondary/50 flex items-center justify-center">
                <preview.icon className="w-12 h-12 text-primary/30 group-hover:text-primary/50 transition-colors" />
              </div>
              
              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold mb-1">{preview.title}</h3>
                <p className="text-sm text-muted-foreground">{preview.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
