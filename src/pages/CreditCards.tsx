import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, CreditCard as CardIcon, DollarSign, Percent, Loader2, Trash2, ChevronDown, Calendar, AlertTriangle, CheckCircle2, Fuel, FileText, Pencil, Banknote } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useInvalidateFinancialData } from "@/hooks/useInvalidateFinancialData";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrencyBRL } from "@/lib/format";

export default function CreditCards() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [name, setName] = useState("");
  const [lastDigits, setLastDigits] = useState("");
  const [brand, setBrand] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [bestPurchaseDay, setBestPurchaseDay] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { invalidateAll } = useInvalidateFinancialData();
  const queryClient = useQueryClient();

  // Define type for credit card with calculated limits
  interface CreditCardWithLimits {
    id: string;
    user_id: string;
    name: string;
    last_digits: string | null;
    brand: string | null;
    credit_limit: number | null;
    closing_day: number | null;
    due_day: number | null;
    due_month_offset: number | null;
    best_purchase_day: number | null;
    created_at: string;
    updated_at: string;
    committed: number;
    available: number;
  }

  // Fetch all credit cards with calculated limits from view
  const { data: creditCards = [], isLoading: isLoadingCards } = useQuery<CreditCardWithLimits[]>({
    queryKey: ["credit_cards_with_limits", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("credit_cards_with_limits" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CreditCardWithLimits[];
    },
    enabled: !!user,
  });

  // Fetch all invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["credit_card_invoices", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("credit_card_invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("closing_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate invoice-based data (now using committed/available from view)
  const { 
    invoicesByCard, 
    currentInvoiceByCard, 
    overdueInvoicesByCard
  } = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    
    // Group invoices by card
    const invoicesByCard: Record<string, typeof invoices> = {};
    invoices.forEach(inv => {
      if (!invoicesByCard[inv.credit_card_id]) {
        invoicesByCard[inv.credit_card_id] = [];
      }
      invoicesByCard[inv.credit_card_id].push(inv);
    });

    // For each card, find current invoice (closing_date >= today) and overdue invoices
    const currentInvoiceByCard: Record<string, typeof invoices[0] | null> = {};
    const overdueInvoicesByCard: Record<string, typeof invoices> = {};

    creditCards.forEach(card => {
      const cardInvoices = invoicesByCard[card.id] || [];
      
      // Find current cycle invoice (closing_date >= today)
      const currentCycleInvoice = cardInvoices.find(inv => inv.closing_date >= todayStr && inv.status === 'open');
      currentInvoiceByCard[card.id] = currentCycleInvoice || null;
      
      // Overdue invoices: balance > 0 AND due_date < today
      overdueInvoicesByCard[card.id] = cardInvoices.filter(
        inv => Number(inv.balance) > 0 && inv.due_date < todayStr
      );
    });

    return { invoicesByCard, currentInvoiceByCard, overdueInvoicesByCard };
  }, [creditCards, invoices]);

  // Calculate summary totals using committed/available from view
  const { totalLimit, totalCommitted, totalAvailable, availablePercentage } = useMemo(() => {
    const totalLimit = creditCards.reduce((acc, card) => acc + (Number(card.credit_limit) || 0), 0);
    const totalCommitted = creditCards.reduce((acc, card) => acc + (Number((card as any).committed) || 0), 0);
    const totalAvailable = creditCards.reduce((acc, card) => acc + (Number((card as any).available) || 0), 0);
    const availablePercentage = totalLimit > 0 ? ((totalAvailable / totalLimit) * 100).toFixed(0) : "100";
    
    return { totalLimit, totalCommitted, totalAvailable, availablePercentage };
  }, [creditCards]);

  const createCard = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      if (!closingDay || !dueDay) throw new Error("Dia de fechamento e vencimento são obrigatórios");
      const { error } = await supabase.from("credit_cards").insert({
        user_id: user.id,
        name,
        last_digits: lastDigits || null,
        brand: brand || null,
        credit_limit: creditLimit ? parseFloat(creditLimit) : null,
        best_purchase_day: bestPurchaseDay ? parseInt(bestPurchaseDay) : null,
        closing_day: parseInt(closingDay),
        due_day: parseInt(dueDay),
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

  const updateCard = useMutation({
    mutationFn: async () => {
      if (!editingCard) throw new Error("Nenhum cartão selecionado");
      if (!editingCard.closing_day || !editingCard.due_day) {
        throw new Error("Dia de fechamento e vencimento são obrigatórios");
      }
      const { error } = await supabase
        .from("credit_cards")
        .update({
          name: editingCard.name,
          last_digits: editingCard.last_digits || null,
          brand: editingCard.brand || null,
          credit_limit: editingCard.credit_limit ? parseFloat(editingCard.credit_limit) : null,
          best_purchase_day: editingCard.best_purchase_day ? parseInt(editingCard.best_purchase_day) : null,
          closing_day: parseInt(editingCard.closing_day),
          due_day: parseInt(editingCard.due_day),
        })
        .eq("id", editingCard.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setIsEditDialogOpen(false);
      setEditingCard(null);
      toast({ title: "Cartão atualizado!" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Erro ao atualizar cartão", variant: "destructive" });
    },
  });

  // Payment mutation
  const registerPayment = useMutation({
    mutationFn: async () => {
      if (!user || !selectedInvoice) throw new Error("Dados inválidos");
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Valor inválido");
      if (amount > Number(selectedInvoice.balance)) throw new Error("Valor maior que o saldo da fatura");

      const { error } = await supabase.from("credit_card_transactions").insert({
        user_id: user.id,
        credit_card_id: selectedInvoice.credit_card_id,
        invoice_id: selectedInvoice.id,
        date: format(new Date(), "yyyy-MM-dd"),
        amount: amount,
        type: "payment",
        description: `Pagamento fatura ${format(new Date(selectedInvoice.closing_date + 'T12:00:00'), "MMM/yy", { locale: ptBR })}`,
        category: "pagamento",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["credit_cards_with_limits"] });
      setIsPaymentDialogOpen(false);
      setSelectedInvoice(null);
      setPaymentAmount("");
      toast({ title: "Pagamento registrado!", description: "O limite do cartão foi atualizado." });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Erro ao registrar pagamento", variant: "destructive" });
    },
  });

  const handleOpenPaymentDialog = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(Number(invoice.balance).toFixed(2));
    setIsPaymentDialogOpen(true);
  };

  const handleEditCard = (card: any) => {
    setEditingCard({
      id: card.id,
      name: card.name || "",
      last_digits: card.last_digits || "",
      brand: card.brand || "",
      credit_limit: card.credit_limit?.toString() || "",
      best_purchase_day: card.best_purchase_day?.toString() || "",
      closing_day: card.closing_day?.toString() || "",
      due_day: card.due_day?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setName("");
    setLastDigits("");
    setBrand("");
    setCreditLimit("");
    setBestPurchaseDay("");
    setClosingDay("");
    setDueDay("");
  };

  const isLoading = isLoadingCards;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold break-words">Cartões de Crédito</h1>
          <p className="text-muted-foreground">
            Gerencie seus cartões e acompanhe suas faturas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
                  <Label>Dia de fechamento *</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={31} 
                    placeholder="25"
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dia de vencimento *</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={31} 
                    placeholder="10"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    required
                  />
                </div>
              </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <p className="text-2xl font-bold text-destructive">{formatCurrencyBRL(totalCommitted)}</p>
                <p className="text-xs text-muted-foreground mt-1">Soma de faturas em aberto</p>
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
              const cardCommitted = Number(card.committed) || 0;
              const cardAvailable = Number(card.available) || 0;
              const cardUsedPercent = cardLimit > 0 ? (cardCommitted / cardLimit) * 100 : 0;
              const currentInvoice = currentInvoiceByCard[card.id];
              const overdueInvoices = overdueInvoicesByCard[card.id] || [];
              const hasOverdue = overdueInvoices.length > 0;
              const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);

              // Get all open invoices for this card to display
              const cardInvoices = invoicesByCard[card.id] || [];
              const openInvoices = cardInvoices.filter(inv => Number(inv.balance) > 0);

              return (
                <Card key={card.id} variant="elevated" className="hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg break-words max-w-[240px] sm:max-w-none">
                            {card.name}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span>{card.brand || "—"}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleEditCard(card)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
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
                    {/* Alert for cards without closing_day configured */}
                    {!card.closing_day && (
                      <Alert variant="default" className="border-primary bg-primary/10">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          Configure o dia de fechamento para habilitar o controle de faturas.
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 h-auto ml-1 text-primary"
                            onClick={() => handleEditCard(card)}
                          >
                            Configurar agora
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Overdue invoice alert */}
                    {hasOverdue && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {overdueInvoices.length === 1 
                            ? `Fatura vencida em ${format(new Date(overdueInvoices[0].due_date + 'T12:00:00'), "dd/MM", { locale: ptBR })}! Valor: ${formatCurrencyBRL(totalOverdue)}`
                            : `${overdueInvoices.length} faturas vencidas! Total: ${formatCurrencyBRL(totalOverdue)}`
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
                          <span className="text-destructive">Comprometido: {formatCurrencyBRL(cardCommitted)}</span>
                          <span className="text-success">Disponível: {formatCurrencyBRL(cardAvailable)}</span>
                        </div>
                      </div>
                    )}

                    {/* Card details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/50">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Fechamento</p>
                        <p className="font-medium">{card.closing_day ? `Dia ${card.closing_day}` : "—"}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Vencimento</p>
                        <p className="font-medium">{card.due_day ? `Dia ${card.due_day}` : "—"}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Melhor compra</p>
                        <p className="font-medium">{card.best_purchase_day ? `Dia ${card.best_purchase_day}` : "—"}</p>
                      </div>
                    </div>

                    {/* Open invoices list */}
                    {openInvoices.length > 0 && (
                      <Collapsible className="pt-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                            <span className="flex items-center gap-2 text-sm">
                              <FileText className="w-4 h-4" />
                              Faturas em aberto ({openInvoices.length})
                            </span>
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 pt-2">
                          {openInvoices.map(invoice => {
                            const isOverdue = invoice.status === 'overdue';
                            const isClosed = invoice.status === 'closed';
                            return (
                              <div
                                key={invoice.id}
                                className={`p-3 rounded-lg border ${
                                  isOverdue
                                    ? "border-destructive/50 bg-destructive/5"
                                    : isClosed
                                    ? "border-primary/50 bg-primary/5"
                                    : "border-border bg-muted/30"
                                }`}
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      Fatura {format(new Date(invoice.closing_date + "T12:00:00"), "MMM/yy", { locale: ptBR })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Vence: {format(new Date(invoice.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                                    <div className="text-right">
                                      <p className={`text-sm font-bold ${isOverdue ? "text-destructive" : ""}`}>
                                        {formatCurrencyBRL(Number(invoice.balance))}
                                      </p>
                                      <span
                                        className={`inline-flex items-center justify-center text-[11px] sm:text-xs px-2 py-0.5 rounded-full ${
                                          isOverdue
                                            ? "bg-destructive/20 text-destructive"
                                            : isClosed
                                            ? "bg-primary/20 text-primary"
                                            : "bg-muted text-muted-foreground"
                                        }`}
                                      >
                                        {isOverdue ? "Vencida" : isClosed ? "Fechada" : "Aberta"}
                                      </span>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2 flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenPaymentDialog(invoice);
                                      }}
                                    >
                                      <Banknote className="w-4 h-4 mr-1" />
                                      Pagar
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full mt-2"
                            onClick={() => navigate(`/dashboard/cartoes/${card.id}/faturas`)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Ver todas as faturas
                          </Button>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Link to invoices page */}
                    {card.closing_day && openInvoices.length === 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => navigate(`/dashboard/cartoes/${card.id}/faturas`)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Ver faturas
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Cartão</DialogTitle>
          </DialogHeader>
          {editingCard && (
            <form onSubmit={(e) => { e.preventDefault(); updateCard.mutate(); }} className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome do cartão *</Label>
                <Input 
                  placeholder="Ex: Nubank" 
                  value={editingCard.name}
                  onChange={(e) => setEditingCard({ ...editingCard, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Últimos 4 dígitos</Label>
                  <Input 
                    placeholder="0000" 
                    maxLength={4}
                    value={editingCard.last_digits}
                    onChange={(e) => setEditingCard({ ...editingCard, last_digits: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bandeira</Label>
                  <Input 
                    placeholder="Visa, Mastercard..."
                    value={editingCard.brand}
                    onChange={(e) => setEditingCard({ ...editingCard, brand: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Limite</Label>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={editingCard.credit_limit}
                  onChange={(e) => setEditingCard({ ...editingCard, credit_limit: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dia de fechamento *</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={31} 
                    placeholder="25"
                    value={editingCard.closing_day}
                    onChange={(e) => setEditingCard({ ...editingCard, closing_day: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dia de vencimento *</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={31} 
                    placeholder="10"
                    value={editingCard.due_day}
                    onChange={(e) => setEditingCard({ ...editingCard, due_day: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Melhor dia de compra</Label>
                <Input 
                  type="number" 
                  min={1} 
                  max={31} 
                  placeholder="1"
                  value={editingCard.best_purchase_day}
                  onChange={(e) => setEditingCard({ ...editingCard, best_purchase_day: e.target.value })}
                />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={updateCard.isPending}>
                {updateCard.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Alterações"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-success" />
              Registrar Pagamento
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Fatura</span>
                  <span className="font-medium">
                    {format(new Date(selectedInvoice.closing_date + 'T12:00:00'), "MMMM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Vencimento</span>
                  <span className="font-medium">
                    {format(new Date(selectedInvoice.due_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Saldo em aberto</span>
                  <span className="font-bold text-lg">{formatCurrencyBRL(Number(selectedInvoice.balance))}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Valor do pagamento</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(selectedInvoice.balance)}
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setPaymentAmount(Number(selectedInvoice.balance).toFixed(2))}
                  >
                    Pagar total
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setPaymentAmount((Number(selectedInvoice.balance) / 2).toFixed(2))}
                  >
                    Pagar 50%
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setIsPaymentDialogOpen(false);
                    setSelectedInvoice(null);
                    setPaymentAmount("");
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="hero" 
                  className="flex-1"
                  onClick={() => registerPayment.mutate()}
                  disabled={registerPayment.isPending || !paymentAmount || parseFloat(paymentAmount) <= 0}
                >
                  {registerPayment.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirmar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
