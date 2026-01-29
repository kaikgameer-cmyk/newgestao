import { TrendingUp, Fuel, CreditCard, Calendar, Gauge, Target } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Lucro real da semana",
    description: "Veja quanto sobrou depois de descontar combustível, manutenção e outras despesas.",
  },
  {
    icon: Fuel,
    title: "Controle de combustível",
    description: "Registre abastecimentos e saiba seu custo por km e consumo médio.",
  },
  {
    icon: CreditCard,
    title: "Gestão de cartões",
    description: "Acompanhe gastos por cartão e saiba quanto vai fechar cada fatura.",
  },
  {
    icon: Calendar,
    title: "Visão semanal e mensal",
    description: "Compare semanas e meses para entender seu ritmo de ganhos.",
  },
  {
    icon: Gauge,
    title: "Métricas automáticas",
    description: "R$/km, R$/hora e R$/viagem calculados automaticamente.",
  },
  {
    icon: Target,
    title: "Metas diárias",
    description: "Defina quanto quer ganhar por dia e acompanhe seu progresso.",
  },
];

export function FeaturesSection() {
  return (
    <section id="recursos" className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tudo o que você precisa para{" "}
            <span className="text-primary">controlar suas finanças</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Funcionalidades pensadas para a rotina de quem dirige todo dia.
          </p>
        </div>
        
        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-5 md:p-6 rounded-xl bg-card border border-border hover:border-border-strong transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
