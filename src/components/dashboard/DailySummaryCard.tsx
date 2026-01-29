import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrencyBRL } from "@/lib/format";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  eletrico: "Elétrico",
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
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [revenuesOpen, setRevenuesOpen] = useState(false);

  const hasExpenses = expenses.length > 0 || recurringTotal > 0;
  const hasRevenues = revenues.length > 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Horizontal Summary Row - Mobile First */}
        <div className="grid grid-cols-3 divide-x divide-border">
          {/* Revenue */}
          <div className="p-3 sm:p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Receita</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-positive truncate">
              {formatCurrencyBRL(totalRevenue)}
            </p>
          </div>

          {/* Expenses */}
          <div className="p-3 sm:p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Despesas</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-negative truncate">
              {formatCurrencyBRL(totalExpenses)}
            </p>
          </div>

          {/* Profit */}
          <div className="p-3 sm:p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wallet className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Lucro</span>
            </div>
            <p className={cn(
              "text-sm sm:text-lg font-bold truncate",
              netProfit >= 0 ? "text-primary" : "text-negative"
            )}>
              {formatCurrencyBRL(netProfit)}
            </p>
          </div>
        </div>

        {/* Collapsible Revenue Details */}
        {hasRevenues && (
          <Collapsible open={revenuesOpen} onOpenChange={setRevenuesOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-2.5 border-t border-border hover:bg-accent/50 transition-colors">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-positive" />
                  Ver receitas ({revenues.length})
                </span>
                {revenuesOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-3 space-y-1.5 max-h-40 overflow-y-auto">
                {revenues.map((revenue) => (
                  <div
                    key={revenue.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/40 text-sm"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium capitalize truncate">{revenue.app}</span>
                      {revenue.notes && (
                        <span className="text-xs text-muted-foreground truncate">
                          {revenue.notes}
                        </span>
                      )}
                    </div>
                    <span className="font-medium text-positive ml-2 shrink-0">
                      +{formatCurrencyBRL(revenue.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Collapsible Expense Details */}
        {hasExpenses && (
          <Collapsible open={expensesOpen} onOpenChange={setExpensesOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-2.5 border-t border-border hover:bg-accent/50 transition-colors">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingDown className="w-3 h-3 text-negative" />
                  Ver despesas ({expenses.length + (recurringTotal > 0 ? 1 : 0)})
                </span>
                {expensesOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-3 space-y-1.5 max-h-40 overflow-y-auto">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/40 text-sm"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium truncate">
                        {expense.source === "fuel"
                          ? "Combustível"
                          : categoryLabels[expense.category || ""] || expense.category}
                      </span>
                      {expense.notes && (
                        <span className="text-xs text-muted-foreground truncate">
                          {expense.notes}
                        </span>
                      )}
                    </div>
                    <span className="font-medium text-negative ml-2 shrink-0">
                      -{formatCurrencyBRL(expense.amount)}
                    </span>
                  </div>
                ))}
                {recurringTotal > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/40 text-sm">
                    <span className="font-medium">Despesas Fixas</span>
                    <span className="font-medium text-negative">
                      -{formatCurrencyBRL(recurringTotal)}
                    </span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* No data message */}
        {!hasRevenues && !hasExpenses && (
          <div className="px-4 py-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Nenhum lançamento neste dia
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
