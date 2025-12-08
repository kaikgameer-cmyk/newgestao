import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, TrendingDown, Search, Loader2, Trash2, PlusCircle, CreditCard } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Transactions() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("receita");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // Revenue form
  const [revenueDate, setRevenueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [revenueAmount, setRevenueAmount] = useState("");
  const [revenueApp, setRevenueApp] = useState("");
  const [revenueMethod, setRevenueMethod] = useState("");
  const [revenueNotes, setRevenueNotes] = useState("");
  
  // Expense form
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseMethod, setExpenseMethod] = useState("");
  const [expenseCreditCardId, setExpenseCreditCardId] = useState("");
  const [expenseInstallments, setExpenseInstallments] = useState("1");
  const [expenseNotes, setExpenseNotes] = useState("");

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: revenues = [], isLoading: loadingRevenues } = useQuery({
    queryKey: ["revenues", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("revenues")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("*, credit_cards(name)")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ["credit_cards", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createRevenue = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("revenues").insert({
        user_id: user.id,
        date: revenueDate,
        amount: parseFloat(revenueAmount),
        app: revenueApp,
        type: "total_diario",
        receive_method: revenueMethod || null,
        notes: revenueNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      setIsDialogOpen(false);
      resetRevenueForm();
      toast({ title: "Receita adicionada!" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar receita", variant: "destructive" });
    },
  });

  const createExpense = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const installments = expenseMethod === "credito" ? parseInt(expenseInstallments) : 1;
      const totalAmount = parseFloat(expenseAmount);
      const installmentAmount = totalAmount / installments;
      
      // Create an expense entry for each installment
      const expensesToInsert = [];
      const baseDate = new Date(expenseDate);
      
      for (let i = 0; i < installments; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(installmentDate.getMonth() + i);
        
        expensesToInsert.push({
          user_id: user.id,
          date: format(installmentDate, "yyyy-MM-dd"),
          amount: installmentAmount,
          category: expenseCategory,
          payment_method: expenseMethod || null,
          credit_card_id: expenseMethod === "credito" && expenseCreditCardId ? expenseCreditCardId : null,
          installments: installments,
          current_installment: i + 1,
          total_installments: installments,
          notes: expenseNotes ? `${expenseNotes}${installments > 1 ? ` (${i + 1}/${installments})` : ''}` : (installments > 1 ? `Parcela ${i + 1}/${installments}` : null),
        });
      }
      
      const { error } = await supabase.from("expenses").insert(expensesToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setIsDialogOpen(false);
      resetExpenseForm();
      toast({ title: "Despesa adicionada!" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar despesa", variant: "destructive" });
    },
  });

  const deleteRevenue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("revenues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      toast({ title: "Receita removida!" });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Despesa removida!" });
    },
  });

  const resetRevenueForm = () => {
    setRevenueDate(format(new Date(), "yyyy-MM-dd"));
    setRevenueAmount("");
    setRevenueApp("");
    setRevenueMethod("");
    setRevenueNotes("");
  };

  const resetExpenseForm = () => {
    setExpenseDate(format(new Date(), "yyyy-MM-dd"));
    setExpenseAmount("");
    setExpenseCategory("");
    setExpenseMethod("");
    setExpenseCreditCardId("");
    setExpenseInstallments("1");
    setExpenseNotes("");
  };

  // Combine and filter transactions
  const allTransactions = [
    ...revenues.map((r) => ({ ...r, transactionType: "receita" as const })),
    ...expenses.map((e) => ({ ...e, transactionType: "despesa" as const, app: undefined })),
  ]
    .filter((t) => {
      if (typeFilter !== "all" && t.transactionType !== typeFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const category = t.transactionType === "receita" ? t.type : t.category;
        return category?.toLowerCase().includes(search) || t.notes?.toLowerCase().includes(search);
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isLoading = loadingRevenues || loadingExpenses;
  const hasData = revenues.length > 0 || expenses.length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lançamentos</h1>
          <p className="text-muted-foreground">
            Gerencie suas receitas e despesas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="lg">
              <Plus className="w-5 h-5" />
              Novo Lançamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Novo Lançamento</DialogTitle>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="receita" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Receita
                </TabsTrigger>
                <TabsTrigger value="despesa" className="gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Despesa
                </TabsTrigger>
              </TabsList>
              <TabsContent value="receita" className="space-y-4 mt-4">
                <form onSubmit={(e) => { e.preventDefault(); createRevenue.mutate(); }} className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data *</Label>
                      <Input type="date" value={revenueDate} onChange={(e) => setRevenueDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor total do dia *</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={revenueAmount} onChange={(e) => setRevenueAmount(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>App *</Label>
                    <Select value={revenueApp} onValueChange={setRevenueApp} required>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uber">Uber</SelectItem>
                        <SelectItem value="99">99</SelectItem>
                        <SelectItem value="indrive">InDrive</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Método de recebimento</Label>
                    <Select value={revenueMethod} onValueChange={setRevenueMethod}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conta">Conta</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Observação (opcional)</Label>
                    <Input placeholder="Ex: Dia cheio, muitas corridas longas" value={revenueNotes} onChange={(e) => setRevenueNotes(e.target.value)} />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={createRevenue.isPending}>
                    {createRevenue.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Receita"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="despesa" className="space-y-4 mt-4">
                <form onSubmit={(e) => { e.preventDefault(); createExpense.mutate(); }} className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data *</Label>
                      <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor *</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria *</Label>
                    <Select value={expenseCategory} onValueChange={setExpenseCategory} required>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="combustivel">Combustível</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="lavagem">Lavagem</SelectItem>
                        <SelectItem value="pedagio">Pedágio</SelectItem>
                        <SelectItem value="estacionamento">Estacionamento</SelectItem>
                        <SelectItem value="alimentacao">Alimentação</SelectItem>
                        <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Método de pagamento</Label>
                    <Select value={expenseMethod} onValueChange={(value) => {
                      setExpenseMethod(value);
                      if (value !== "credito") setExpenseCreditCardId("");
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="debito">Débito</SelectItem>
                        <SelectItem value="credito">Cartão de Crédito</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {expenseMethod === "credito" && creditCards.length > 0 && (
                    <>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Selecione o cartão
                        </Label>
                        <Select value={expenseCreditCardId} onValueChange={setExpenseCreditCardId}>
                          <SelectTrigger><SelectValue placeholder="Escolha um cartão cadastrado" /></SelectTrigger>
                          <SelectContent>
                            {creditCards.map((card) => (
                              <SelectItem key={card.id} value={card.id}>
                                {card.name} {card.last_digits ? `(•••• ${card.last_digits})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Parcelamento</Label>
                        <Select value={expenseInstallments} onValueChange={setExpenseInstallments}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">À vista (1x)</SelectItem>
                            <SelectItem value="2">2x</SelectItem>
                            <SelectItem value="3">3x</SelectItem>
                            <SelectItem value="4">4x</SelectItem>
                            <SelectItem value="5">5x</SelectItem>
                            <SelectItem value="6">6x</SelectItem>
                            <SelectItem value="7">7x</SelectItem>
                            <SelectItem value="8">8x</SelectItem>
                            <SelectItem value="9">9x</SelectItem>
                            <SelectItem value="10">10x</SelectItem>
                            <SelectItem value="11">11x</SelectItem>
                            <SelectItem value="12">12x</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  {expenseMethod === "credito" && creditCards.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum cartão cadastrado. Cadastre um cartão na seção de Cartões de Crédito.
                    </p>
                  )}
                  <div className="space-y-2">
                    <Label>Observação (opcional)</Label>
                    <Input placeholder="Ex: Troca de óleo" value={expenseNotes} onChange={(e) => setExpenseNotes(e.target.value)} />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={createExpense.isPending}>
                    {createExpense.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Despesa"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !hasData ? (
        <Card variant="elevated" className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <PlusCircle className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Nenhum lançamento ainda</h3>
              <p className="text-muted-foreground max-w-md">
                Comece adicionando suas receitas e despesas para acompanhar seus resultados.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar lançamentos..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="receita">Receitas</SelectItem>
                    <SelectItem value="despesa">Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-lg">Lançamentos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Categoria</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Método</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm">
                          {new Date(transaction.date).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                              transaction.transactionType === "receita"
                                ? "bg-success/20 text-success"
                                : "bg-destructive/20 text-destructive"
                            }`}
                          >
                            {transaction.transactionType === "receita" ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {transaction.transactionType === "receita" ? "Receita" : "Despesa"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {transaction.transactionType === "receita" ? transaction.type : transaction.category}
                          {transaction.app && (
                            <span className="text-muted-foreground ml-1">({transaction.app})</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          <div className="flex flex-col">
                            <span>{transaction.transactionType === "receita" ? transaction.receive_method : transaction.payment_method}</span>
                            {transaction.transactionType === "despesa" && transaction.total_installments && transaction.total_installments > 1 && (
                              <span className="text-xs text-primary">
                                {transaction.current_installment}/{transaction.total_installments}x
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className={`py-3 px-4 text-sm font-medium text-right ${
                            transaction.transactionType === "receita" ? "text-success" : "text-destructive"
                          }`}
                        >
                          {transaction.transactionType === "receita" ? "+" : "-"}R$ {Number(transaction.amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (transaction.transactionType === "receita") {
                                deleteRevenue.mutate(transaction.id);
                              } else {
                                deleteExpense.mutate(transaction.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
