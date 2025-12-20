import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  DollarSign,
  ChevronDown,
  Loader2,
  Receipt,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrencyBRL } from "@/lib/format";
import { parseLocalDate } from "@/lib/dateUtils";

type InvoiceStatus = "open" | "closed" | "paid" | "overdue";

interface Invoice {
  id: string;
  credit_card_id: string;
  closing_date: string;
  period_start: string;
  period_end: string;
  due_date: string;
  total_amount: number;
  paid_total: number;
  balance: number;
  status: string;
  is_paid: boolean;
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string | null;
  category: string | null;
  type: string;
  current_installment: number | null;
  total_installments: number | null;
}

interface CreditCardData {
  id: string;
  name: string;
  last_digits: string | null;
  brand: string | null;
  credit_limit: number | null;
  closing_day: number | null;
  due_day: number | null;
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  open: { label: "Aberta", variant: "default", icon: Clock },
  closed: { label: "Fechada", variant: "secondary", icon: FileText },
  paid: { label: "Paga", variant: "outline", icon: CheckCircle2 },
  overdue: { label: "Vencida", variant: "destructive", icon: AlertTriangle },
};

export default function CardInvoices() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  // Fetch credit card
  const { data: card, isLoading: loadingCard } = useQuery({
    queryKey: ["credit_card", cardId],
    queryFn: async () => {
      if (!user || !cardId) return null;
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("id", cardId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as CreditCardData | null;
    },
    enabled: !!user && !!cardId,
  });

  // Fetch invoices for this card
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["credit_card_invoices", cardId],
    queryFn: async () => {
      if (!user || !cardId) return [];
      const { data, error } = await supabase
        .from("credit_card_invoices")
        .select("*")
        .eq("credit_card_id", cardId)
        .eq("user_id", user.id)
        .order("closing_date", { ascending: false });
      if (error) throw error;
      return (data || []) as Invoice[];
    },
    enabled: !!user && !!cardId,
  });

  // Fetch transactions for expanded invoice
  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ["cc_transactions", expandedInvoice],
    queryFn: async () => {
      if (!user || !expandedInvoice) return [];
      const { data, error } = await supabase
        .from("credit_card_transactions")
        .select("*")
        .eq("invoice_id", expandedInvoice)
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data || []) as Transaction[];
    },
    enabled: !!user && !!expandedInvoice,
  });

  // Calculate card summary
  const cardSummary = useMemo(() => {
    const limit = Number(card?.credit_limit) || 0;
    const committed = invoices
      .filter((inv) => inv.status !== "paid")
      .reduce((sum, inv) => sum + Number(inv.balance), 0);
    const available = Math.max(0, limit - committed);
    const usedPercent = limit > 0 ? (committed / limit) * 100 : 0;

    return { limit, committed, available, usedPercent };
  }, [card, invoices]);

  // Register payment mutation
  const registerPayment = useMutation({
    mutationFn: async ({ invoiceId, amount }: { invoiceId: string; amount: number }) => {
      if (!user || !cardId) throw new Error("Não autenticado");
      
      // Insert payment transaction
      const { error } = await supabase.from("credit_card_transactions").insert({
        user_id: user.id,
        credit_card_id: cardId,
        invoice_id: invoiceId,
        date: format(new Date(), "yyyy-MM-dd"),
        amount: amount,
        description: "Pagamento de fatura",
        type: "payment",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_card_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["cc_transactions"] });
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setSelectedInvoice(null);
      toast({ title: "Pagamento registrado!" });
    },
    onError: () => {
      toast({ title: "Erro ao registrar pagamento", variant: "destructive" });
    },
  });
  const handleOpenPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balance.toFixed(2));
    setPaymentDialogOpen(true);
  };

  const handleRegisterPayment = () => {
    if (!selectedInvoice || !paymentAmount) return;
    registerPayment.mutate({
      invoiceId: selectedInvoice.id,
      amount: parseFloat(paymentAmount),
    });
  };

  const formatInvoiceMonth = (closingDate: string) => {
    const date = parseLocalDate(closingDate);
    return format(date, "MMMM yyyy", { locale: ptBR });
  };

  const formatDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    return format(date, "dd/MM", { locale: ptBR });
  };

  if (loadingCard || loadingInvoices) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="p-6">
        <Card variant="elevated" className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Cartão não encontrado</h3>
              <p className="text-muted-foreground">
                O cartão solicitado não existe ou você não tem permissão para acessá-lo.
              </p>
            </div>
            <Button variant="hero" onClick={() => navigate("/dashboard/cartoes")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Cartões
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/cartoes")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              {card.name}
            </h1>
            <p className="text-muted-foreground">
              {card.last_digits ? `•••• ${card.last_digits}` : ""} {card.brand || ""}
            </p>
          </div>
        </div>
      </div>

      {/* Card Summary */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Limite</span>
            </div>
            <p className="text-xl font-bold">{formatCurrencyBRL(cardSummary.limit)}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Comprometido</span>
            </div>
            <p className="text-xl font-bold text-destructive">{formatCurrencyBRL(cardSummary.committed)}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Disponível</span>
            </div>
            <p className="text-xl font-bold text-success">{formatCurrencyBRL(cardSummary.available)}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Ciclo</span>
            </div>
            <p className="text-sm font-medium">
              Fecha dia {card.closing_day || "—"} / Vence dia {card.due_day || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {cardSummary.limit > 0 && (
        <div className="space-y-2">
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                cardSummary.usedPercent > 80
                  ? "bg-destructive"
                  : cardSummary.usedPercent > 50
                  ? "bg-primary"
                  : "bg-success"
              }`}
              style={{ width: `${Math.min(cardSummary.usedPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {cardSummary.usedPercent.toFixed(0)}% do limite utilizado
          </p>
        </div>
      )}

      {/* Invoices List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Faturas
        </h2>

        {invoices.length === 0 ? (
          <Card variant="elevated" className="p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <Receipt className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma fatura encontrada para este cartão.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => {
              const status = (invoice.status as InvoiceStatus) || "open";
              const config = statusConfig[status] || statusConfig.open;
              const StatusIcon = config.icon;
              const isExpanded = expandedInvoice === invoice.id;

              return (
                <Card key={invoice.id} variant="elevated" className="overflow-hidden">
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={(open) => setExpandedInvoice(open ? invoice.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold capitalize">
                                {formatInvoiceMonth(invoice.closing_date)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Fecha {formatDate(invoice.closing_date)} • Vence{" "}
                                {formatDate(invoice.due_date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-lg">
                                {formatCurrencyBRL(invoice.total_amount)}
                              </p>
                              {invoice.paid_total > 0 && (
                                <p className="text-xs text-success">
                                  Pago: {formatCurrencyBRL(invoice.paid_total)}
                                </p>
                              )}
                              {invoice.balance > 0 && invoice.balance !== invoice.total_amount && (
                                <p className="text-xs text-destructive">
                                  Saldo: {formatCurrencyBRL(invoice.balance)}
                                </p>
                              )}
                            </div>
                            <Badge variant={config.variant} className="flex items-center gap-1">
                              <StatusIcon className="w-3 h-3" />
                              {config.label}
                            </Badge>
                            <ChevronDown
                              className={`w-5 h-5 text-muted-foreground transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border px-4 py-4 bg-muted/30">
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground mb-2">
                            Período: {formatDate(invoice.period_start)} a{" "}
                            {formatDate(invoice.period_end)}
                          </p>
                        </div>

                        {/* Transactions */}
                        {loadingTransactions && isExpanded ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          </div>
                        ) : transactions.length > 0 ? (
                          <div className="space-y-2 mb-4">
                            {transactions.map((tx) => (
                              <div
                                key={tx.id}
                                className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                                  tx.type === "payment"
                                    ? "bg-success/10"
                                    : tx.type === "refund"
                                    ? "bg-primary/10"
                                    : "bg-secondary/50"
                                }`}
                              >
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="font-medium truncate">
                                    {tx.description || tx.category || tx.type}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{formatDate(tx.date)}</span>
                                    {tx.total_installments && tx.total_installments > 1 && (
                                      <span className="text-primary">
                                        {tx.current_installment}/{tx.total_installments}x
                                      </span>
                                    )}
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      {tx.type === "purchase"
                                        ? "Compra"
                                        : tx.type === "payment"
                                        ? "Pagamento"
                                        : tx.type === "refund"
                                        ? "Estorno"
                                        : tx.type === "fee"
                                        ? "Taxa"
                                        : tx.type}
                                    </Badge>
                                  </div>
                                </div>
                                <span
                                  className={`font-medium ${
                                    tx.type === "payment"
                                      ? "text-success"
                                      : tx.type === "refund"
                                      ? "text-primary"
                                      : "text-destructive"
                                  }`}
                                >
                                  {tx.type === "payment" || tx.type === "refund" ? "-" : ""}
                                  {formatCurrencyBRL(Math.abs(tx.amount))}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhuma transação nesta fatura
                          </p>
                        )}

                        {/* Payment action */}
                        {invoice.balance > 0 && (
                          <Button
                            variant="hero"
                            size="sm"
                            className="w-full"
                            onClick={() => handleOpenPaymentDialog(invoice)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Registrar Pagamento
                          </Button>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Fatura de</p>
                <p className="font-semibold capitalize">
                  {formatInvoiceMonth(selectedInvoice.closing_date)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Saldo devedor: {formatCurrencyBRL(selectedInvoice.balance)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Valor do pagamento</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedInvoice.balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="hero"
              onClick={handleRegisterPayment}
              disabled={registerPayment.isPending || !paymentAmount}
            >
              {registerPayment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirmar Pagamento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
