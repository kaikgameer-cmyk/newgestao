import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Preciso entender de finanças para usar?",
    answer: "Não! O New Gestão foi criado para ser simples e direto. Você só precisa lançar suas corridas e despesas, e o sistema calcula tudo automaticamente.",
  },
  {
    question: "Consigo ver meus resultados por semana?",
    answer: "Sim! Nosso foco principal é a visão semanal, porque é assim que a maioria dos motoristas pensa sobre seus ganhos. Você também tem a visão mensal.",
  },
  {
    question: "Posso usar no celular?",
    answer: "Com certeza! O sistema foi desenvolvido pensando primeiro no mobile. Funciona perfeitamente no navegador do seu celular.",
  },
  {
    question: "Como funciona o controle de combustível?",
    answer: "Você lança seus abastecimentos com litros, valor e quilometragem. O sistema calcula automaticamente seu consumo médio (km/l) e custo por quilômetro.",
  },
  {
    question: "Posso controlar mais de um cartão de crédito?",
    answer: "Sim! Você pode cadastrar quantos cartões quiser e ver a fatura projetada de cada um separadamente.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-24 relative">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Perguntas <span className="text-gradient-primary">frequentes</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tire suas dúvidas sobre o New Gestão
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="text-left hover:text-primary hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
