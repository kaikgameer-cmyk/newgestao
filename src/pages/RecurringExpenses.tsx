import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Calendar, Car } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRecurringExpenses, calculateDailyRecurringAmount } from "@/hooks/useRecurringExpenses";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");

  const resetForm = () => {
    setName("");
    setAmount("");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate("");
  };

  const handleCreate = () => {
    if (!name || !amount || !startDate) return;
    createRecurring({
      name,
      amount: parseFloat(amount),
      start_date: startDate,
      end_date: endDate || null,
    });
    resetForm();
    setIsAddOpen(false);
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setName(expense.name);
    setAmount(expense.amount.toString());
    setStartDate(expense.start_date);
    setEndDate(expense.end_date || "");
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingExpense || !name || !amount || !startDate) return;
    updateRecurring({
      id: editingExpense.id,
      name,
      amount: parseFloat(amount),
      start_date: startDate,
      end_date: endDate || null,
    });
    resetForm();
    setEditingExpense(null);
    setIsEditOpen(false);
  };

  const handleToggleActive = (expense: any) => {
    updateRecurring({
      id: expense.id,
      is_active: !expense.is_active,
    });
  };

  const handleDelete = (id: string) => {
    deleteRecurring(id);
  };

  // Calculate today's recurring expenses
  const todayRecurring = calculateDailyRecurringAmount(recurringExpenses, new Date());

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Despesas Fixas</h1>
          <p className="text-muted-foreground">
            Gerencie parcelas de carro, aluguel e outras despesas fixas mensais
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Nova Despesa Fixa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Despesa Fixa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Despesa</Label>
                <Input
                  id="name"
                  placeholder="Ex: Parcela do Carro, Aluguel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Valor Mensal (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Data de Início</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data de Término (opcional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para despesa sem término definido
                </p>
              </div>
              <Button onClick={handleCreate} className="w-full" variant="hero">
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card variant="elevated" className="bg-gradient-card border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Custo diário das despesas fixas</p>
              <p className="text-3xl font-bold text-primary">
                R$ {todayRecurring.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Calculado dividindo o valor mensal por 30 dias
              </p>
            </div>
          </div>
          {todayRecurring.breakdown.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-2">Detalhamento:</p>
              <div className="space-y-1">
                {todayRecurring.breakdown.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="font-medium">
                      R$ {item.dailyAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/dia
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
                Adicione parcelas de carro, aluguel ou outras despesas mensais.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Valor Mensal</TableHead>
                  <TableHead>Valor/Dia</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.name}</TableCell>
                    <TableCell>
                      R$ {expense.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-primary">
                      R$ {(expense.amount / 30).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(expense.start_date + "T12:00:00"), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {expense.end_date
                        ? format(new Date(expense.end_date + "T12:00:00"), "dd/MM/yyyy")
                        : "—"}
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Despesa Fixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome da Despesa</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Valor Mensal (R$)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-startDate">Data de Início</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endDate">Data de Término (opcional)</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleUpdate} className="w-full" variant="hero">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
