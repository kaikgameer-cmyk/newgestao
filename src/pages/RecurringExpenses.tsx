import { useState, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Calendar, Car, CalendarDays, Repeat } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRecurringExpenses, RecurringExpense, calculateAllExpensesDailyCost, getDistributedDailyValue } from "@/hooks/useRecurringExpenses";
import { format } from "date-fns";
import { formatCurrencyBRL } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

// Generate day options for monthly recurrence (outside component to avoid recreation)
const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

// Memoized form component to prevent re-renders that cause keyboard to close
interface ExpenseFormProps {
  isEdit: boolean;
  name: string;
  amount: string;
  startDate: string;
  endDate: string;
  recurrenceType: "monthly_fixed_day" | "distributed";
  recurrenceDay: string;
  onNameChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRecurrenceTypeChange: (value: "monthly_fixed_day" | "distributed") => void;
  onRecurrenceDayChange: (value: string) => void;
  onSubmit: () => void;
}

const ExpenseForm = memo(function ExpenseForm({
  isEdit,
  name,
  amount,
  startDate,
  endDate,
  recurrenceType,
  recurrenceDay,
  onNameChange,
  onAmountChange,
  onStartDateChange,
  onEndDateChange,
  onRecurrenceTypeChange,
  onRecurrenceDayChange,
  onSubmit,
}: ExpenseFormProps) {
  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-name" : "name"}>Nome da Despesa</Label>
        <Input
          id={isEdit ? "edit-name" : "name"}
          placeholder="Ex: Parcela do Carro, MEI, Aluguel"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-amount" : "amount"}>
          {recurrenceType === "distributed" ? "Valor Total (R$)" : "Valor (R$)"}
        </Label>
        <Input
          id={isEdit ? "edit-amount" : "amount"}
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="0,00"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="space-y-3">
        <Label>Tipo de Recorrência</Label>
        <RadioGroup 
          value={recurrenceType} 
          onValueChange={onRecurrenceTypeChange}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <div className="relative">
            <RadioGroupItem value="monthly_fixed_day" id={isEdit ? "edit-monthly" : "monthly"} className="peer sr-only" />
            <Label 
              htmlFor={isEdit ? "edit-monthly" : "monthly"} 
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-muted cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
            >
              <Repeat className="w-5 h-5" />
              <span className="text-sm font-medium">Mensal - Dia Fixo</span>
              <span className="text-xs text-muted-foreground text-center">Valor total em um único dia do mês</span>
            </Label>
          </div>
          <div className="relative">
            <RadioGroupItem value="distributed" id={isEdit ? "edit-distributed" : "distributed"} className="peer sr-only" />
            <Label 
              htmlFor={isEdit ? "edit-distributed" : "distributed"} 
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-muted cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
            >
              <CalendarDays className="w-5 h-5" />
              <span className="text-sm font-medium">Distribuída</span>
              <span className="text-xs text-muted-foreground text-center">Rateada entre dias do período</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {recurrenceType === "monthly_fixed_day" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={isEdit ? "edit-recurrenceDay" : "recurrenceDay"}>Dia do Mês</Label>
            <Select value={recurrenceDay} onValueChange={onRecurrenceDayChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent>
                {dayOptions.map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    Dia {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O dia do mês em que a despesa é cobrada (ex: MEI dia 20)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={isEdit ? "edit-startDate" : "startDate"}>Data de Início</Label>
              <Input
                id={isEdit ? "edit-startDate" : "startDate"}
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={isEdit ? "edit-endDate" : "endDate"}>Término (opcional)</Label>
              <Input
                id={isEdit ? "edit-endDate" : "endDate"}
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O valor total será lançado no dia escolhido de cada mês (sem divisão)
          </p>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={isEdit ? "edit-startDate" : "startDate"}>Data Inicial</Label>
              <Input
                id={isEdit ? "edit-startDate" : "startDate"}
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={isEdit ? "edit-endDate" : "endDate"}>Data Final</Label>
              <Input
                id={isEdit ? "edit-endDate" : "endDate"}
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O valor será dividido proporcionalmente entre os dias do período selecionado
          </p>
        </>
      )}

      <Button onClick={onSubmit} className="w-full" variant="hero">
        {isEdit ? "Salvar Alterações" : "Adicionar"}
      </Button>
    </div>
  );
});

export default function RecurringExpenses() {
  const { user } = useAuth();
  const {
    recurringExpenses,
    isLoading,
    createRecurring,
    updateRecurring,
    deleteRecurring,
  } = useRecurringExpenses(user?.id);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<"monthly_fixed_day" | "distributed">("monthly_fixed_day");
  const [recurrenceDay, setRecurrenceDay] = useState<string>("");

  const resetForm = useCallback(() => {
    setName("");
    setAmount("");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate("");
    setRecurrenceType("monthly_fixed_day");
    setRecurrenceDay("");
  }, []);

  const handleCreate = useCallback(() => {
    if (!name || !amount || !startDate) return;
    
    createRecurring({
      name,
      amount: parseFloat(amount),
      start_date: startDate,
      end_date: endDate || null,
      recurrence_type: recurrenceType,
      recurrence_day: recurrenceType === "monthly_fixed_day" && recurrenceDay ? parseInt(recurrenceDay) : null,
    });
    resetForm();
    setIsAddOpen(false);
  }, [name, amount, startDate, endDate, recurrenceType, recurrenceDay, createRecurring, resetForm]);

  const handleEdit = useCallback((expense: RecurringExpense) => {
    setEditingExpense(expense);
    setName(expense.name);
    setAmount(expense.amount.toString());
    setStartDate(expense.start_date);
    setEndDate(expense.end_date || "");
    setRecurrenceType(expense.recurrence_type);
    setRecurrenceDay(expense.recurrence_day?.toString() || "");
    setIsEditOpen(true);
  }, []);

  const handleUpdate = useCallback(() => {
    if (!editingExpense || !name || !amount || !startDate) return;
    updateRecurring({
      id: editingExpense.id,
      name,
      amount: parseFloat(amount),
      start_date: startDate,
      end_date: endDate || null,
      recurrence_type: recurrenceType,
      recurrence_day: recurrenceType === "monthly_fixed_day" && recurrenceDay ? parseInt(recurrenceDay) : null,
    });
    resetForm();
    setEditingExpense(null);
    setIsEditOpen(false);
  }, [editingExpense, name, amount, startDate, endDate, recurrenceType, recurrenceDay, updateRecurring, resetForm]);

  const handleToggleActive = useCallback((expense: RecurringExpense) => {
    updateRecurring({
      id: expense.id,
      is_active: !expense.is_active,
    });
  }, [updateRecurring]);

  const handleDelete = useCallback((id: string) => {
    deleteRecurring(id);
  }, [deleteRecurring]);

  // Callbacks for form inputs (memoized to prevent re-renders)
  const handleNameChange = useCallback((value: string) => setName(value), []);
  const handleAmountChange = useCallback((value: string) => setAmount(value), []);
  const handleStartDateChange = useCallback((value: string) => setStartDate(value), []);
  const handleEndDateChange = useCallback((value: string) => setEndDate(value), []);
  const handleRecurrenceTypeChange = useCallback((value: "monthly_fixed_day" | "distributed") => setRecurrenceType(value), []);
  const handleRecurrenceDayChange = useCallback((value: string) => setRecurrenceDay(value), []);

  // Calculate combined daily cost for all active recurring expenses
  const allExpensesDailyCost = calculateAllExpensesDailyCost(recurringExpenses);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Despesas Fixas</h1>
          <p className="text-muted-foreground">
            Gerencie parcelas de carro, aluguel, MEI e outras despesas
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Nova Despesa Fixa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Adicionar Despesa Fixa</DialogTitle>
            </DialogHeader>
            <ExpenseForm
              isEdit={false}
              name={name}
              amount={amount}
              startDate={startDate}
              endDate={endDate}
              recurrenceType={recurrenceType}
              recurrenceDay={recurrenceDay}
              onNameChange={handleNameChange}
              onAmountChange={handleAmountChange}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
              onRecurrenceTypeChange={handleRecurrenceTypeChange}
              onRecurrenceDayChange={handleRecurrenceDayChange}
              onSubmit={handleCreate}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card - Shows combined daily cost for all expenses */}
      <Card variant="elevated" className="bg-gradient-card border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Custo diário das despesas fixas</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrencyBRL(allExpensesDailyCost.total)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Soma das despesas mensais (÷30) + despesas rateadas (÷dias)
              </p>
            </div>
          </div>
          {allExpensesDailyCost.breakdown.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-2">Detalhamento:</p>
              <div className="space-y-1">
                {allExpensesDailyCost.breakdown.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{item.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {item.type === "monthly" ? "Mensal" : "Rateada"}
                      </Badge>
                    </div>
                    <span className="font-medium">
                      {formatCurrencyBRL(item.dailyAmount)}/dia
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Suas Despesas Fixas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : recurringExpenses.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Nenhuma despesa fixa cadastrada ainda.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione parcelas de carro, MEI, aluguel ou outras despesas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="hidden sm:table-cell">Dia/Período</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringExpenses.map((expense) => {
                    const distributedDailyValue = getDistributedDailyValue(expense);
                    return (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.name}</TableCell>
                        <TableCell>
                          <Badge variant={expense.recurrence_type === "distributed" ? "secondary" : "default"}>
                            {expense.recurrence_type === "distributed" ? (
                              <>
                                <CalendarDays className="w-3 h-3 mr-1" />
                                Rateada
                              </>
                            ) : (
                              <>
                                <Repeat className="w-3 h-3 mr-1" />
                                Mensal
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            {formatCurrencyBRL(expense.amount)}
                            {/* Only show daily value for distributed expenses - not for monthly fixed day */}
                            {distributedDailyValue !== null && (
                              <span className="block text-xs text-muted-foreground">
                                ≈ {formatCurrencyBRL(distributedDailyValue)}/dia
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {expense.recurrence_type === "distributed" 
                            ? `${format(new Date(expense.start_date + "T12:00:00"), "dd/MM")} - ${expense.end_date ? format(new Date(expense.end_date + "T12:00:00"), "dd/MM") : "—"}`
                            : expense.recurrence_day 
                              ? `Dia ${expense.recurrence_day}` 
                              : "—"
                          }
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={expense.is_active}
                            onCheckedChange={() => handleToggleActive(expense)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(expense)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          resetForm();
          setEditingExpense(null);
        }
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Editar Despesa Fixa</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            isEdit={true}
            name={name}
            amount={amount}
            startDate={startDate}
            endDate={endDate}
            recurrenceType={recurrenceType}
            recurrenceDay={recurrenceDay}
            onNameChange={handleNameChange}
            onAmountChange={handleAmountChange}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onRecurrenceTypeChange={handleRecurrenceTypeChange}
            onRecurrenceDayChange={handleRecurrenceDayChange}
            onSubmit={handleUpdate}
          />
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Repeat className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">Mensal - Dia Fixo</h4>
                <p className="text-sm text-muted-foreground">
                  Ideal para despesas que vencem em um dia específico do mês, como MEI (dia 20), parcela do carro (dia 10), etc. 
                  O valor total é lançado apenas naquele dia, sem divisão.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">Distribuída (Rateada)</h4>
                <p className="text-sm text-muted-foreground">
                  Para despesas que devem ser distribuídas entre um período, como aluguel de carro por semana. 
                  O valor total é dividido proporcionalmente pelos dias do intervalo.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
