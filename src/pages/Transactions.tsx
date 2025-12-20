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
import { Plus, TrendingUp, TrendingDown, Search, Loader2, Trash2, PlusCircle, CreditCard, Pencil, DollarSign, Fuel, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useInvalidateFinancialData } from "@/hooks/useInvalidateFinancialData";
import { GlobalDateFilter } from "@/components/GlobalDateFilter";
import { DatePreset, useDateFilterPresets } from "@/hooks/useDateFilterPresets";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval } from "date-fns";
import { parseLocalDate } from "@/lib/dateUtils";
import { useMaintenance } from "@/hooks/useMaintenance";

export default function Transactions() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("receita");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // Global date filter state
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [customRange, setCustomRange] = useState<DateRange>();
  const { dateRange } = useDateFilterPresets(preset, customRange);
  
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

  // Fuel-specific fields (when category === "combustivel")
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelTotalValue, setFuelTotalValue] = useState("");
  const [fuelStation, setFuelStation] = useState("");
  const [fuelOdometerKm, setFuelOdometerKm] = useState("");
  const [fuelType, setFuelType] = useState("");

  // Edit state
  const [editingTransaction, setEditingTransaction] = useState<{
    id: string;
    type: "receita" | "despesa";
    date: string;
    amount: string;
    category?: string;
    app?: string;
    method?: string;
    notes?: string;
    // Fuel-specific fields for editing
    fuel_log_id?: string | null;
    fuelLiters?: string;
    fuelType?: string;
    fuelStation?: string;
    fuelOdometerKm?: string;
    creditCardId?: string;
  } | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const { invalidateAll } = useInvalidateFinancialData();
  const queryClient = useQueryClient();
  const { checkMaintenanceAlerts, maintenanceRecords } = useMaintenance();

  const { data: allRevenues = [], isLoading: loadingRevenues } = useQuery({
    queryKey: ["revenues", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("revenues")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: allExpenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("*, credit_cards(name), fuel_logs(liters, odometer_km, fuel_type, station)")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Define type for credit card with limits
  interface CreditCardWithLimits {
    id: string;
    user_id: string;
    name: string;
    last_digits: string | null;
    brand: string | null;
    credit_limit: number | null;
    closing_day: number | null;
    due_day: number | null;
    committed: number;
    available: number;
  }

  const { data: creditCards = [] } = useQuery<CreditCardWithLimits[]>({
    queryKey: ["credit_cards_with_limits", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("credit_cards_with_limits" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as CreditCardWithLimits[];
    },
    enabled: !!user,
  });

  // Filter by selected period
  const revenues = allRevenues.filter((r) => {
    const date = parseLocalDate(r.date);
    return isWithinInterval(date, {
      start: dateRange.from!,
      end: dateRange.to || dateRange.from!,
    });
  });

  const expenses = allExpenses.filter((e) => {
    const date = parseLocalDate(e.date);
    return isWithinInterval(date, {
      start: dateRange.from!,
      end: dateRange.to || dateRange.from!,
    });
  });

  // Calculate totals for the period
  const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netBalance = totalRevenue - totalExpense;

  // Fuel-specific KPIs (for when combustivel filter is active)
  const fuelExpenses = expenses.filter((e) => !!e.fuel_log_id && e.fuel_logs);
  const fuelKpis = (() => {
    if (fuelExpenses.length === 0) return null;
    
    const totalLiters = fuelExpenses.reduce((sum, e) => sum + Number(e.fuel_logs?.liters || 0), 0);
    const totalCost = fuelExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const avgPricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;
    
    // Calculate average consumption (km/L) from consecutive odometer readings
    const fuelWithOdometer = fuelExpenses
      .filter((e) => e.fuel_logs?.odometer_km)
      .sort((a, b) => Number(a.fuel_logs?.odometer_km) - Number(b.fuel_logs?.odometer_km));
    
    let totalKm = 0;
    let totalLitersForConsumption = 0;
    for (let i = 1; i < fuelWithOdometer.length; i++) {
      const kmDiff = Number(fuelWithOdometer[i].fuel_logs?.odometer_km) - Number(fuelWithOdometer[i - 1].fuel_logs?.odometer_km);
      if (kmDiff > 0) {
        totalKm += kmDiff;
        totalLitersForConsumption += Number(fuelWithOdometer[i].fuel_logs?.liters || 0);
      }
    }
    
    const avgConsumption = totalLitersForConsumption > 0 ? totalKm / totalLitersForConsumption : 0;
    const costPerKm = totalKm > 0 ? totalCost / totalKm : 0;
    
    return {
      totalLiters,
      totalCost,
      avgPricePerLiter,
      avgConsumption,
      costPerKm,
      fuelingsCount: fuelExpenses.length,
    };
  })();

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
      invalidateAll();
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
      
      const expensesToInsert = [];
      const [year, month, day] = expenseDate.split('-').map(Number);
      const baseDate = new Date(year, month - 1, day, 12, 0, 0);
      
      for (let i = 0; i < installments; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(installmentDate.getMonth() + i);
        
        const formattedDate = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}-${String(installmentDate.getDate()).padStart(2, '0')}`;
        
        expensesToInsert.push({
          user_id: user.id,
          date: formattedDate,
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
      invalidateAll();
      setIsDialogOpen(false);
      resetExpenseForm();
      toast({ title: "Despesa adicionada!" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar despesa", variant: "destructive" });
    },
  });

  // Mutation for fuel expense using atomic RPC
  const createFuelExpense = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const liters = parseFloat(fuelLiters);
      const totalValue = parseFloat(fuelTotalValue);
      const odometerKm = fuelOdometerKm ? parseFloat(fuelOdometerKm) : null;

      const { data, error } = await supabase.rpc('create_fuel_expense', {
        p_date: expenseDate,
        p_liters: liters,
        p_total_value: totalValue,
        p_fuel_type: fuelType,
        p_station: fuelStation || null,
        p_odometer_km: odometerKm,
        p_payment_method: expenseMethod || null,
        p_credit_card_id: expenseMethod === "credito" && expenseCreditCardId ? expenseCreditCardId : null,
        p_notes: expenseNotes || null,
      });
      if (error) throw error;
      return odometerKm;
    },
    onSuccess: (newOdometer) => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["fuel_logs"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance_records"] });
      queryClient.invalidateQueries({ queryKey: ["latest_odometer"] });
      setIsDialogOpen(false);
      resetExpenseForm();
      toast({ title: "Abastecimento registrado!" });

      // Check for maintenance alerts if odometer was provided
      if (newOdometer && maintenanceRecords.length > 0) {
        const alerts = checkMaintenanceAlerts(newOdometer);
        if (alerts.length > 0) {
          const mostUrgent = alerts[0];
          const formatKm = (km: number) => new Intl.NumberFormat("pt-BR").format(Math.abs(km));
          
          if (mostUrgent.status === "overdue") {
            toast({
              title: "⚠️ Manutenção vencida",
              description: `Você já passou da quilometragem da manutenção: ${mostUrgent.title}. Faça a revisão o quanto antes.`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "⚡ Manutenção próxima",
              description: `Você está a ${formatKm(mostUrgent.kmRemaining)} km da próxima manutenção: ${mostUrgent.title}.`,
            });
          }
        }
      }
    },
    onError: () => {
      toast({ title: "Erro ao registrar abastecimento", variant: "destructive" });
    },
  });

  // Handle expense form submission
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseCategory === "combustivel") {
      createFuelExpense.mutate();
    } else {
      createExpense.mutate();
    }
  };

  const updateRevenue = useMutation({
    mutationFn: async () => {
      if (!editingTransaction) throw new Error("Nenhuma transação selecionada");
      const { error } = await supabase
        .from("revenues")
        .update({
          date: editingTransaction.date,
          amount: parseFloat(editingTransaction.amount),
          app: editingTransaction.app,
          receive_method: editingTransaction.method || null,
          notes: editingTransaction.notes || null,
        })
        .eq("id", editingTransaction.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setIsEditDialogOpen(false);
      setEditingTransaction(null);
      toast({ title: "Receita atualizada!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar receita", variant: "destructive" });
    },
  });

  const updateExpense = useMutation({
    mutationFn: async () => {
      if (!editingTransaction) throw new Error("Nenhuma transação selecionada");
      const { error } = await supabase
        .from("expenses")
        .update({
          date: editingTransaction.date,
          amount: parseFloat(editingTransaction.amount),
          category: editingTransaction.category,
          payment_method: editingTransaction.method || null,
          notes: editingTransaction.notes || null,
        })
        .eq("id", editingTransaction.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setIsEditDialogOpen(false);
      setEditingTransaction(null);
      toast({ title: "Despesa atualizada!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar despesa", variant: "destructive" });
    },
  });

  // Mutation for updating fuel expense atomically
  const updateFuelExpense = useMutation({
    mutationFn: async () => {
      if (!editingTransaction) throw new Error("Nenhuma transação selecionada");
      const liters = parseFloat(editingTransaction.fuelLiters || "0");
      const totalValue = parseFloat(editingTransaction.amount);
      const odometerKm = editingTransaction.fuelOdometerKm ? parseFloat(editingTransaction.fuelOdometerKm) : null;

      const { error } = await supabase.rpc('update_fuel_expense', {
        p_expense_id: editingTransaction.id,
        p_date: editingTransaction.date,
        p_liters: liters,
        p_total_value: totalValue,
        p_fuel_type: editingTransaction.fuelType || "gasolina",
        p_station: editingTransaction.fuelStation || null,
        p_odometer_km: odometerKm,
        p_payment_method: editingTransaction.method || null,
        p_credit_card_id: editingTransaction.creditCardId || null,
        p_notes: editingTransaction.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["fuel_logs"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance_records"] });
      queryClient.invalidateQueries({ queryKey: ["latest_odometer"] });
      setIsEditDialogOpen(false);
      setEditingTransaction(null);
      toast({ title: "Abastecimento atualizado!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar abastecimento", variant: "destructive" });
    },
  });

  const deleteRevenue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("revenues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Receita removida!" });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async ({ id, hasFuelLog }: { id: string; hasFuelLog: boolean }) => {
      if (hasFuelLog) {
        // Use atomic RPC to delete both expense and fuel log
        const { error } = await supabase.rpc('delete_fuel_expense', { p_expense_id: id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      invalidateAll();
      if (variables.hasFuelLog) {
        queryClient.invalidateQueries({ queryKey: ["fuel_logs"] });
      }
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
    // Reset fuel-specific fields
    setFuelLiters("");
    setFuelTotalValue("");
    setFuelStation("");
    setFuelOdometerKm("");
    setFuelType("");
  };

  const handleEditClick = (transaction: any) => {
    if (transaction.transactionType === "receita") {
      setEditingTransaction({
        id: transaction.id,
        type: "receita",
        date: transaction.date,
        amount: String(transaction.amount),
        app: transaction.app,
        method: transaction.receive_method,
        notes: transaction.notes,
      });
    } else {
      // Check if this is a fuel expense
      const isFuelExpense = transaction.fuel_log_id || transaction.fuel_logs;
      const fuelLogs = transaction.fuel_logs;
      
      setEditingTransaction({
        id: transaction.id,
        type: "despesa",
        date: transaction.date,
        amount: String(transaction.amount),
        category: transaction.category,
        method: transaction.payment_method,
        notes: transaction.notes,
        fuel_log_id: transaction.fuel_log_id,
        fuelLiters: fuelLogs?.liters ? String(fuelLogs.liters) : "",
        fuelType: fuelLogs?.fuel_type || "",
        fuelOdometerKm: fuelLogs?.odometer_km ? String(fuelLogs.odometer_km) : "",
        fuelStation: fuelLogs?.station || "",
        creditCardId: transaction.credit_card_id || "",
      });
    }
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTransaction?.type === "receita") {
      updateRevenue.mutate();
    } else if (editingTransaction?.fuel_log_id) {
      updateFuelExpense.mutate();
    } else {
      updateExpense.mutate();
    }
  };

  // Combine and filter transactions
  const allTransactions = [
    ...revenues.map((r) => ({ ...r, transactionType: "receita" as const })),
    ...expenses.map((e) => ({ ...e, transactionType: "despesa" as const, app: undefined })),
  ]
    .filter((t) => {
      // Type filter
      if (typeFilter === "combustivel") {
        // Show only fuel expenses (has fuel_log_id)
        return t.transactionType === "despesa" && !!(t as any).fuel_log_id;
      }
      if (typeFilter !== "all" && t.transactionType !== typeFilter) return false;
      
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const category = t.transactionType === "receita" ? t.type : t.category;
        return category?.toLowerCase().includes(search) || t.notes?.toLowerCase().includes(search);
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isLoading = loadingRevenues || loadingExpenses;
  const hasData = allRevenues.length > 0 || allExpenses.length > 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
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
                  <form onSubmit={handleExpenseSubmit} className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data *</Label>
                        <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
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
                    </div>

                    {/* Fuel-specific fields - EXACTLY like FuelControl modal */}
                    {expenseCategory === "combustivel" ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Posto (opcional)</Label>
                            <Input 
                              placeholder="Ex: Shell" 
                              value={fuelStation} 
                              onChange={(e) => setFuelStation(e.target.value)} 
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Litros *</Label>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              value={fuelLiters} 
                              onChange={(e) => setFuelLiters(e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Valor Total *</Label>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              value={fuelTotalValue} 
                              onChange={(e) => setFuelTotalValue(e.target.value)} 
                              required 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo de combustível *</Label>
                          <Select value={fuelType} onValueChange={setFuelType} required>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gasolina">Gasolina</SelectItem>
                              <SelectItem value="etanol">Etanol</SelectItem>
                              <SelectItem value="diesel">Diesel</SelectItem>
                              <SelectItem value="gnv">GNV</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Quilometragem atual</Label>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            value={fuelOdometerKm} 
                            onChange={(e) => setFuelOdometerKm(e.target.value)} 
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Label>Valor *</Label>
                        <Input type="number" step="0.01" placeholder="0.00" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} required />
                      </div>
                    )}

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
                                  {Number(card.available) <= 0 && " (sem limite)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Limit warning */}
                        {(() => {
                          const selectedCard = creditCards.find(c => c.id === expenseCreditCardId);
                          if (!selectedCard) return null;
                          
                          const available = Number(selectedCard.available) || 0;
                          const expenseValue = expenseCategory === "combustivel" 
                            ? parseFloat(fuelTotalValue) || 0
                            : parseFloat(expenseAmount) || 0;
                          
                          if (available <= 0) {
                            return (
                              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium">Cartão sem limite disponível</p>
                                  <p className="text-xs opacity-80">
                                    Use outro cartão ou pague uma fatura para liberar limite.
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          
                          if (expenseValue > available) {
                            return (
                              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium">Limite insuficiente</p>
                                  <p className="text-xs opacity-80">
                                    Disponível: R$ {available.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          
                          return null;
                        })()}
                        
                        {/* Only show installments for non-fuel expenses */}
                        {expenseCategory !== "combustivel" && (
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
                        )}
                      </>
                    )}
                    {expenseMethod === "credito" && creditCards.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Nenhum cartão cadastrado. Cadastre um cartão na seção de Cartões de Crédito.
                      </p>
                    )}
                    <div className="space-y-2">
                      <Label>Observação (opcional)</Label>
                      <Input placeholder={expenseCategory === "combustivel" ? "Ex: Tanque cheio" : "Ex: Troca de óleo"} value={expenseNotes} onChange={(e) => setExpenseNotes(e.target.value)} />
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={createExpense.isPending || createFuelExpense.isPending}>
                      {(createExpense.isPending || createFuelExpense.isPending) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : expenseCategory === "combustivel" ? (
                        <>
                          <Fuel className="w-4 h-4 mr-2" />
                          Salvar Abastecimento
                        </>
                      ) : (
                        "Salvar Despesa"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Date Filter */}
        <GlobalDateFilter
          preset={preset}
          onPresetChange={setPreset}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
          className="flex-wrap"
        />
      </div>

      {/* Summary Cards - Show fuel KPIs when combustivel filter is active */}
      {typeFilter === "combustivel" && fuelKpis ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card variant="elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Fuel className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">Média km/L</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-foreground">
                {fuelKpis.avgConsumption > 0 ? fuelKpis.avgConsumption.toFixed(1) : "—"} km/L
              </p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">Preço/L</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-foreground">
                R$ {fuelKpis.avgPricePerLiter.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning" />
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">Custo/km</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-foreground">
                R$ {fuelKpis.costPerKm > 0 ? fuelKpis.costPerKm.toFixed(2) : "—"}
              </p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">Total Período</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-destructive">
                R$ {fuelKpis.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Card variant="elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success" />
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">Receitas</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-success">
                R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">Despesas</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-destructive">
                R$ {totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">Saldo</span>
              </div>
              <p className={`text-sm sm:text-lg font-bold ${netBalance >= 0 ? "text-success" : "text-destructive"}`}>
                R$ {netBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Editar {editingTransaction?.type === "receita" ? "Receita" : "Despesa"}
            </DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <form onSubmit={handleEditSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input 
                    type="date" 
                    value={editingTransaction.date} 
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor *</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={editingTransaction.amount} 
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: e.target.value })} 
                    required 
                  />
                </div>
              </div>
              
              {editingTransaction.type === "receita" ? (
                <>
                  <div className="space-y-2">
                    <Label>App *</Label>
                    <Select 
                      value={editingTransaction.app || ""} 
                      onValueChange={(value) => setEditingTransaction({ ...editingTransaction, app: value })}
                    >
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
                    <Select 
                      value={editingTransaction.method || ""} 
                      onValueChange={(value) => setEditingTransaction({ ...editingTransaction, method: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conta">Conta</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : editingTransaction.fuel_log_id ? (
                /* Fuel expense edit form */
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Litros *</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={editingTransaction.fuelLiters || ""} 
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, fuelLiters: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de combustível *</Label>
                      <Select 
                        value={editingTransaction.fuelType || ""} 
                        onValueChange={(value) => setEditingTransaction({ ...editingTransaction, fuelType: value })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gasolina">Gasolina</SelectItem>
                          <SelectItem value="etanol">Etanol</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="gnv">GNV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Km do odômetro</Label>
                      <Input 
                        type="number" 
                        step="1" 
                        placeholder="Ex: 45000" 
                        value={editingTransaction.fuelOdometerKm || ""} 
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, fuelOdometerKm: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Posto</Label>
                      <Input 
                        placeholder="Nome do posto" 
                        value={editingTransaction.fuelStation || ""} 
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, fuelStation: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Método de pagamento</Label>
                    <Select 
                      value={editingTransaction.method || ""} 
                      onValueChange={(value) => setEditingTransaction({ ...editingTransaction, method: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="debito">Débito</SelectItem>
                        <SelectItem value="credito">Cartão de Crédito</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editingTransaction.method === "credito" && creditCards.length > 0 && (
                    <div className="space-y-2">
                      <Label>Cartão de Crédito</Label>
                      <Select 
                        value={editingTransaction.creditCardId || ""} 
                        onValueChange={(value) => setEditingTransaction({ ...editingTransaction, creditCardId: value })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
                        <SelectContent>
                          {creditCards.map((card) => (
                            <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              ) : (
                /* Regular expense edit form */
                <>
                  <div className="space-y-2">
                    <Label>Categoria *</Label>
                    <Select 
                      value={editingTransaction.category || ""} 
                      onValueChange={(value) => setEditingTransaction({ ...editingTransaction, category: value })}
                    >
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
                    <Select 
                      value={editingTransaction.method || ""} 
                      onValueChange={(value) => setEditingTransaction({ ...editingTransaction, method: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="debito">Débito</SelectItem>
                        <SelectItem value="credito">Cartão de Crédito</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label>Observação (opcional)</Label>
                <Input 
                  placeholder="Observação" 
                  value={editingTransaction.notes || ""} 
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, notes: e.target.value })} 
                />
              </div>
              
              <Button 
                type="submit" 
                variant="hero" 
                className="w-full" 
                disabled={updateRevenue.isPending || updateExpense.isPending || updateFuelExpense.isPending}
              >
                {(updateRevenue.isPending || updateExpense.isPending || updateFuelExpense.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingTransaction.fuel_log_id ? (
                  <>
                    <Fuel className="w-4 h-4 mr-2" />
                    Salvar Abastecimento
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !hasData ? (
        <Card variant="elevated" className="p-8 sm:p-12">
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
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="receita">Receitas</SelectItem>
                    <SelectItem value="despesa">Despesas</SelectItem>
                    <SelectItem value="combustivel">Combustível</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-lg">Lançamentos do Período</CardTitle>
            </CardHeader>
            <CardContent>
              {allTransactions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhum lançamento encontrado no período selecionado
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Data</th>
                        <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Tipo</th>
                        <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">Categoria</th>
                        <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden md:table-cell">Método</th>
                        <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Valor</th>
                        <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden lg:table-cell">Obs</th>
                        <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTransactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                        >
                          <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-center">
                            {(() => {
                              const [year, month, day] = transaction.date.split('-').map(Number);
                              return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
                            })()}
                          </td>
                          <td className="py-3 px-2 sm:px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
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
                              <span className="hidden sm:inline">
                                {transaction.transactionType === "receita" ? "Receita" : "Despesa"}
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-center hidden sm:table-cell">
                            <div className="flex flex-col items-center">
                              <span className="capitalize">
                                {transaction.transactionType === "receita" 
                                  ? (transaction.app || "—") 
                                  : (transaction.category || "—")}
                              </span>
                              {/* Show fuel details if linked to fuel_logs */}
                              {transaction.transactionType === "despesa" && transaction.fuel_logs && (
                                <span className="text-xs text-primary flex items-center gap-1 mt-0.5">
                                  <Fuel className="w-3 h-3" />
                                  {Number(transaction.fuel_logs.liters).toFixed(1)}L
                                  {transaction.fuel_logs.odometer_km && (
                                    <> • {new Intl.NumberFormat("pt-BR").format(Number(transaction.fuel_logs.odometer_km))} km</>
                                  )}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-muted-foreground text-center hidden md:table-cell">
                            <div className="flex flex-col items-center">
                              <span className="capitalize">{transaction.transactionType === "receita" ? (transaction.receive_method || "—") : (transaction.payment_method || "—")}</span>
                              {transaction.transactionType === "despesa" && transaction.total_installments && transaction.total_installments > 1 && (
                                <span className="text-xs text-primary">
                                  {transaction.current_installment}/{transaction.total_installments}x
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            className={`py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-center ${
                              transaction.transactionType === "receita" ? "text-success" : "text-destructive"
                            }`}
                          >
                            {transaction.transactionType === "receita" ? "+" : "-"}R$ {Number(transaction.amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-2 sm:px-4 text-xs text-muted-foreground text-center hidden lg:table-cell max-w-[150px]">
                            <span className="truncate block" title={transaction.notes || undefined}>
                              {transaction.notes || "—"}
                            </span>
                          </td>
                          <td className="py-3 px-2 sm:px-4 text-center">
                            <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary"
                                onClick={() => handleEditClick(transaction)}
                              >
                                <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  if (transaction.transactionType === "receita") {
                                    deleteRevenue.mutate(transaction.id);
                                  } else {
                                    deleteExpense.mutate({ 
                                      id: transaction.id, 
                                      hasFuelLog: !!transaction.fuel_log_id 
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
