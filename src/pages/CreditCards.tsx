import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, CreditCard as CardIcon, DollarSign, Percent, Loader2, Trash2, ChevronDown, Receipt, ChevronLeft, ChevronRight, Calendar, AlertTriangle, CheckCircle2, Circle, Fuel } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useInvalidateFinancialData } from "@/hooks/useInvalidateFinancialData";
import { startOfMonth, endOfMonth, format, addMonths, subMonths, differenceInDays, isSameMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GlobalDateFilter } from "@/components/GlobalDateFilter";
import { DatePreset, useDateFilterPresets } from "@/hooks/useDateFilterPresets";
import { DateRange } from "react-day-picker";
import { parseLocalDate } from "@/lib/dateUtils";
import { formatCurrencyBRL } from "@/lib/format";

export default function CreditCards() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [lastDigits, setLastDigits] = useState("");
  const [brand, setBrand] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [bestPurchaseDay, setBestPurchaseDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  
  // Global date filter state
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [customRange, setCustomRange] = useState<DateRange>();
  const { dateRange, formattedRange } = useDateFilterPresets(preset, customRange);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { invalidateAll } = useInvalidateFinancialData();

  const currentMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const selectedMonthKey = format(dateRange.from || new Date(), "yyyy-MM");

  // Fetch all credit cards
  const { data: creditCards = [], isLoading } = useQuery({
    queryKey: ["credit_cards", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
  const { data: cardExpenses = [] } = useQuery({
    queryKey: ["card_expenses", user?.id, formattedRange.from, formattedRange.to],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("id, credit_card_id, amount, date, category, notes, current_installment, total_installments")
        .eq("user_id", user.id)
        .gte("date", formattedRange.from)
        .lte("date", formattedRange.to)
        .not("credit_card_id", "is", null)
        .order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!formattedRange.from,
  });

  // Fetch ALL credit card expenses from current month onwards (for limit calculation)
  const { data: allCreditCardExpenses = [] } = useQuery({
    queryKey: ["all_credit_card_expenses", user?.id, currentMonthStart],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("id, credit_card_id, amount, date, current_installment, total_installments")
        .eq("user_id", user.id)
        .gte("date", currentMonthStart)
        .not("credit_card_id", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch ALL fuel logs with credit card from current month onwards (for limit calculation)
  const { data: allFuelLogsWithCard = [] } = useQuery({
    queryKey: ["all_fuel_logs_with_card", user?.id, currentMonthStart],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("fuel_logs")
        .select("id, credit_card_id, total_value, date")
        .eq("user_id", user.id)
        .gte("date", currentMonthStart)
        .not("credit_card_id", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch fuel logs for selected period (for display in card bills)
  const { data: fuelLogsForMonth = [] } = useQuery({
    queryKey: ["fuel_logs_for_month", user?.id, formattedRange.from, formattedRange.to],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("fuel_logs")
        .select("id, credit_card_id, total_value, date, station, fuel_type, liters")
        .eq("user_id", user.id)
        .gte("date", formattedRange.from)
        .lte("date", formattedRange.to)
        .not("credit_card_id", "is", null)
        .order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!formattedRange.from,
  });

  // Fetch paid bills
  const { data: paidBills = [] } = useQuery({
    queryKey: ["paid_bills", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("paid_bills")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Mark bill as paid mutation
  const markAsPaid = useMutation({
    mutationFn: async ({ cardId, amount }: { cardId: string; amount: number }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("paid_bills").insert({
        user_id: user.id,
        credit_card_id: cardId,
        month_year: selectedMonthKey,
        amount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Fatura marcada como paga!" });
    },
    onError: () => {
      toast({ title: "Erro ao marcar fatura", variant: "destructive" });
    },
  });

  // Unmark bill as paid mutation
  const unmarkAsPaid = useMutation({
    mutationFn: async (cardId: string) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("paid_bills")
        .delete()
        .eq("credit_card_id", cardId)
        .eq("month_year", selectedMonthKey)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Fatura desmarcada!" });
    },
    onError: () => {
      toast({ title: "Erro ao desmarcar fatura", variant: "destructive" });
    },
  });

  // Check if a bill is paid for the selected month
  const isBillPaid = (cardId: string) => {
    return paidBills.some(
      (bill) => bill.credit_card_id === cardId && bill.month_year === selectedMonthKey
    );
  };

  // Get paid bills for current month onwards to exclude from limit calculation
  const paidBillsSet = useMemo(() => {
    const currentMonth = format(new Date(), "yyyy-MM");
    return new Set(
      paidBills
        .filter((bill) => bill.month_year >= currentMonth)
        .map((bill) => `${bill.credit_card_id}-${bill.month_year}`)
    );
  }, [paidBills]);

  // Calculate totals using useMemo for performance
  const { expensesByCard, fuelLogsByCard, usedLimitByCard, totalPendingByCard } = useMemo(() => {
    // Group expenses by card for selected month display
    const expensesByCard = cardExpenses.reduce((acc, expense) => {
      if (expense.credit_card_id) {
        if (!acc[expense.credit_card_id]) acc[expense.credit_card_id] = [];
        acc[expense.credit_card_id].push(expense);
      }
      return acc;
    }, {} as Record<string, typeof cardExpenses>);

    // Group fuel logs by card for selected month display
    const fuelLogsByCard = fuelLogsForMonth.reduce((acc, log) => {
      if (log.credit_card_id) {
        if (!acc[log.credit_card_id]) acc[log.credit_card_id] = [];
        acc[log.credit_card_id].push(log);
      }
      return acc;
    }, {} as Record<string, typeof fuelLogsForMonth>);

    // Calculate used limit per card for selected month (for bill display) - includes expenses AND fuel
    const usedLimitByCard: Record<string, number> = {};
    
    cardExpenses.forEach((expense) => {
      if (expense.credit_card_id) {
        usedLimitByCard[expense.credit_card_id] = (usedLimitByCard[expense.credit_card_id] || 0) + Number(expense.amount);
      }
    });
    
    fuelLogsForMonth.forEach((log) => {
      if (log.credit_card_id) {
        usedLimitByCard[log.credit_card_id] = (usedLimitByCard[log.credit_card_id] || 0) + Number(log.total_value);
      }
    });

    // Calculate TOTAL pending from current month onwards (excluding paid bills) - includes expenses AND fuel
    const totalPendingByCard: Record<string, number> = {};
    
    allCreditCardExpenses.forEach((expense) => {
      if (expense.credit_card_id) {
        const expenseMonth = expense.date.substring(0, 7); // YYYY-MM
        const key = `${expense.credit_card_id}-${expenseMonth}`;
        
        // Only count if not paid
        if (!paidBillsSet.has(key)) {
          totalPendingByCard[expense.credit_card_id] = (totalPendingByCard[expense.credit_card_id] || 0) + Number(expense.amount);
        }
      }
    });
    
    allFuelLogsWithCard.forEach((log) => {
      if (log.credit_card_id) {
        const logMonth = log.date.substring(0, 7); // YYYY-MM
        const key = `${log.credit_card_id}-${logMonth}`;
        
        // Only count if not paid
        if (!paidBillsSet.has(key)) {
          totalPendingByCard[log.credit_card_id] = (totalPendingByCard[log.credit_card_id] || 0) + Number(log.total_value);
        }
      }
    });

    return { expensesByCard, fuelLogsByCard, usedLimitByCard, totalPendingByCard };
  }, [cardExpenses, fuelLogsForMonth, allCreditCardExpenses, allFuelLogsWithCard, paidBillsSet]);

  const createCard = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("credit_cards").insert({
        user_id: user.id,
        name,
        last_digits: lastDigits || null,
        brand: brand || null,
        credit_limit: creditLimit ? parseFloat(creditLimit) : null,
        best_purchase_day: bestPurchaseDay ? parseInt(bestPurchaseDay) : null,
        due_day: dueDay ? parseInt(dueDay) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Cartão adicionado!" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar cartão", variant: "destructive" });
    },
  });

  const deleteCard = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase.from("credit_cards").delete().eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Cartão removido!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover cartão", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setLastDigits("");
    setBrand("");
    setCreditLimit("");
    setBestPurchaseDay("");
    setDueDay("");
  };

  // Calculate summary totals
  const { totalLimit, totalPending, totalAvailable, availablePercentage, totalUsed } = useMemo(() => {
    const totalLimit = creditCards.reduce((acc, card) => acc + (Number(card.credit_limit) || 0), 0);
    const totalPending = Object.values(totalPendingByCard).reduce((acc, val) => acc + val, 0);
    const totalUsed = Object.values(usedLimitByCard).reduce((acc, val) => acc + val, 0);
    const totalAvailable = Math.max(0, totalLimit - totalPending);
    const availablePercentage = totalLimit > 0 ? ((totalAvailable / totalLimit) * 100).toFixed(0) : "100";
    
    return { totalLimit, totalPending, totalAvailable, availablePercentage, totalUsed };
  }, [creditCards, totalPendingByCard, usedLimitByCard]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cartões de Crédito</h1>
          <p className="text-muted-foreground">
            Gerencie seus cartões e acompanhe suas faturas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <GlobalDateFilter
            preset={preset}
            onPresetChange={setPreset}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="lg">
              <Plus className="w-5 h-5" />
              Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adicionar Cartão</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createCard.mutate(); }} className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome do cartão *</Label>
                <Input 
                  placeholder="Ex: Nubank" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Últimos 4 dígitos</Label>
                  <Input 
                    placeholder="0000" 
                    maxLength={4}
                    value={lastDigits}
                    onChange={(e) => setLastDigits(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bandeira</Label>
                  <Input 
                    placeholder="Visa, Mastercard..."
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Limite</Label>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Melhor dia de compra</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={31} 
                    placeholder="1"
                    value={bestPurchaseDay}
                    onChange={(e) => setBestPurchaseDay(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dia de vencimento</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={31} 
                    placeholder="10"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={createCard.isPending}>
                {createCard.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Cartão"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {creditCards.length === 0 ? (
        <Card variant="elevated" className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CardIcon className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Nenhum cartão cadastrado</h3>
              <p className="text-muted-foreground max-w-md">
                Adicione seus cartões de crédito para acompanhar suas faturas e gastos.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Card variant="elevated">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Limite Total</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrencyBRL(totalLimit)}</p>
              </CardContent>
            </Card>
            <Card variant="elevated">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <CardIcon className="w-5 h-5 text-destructive" />
                  </div>
                  <span className="text-sm text-muted-foreground">Total Comprometido</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{formatCurrencyBRL(totalPending)}</p>
                <p className="text-xs text-muted-foreground mt-1">Fatura do mês: {formatCurrencyBRL(totalUsed)}</p>
              </CardContent>
            </Card>
            <Card variant="elevated">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Percent className="w-5 h-5 text-success" />
                  </div>
                  <span className="text-sm text-muted-foreground">Limite Disponível</span>
                </div>
                <p className="text-2xl font-bold text-success">{availablePercentage}%</p>
                <p className="text-sm text-muted-foreground">{formatCurrencyBRL(totalAvailable)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Cards Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {creditCards.map((card) => {
              const cardLimit = Number(card.credit_limit) || 0;
              const cardUsed = usedLimitByCard[card.id] || 0;
              const cardFuelLogs = fuelLogsByCard[card.id] || [];
              const cardPending = totalPendingByCard[card.id] || 0;
              const cardAvailable = Math.max(0, cardLimit - cardPending);
              const cardUsedPercent = cardLimit > 0 ? (cardPending / cardLimit) * 100 : 0;
              const cardExpensesList = expensesByCard[card.id] || [];
              const isPaid = isBillPaid(card.id);

              // Calculate due date alert
              const today = new Date();
              const isCurrentMonth = isSameMonth(dateRange.from || new Date(), today);
              let daysUntilDue = 0;
              let isDueSoon = false;
              let isOverdue = false;
              
              if (card.due_day && isCurrentMonth && cardUsed > 0 && !isPaid) {
                const dueDate = new Date(today.getFullYear(), today.getMonth(), card.due_day);
                daysUntilDue = differenceInDays(dueDate, today);
                isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 5;
                isOverdue = daysUntilDue < 0;
              }

              return (
                <Card key={card.id} variant="elevated" className={`hover:border-primary/30 transition-colors ${isPaid ? 'border-success/30 bg-success/5' : ''}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{card.name}</CardTitle>
                        {isPaid && (
                          <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Paga
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{card.brand || "—"}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteCard.mutate(card.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {card.last_digits ? `•••• ${card.last_digits}` : "—"}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Due date alert */}
                    {(isDueSoon || isOverdue) && !isPaid && (
                      <Alert variant={isOverdue ? "destructive" : "default"} className={`${isDueSoon && !isOverdue ? 'border-primary bg-primary/10' : ''}`}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {isOverdue 
                            ? `Fatura vencida há ${Math.abs(daysUntilDue)} dia(s)! Valor: ${formatCurrencyBRL(cardUsed)}`
                            : daysUntilDue === 0 
                              ? `Fatura vence hoje! Valor: ${formatCurrencyBRL(cardUsed)}`
                              : `Fatura vence em ${daysUntilDue} dia(s)! Valor: ${formatCurrencyBRL(cardUsed)}`
                          }
                        </AlertDescription>
                      </Alert>
                    )}

                    {cardLimit > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Limite</span>
                          <span className="font-medium">{formatCurrencyBRL(cardLimit)}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${cardUsedPercent > 80 ? 'bg-destructive' : cardUsedPercent > 50 ? 'bg-primary' : 'bg-success'}`}
                            style={{ width: `${Math.min(cardUsedPercent, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-destructive">Comprometido: {formatCurrencyBRL(cardPending)}</span>
                          <span className="text-success">Disponível: {formatCurrencyBRL(cardAvailable)}</span>
                        </div>
                        {cardUsed > 0 && cardUsed !== cardPending && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Fatura do mês: {formatCurrencyBRL(cardUsed)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Card details */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Melhor compra</p>
                        <p className="font-medium">{card.best_purchase_day ? `Dia ${card.best_purchase_day}` : "—"}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Vencimento</p>
                        <p className="font-medium">{card.due_day ? `Dia ${card.due_day}` : "—"}</p>
                      </div>
                    </div>

                    {/* Monthly bill breakdown */}
                    {(cardExpensesList.length > 0 || cardFuelLogs.length > 0) && (
                      <Collapsible className="pt-4 border-t border-border/50">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                            <div className="flex items-center gap-2 text-sm">
                              <Receipt className="w-4 h-4 text-primary" />
                              <span>Lançamentos do período</span>
                              <span className="text-muted-foreground">({cardExpensesList.length + cardFuelLogs.length} lançamentos)</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3 space-y-2">
                          {cardExpensesList.map((expense) => (
                            <div 
                              key={expense.id} 
                              className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 text-sm"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium capitalize">{expense.category}</span>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{new Date(expense.date).toLocaleDateString("pt-BR")}</span>
                                  {expense.total_installments && expense.total_installments > 1 && (
                                    <span className="text-primary">
                                      {expense.current_installment}/{expense.total_installments}x
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="font-medium text-destructive">
                                {formatCurrencyBRL(expense.amount)}
                              </span>
                            </div>
                          ))}
                          {cardFuelLogs.map((log) => (
                            <div 
                              key={log.id} 
                              className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 text-sm"
                            >
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <Fuel className="w-3 h-3 text-primary" />
                                  <span className="font-medium">Combustível</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{new Date(log.date).toLocaleDateString("pt-BR")}</span>
                                  <span>{log.station || ""} {Number(log.liters).toFixed(1)}L {log.fuel_type}</span>
                                </div>
                              </div>
                              <span className="font-medium text-destructive">
                                {formatCurrencyBRL(log.total_value)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between pt-2 border-t border-border/50 font-medium">
                            <span>Total da fatura</span>
                            <span className={isPaid ? "text-success" : "text-destructive"}>
                              {formatCurrencyBRL(cardUsed)}
                            </span>
                          </div>
                          
                          {/* Mark as paid/unpaid button */}
                          <Button
                            variant={isPaid ? "outline" : "default"}
                            size="sm"
                            className={`w-full mt-2 ${isPaid ? 'border-success text-success hover:bg-success/10' : ''}`}
                            onClick={() => {
                              if (isPaid) {
                                unmarkAsPaid.mutate(card.id);
                              } else {
                                markAsPaid.mutate({ cardId: card.id, amount: cardUsed });
                              }
                            }}
                            disabled={markAsPaid.isPending || unmarkAsPaid.isPending}
                          >
                            {markAsPaid.isPending || unmarkAsPaid.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isPaid ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Fatura Paga
                              </>
                            ) : (
                              <>
                                <Circle className="w-4 h-4 mr-2" />
                                Marcar como Paga
                              </>
                            )}
                          </Button>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {cardExpensesList.length === 0 && cardFuelLogs.length === 0 && (
                      <div className="pt-4 border-t border-border/50 text-center text-sm text-muted-foreground">
                        <p>Nenhum lançamento neste mês</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
