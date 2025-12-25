import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  category?: string;
  notes?: string;
  source?: string;
}

interface Revenue {
  id: string;
  amount: number;
  app: string;
  notes?: string | null;
}

interface DailySummaryCardProps {
  revenues: Revenue[];
  expenses: Transaction[];
  recurringTotal: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

const categoryLabels: Record<string, string> = {
  combustivel: "Combustível",
  manutencao: "Manutenção",
  lavagem: "Lavagem",
  pedagio: "Pedágio",
  estacionamento: "Estacionamento",
  alimentacao: "Alimentação",
  cartao: "Cartão",
  outro: "Outro",
};

export function DailySummaryCard({
  revenues,
  expenses,
  recurringTotal,
  totalRevenue,
  totalExpenses,
  netProfit,
}: DailySummaryCardProps) {
  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Resumo do Dia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
            <TrendingUp className="w-4 h-4 text-success mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Receita</p>
            <p className="text-lg font-bold text-success">
              R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <TrendingDown className="w-4 h-4 text-destructive mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Despesas</p>
            <p className="text-lg font-bold text-destructive">
              R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <Wallet className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Lucro</p>
            <p className={`text-lg font-bold ${netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
              R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Revenues List */}
        {revenues.length > 0 && (
          <div className="pt-3 border-t border-border">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
              Receitas
            </h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {revenues.map((revenue) => (
                <div
                  key={revenue.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/30 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium capitalize break-words">{revenue.app}</span>
                    {revenue.notes && (
                      <span className="text-xs text-muted-foreground break-words max-w-[220px]">
                        {revenue.notes}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-success">
                    +R$ {Number(revenue.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expenses List */}
        {(expenses.length > 0 || recurringTotal > 0) && (
          <div className="pt-3 border-t border-border">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-destructive" />
              Despesas
            </h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/30 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium break-words">
                      {expense.source === "fuel"
                        ? "Combustível"
                        : categoryLabels[expense.category || ""] || expense.category}
                    </span>
                    {expense.notes && (
                      <span className="text-xs text-muted-foreground break-words max-w-[220px]">
                        {expense.notes}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-destructive">
                    -R$ {expense.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {recurringTotal > 0 && (
                <div className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/30 text-sm">
                  <span className="font-medium">Despesas Fixas</span>
                  <span className="font-medium text-destructive">
                    -R$ {recurringTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {revenues.length === 0 && expenses.length === 0 && recurringTotal === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum lançamento neste dia
          </p>
        )}
      </CardContent>
    </Card>
  );
}
