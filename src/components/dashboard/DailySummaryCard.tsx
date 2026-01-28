import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Resumo do Dia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats - neutral cards with semantic values only */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Receita</span>
            </div>
            <p className="text-lg font-semibold text-positive">
              R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Despesas</span>
            </div>
            <p className="text-lg font-semibold text-negative">
              R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Lucro</span>
            </div>
            <p className={cn(
              "text-lg font-semibold",
              netProfit >= 0 ? "text-primary" : "text-negative"
            )}>
              R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Revenues List */}
        {revenues.length > 0 && (
          <div className="pt-3 border-t border-border">
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" />
              Receitas
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {revenues.map((revenue) => (
                <div
                  key={revenue.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/30 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium capitalize break-words">{revenue.app}</span>
                    {revenue.notes && (
                      <span className="text-xs text-muted-foreground break-words max-w-[200px]">
                        {revenue.notes}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-positive">
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
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <TrendingDown className="w-3 h-3" />
              Despesas
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/30 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium break-words">
                      {expense.source === "fuel"
                        ? "Combustível"
                        : categoryLabels[expense.category || ""] || expense.category}
                    </span>
                    {expense.notes && (
                      <span className="text-xs text-muted-foreground break-words max-w-[200px]">
                        {expense.notes}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-negative">
                    -R$ {expense.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {recurringTotal > 0 && (
                <div className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/30 text-sm">
                  <span className="font-medium">Despesas Fixas</span>
                  <span className="font-medium text-negative">
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
