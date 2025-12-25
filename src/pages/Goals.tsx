import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Target, Plus, Pencil, Trash2, Loader2, Calendar } from "lucide-react";
import { useDailyGoals } from "@/hooks/useDailyGoals";
import { format, parseISO, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatLocalDate, parseLocalDate } from "@/lib/dateUtils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export default function Goals() {
  const { goals, isLoading, upsertGoal, deleteGoal } = useDailyGoals();
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  
  // Form states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [goalValue, setGoalValue] = useState("");
  const [editingGoal, setEditingGoal] = useState<{ date: string; value: number } | null>(null);
  
  // Bulk add states
  const [bulkDateRange, setBulkDateRange] = useState<DateRange>();
  const [bulkGoalValue, setBulkGoalValue] = useState("");
  const [bulkDatePickerOpen, setBulkDatePickerOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleAddGoal = () => {
    const value = parseFloat(goalValue.replace(",", "."));
    if (isNaN(value) || value < 0) return;
    
    upsertGoal.mutate({ date: selectedDate, dailyGoal: value }, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setGoalValue("");
        setSelectedDate(new Date());
      },
    });
  };

  const handleEditGoal = () => {
    if (!editingGoal) return;
    const value = parseFloat(goalValue.replace(",", "."));
    if (isNaN(value) || value < 0) return;
    
    const date = parseLocalDate(editingGoal.date);
    upsertGoal.mutate({ date, dailyGoal: value }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setEditingGoal(null);
        setGoalValue("");
      },
    });
  };

  const handleDeleteGoal = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    deleteGoal.mutate(date);
  };

  const openEditDialog = (goal: { date: string; daily_goal: number }) => {
    setEditingGoal({ date: goal.date, value: goal.daily_goal });
    setGoalValue(goal.daily_goal.toString());
    setIsEditDialogOpen(true);
  };

  const handleBulkAdd = () => {
    if (!bulkDateRange?.from || !bulkDateRange?.to) return;
    const value = parseFloat(bulkGoalValue.replace(",", "."));
    if (isNaN(value) || value < 0) return;

    const days = eachDayOfInterval({ start: bulkDateRange.from, end: bulkDateRange.to });
    
    // Add goals for each day sequentially
    const addGoalsSequentially = async () => {
      for (const day of days) {
        await upsertGoal.mutateAsync({ date: day, dailyGoal: value });
      }
      setIsBulkDialogOpen(false);
      setBulkGoalValue("");
      setBulkDateRange(undefined);
    };
    
    addGoalsSequentially();
  };

  // Sort goals by date (most recent first)
  const sortedGoals = [...goals].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold break-words">Metas Diárias</h1>
          <p className="text-muted-foreground">
            Defina suas metas de faturamento por dia
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Bulk Add Dialog */}
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <Calendar className="w-4 h-4" />
                Adicionar em Lote
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Adicionar Metas em Lote
                </DialogTitle>
                <DialogDescription>
                  Defina a mesma meta para vários dias de uma vez
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Popover open={bulkDatePickerOpen} onOpenChange={setBulkDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !bulkDateRange?.from && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {bulkDateRange?.from ? (
                          bulkDateRange.to ? (
                            <>
                              {format(bulkDateRange.from, "dd/MM/yyyy")} -{" "}
                              {format(bulkDateRange.to, "dd/MM/yyyy")}
                            </>
                          ) : (
                            format(bulkDateRange.from, "dd/MM/yyyy")
                          )
                        ) : (
                          "Selecione o período"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="range"
                        selected={bulkDateRange}
                        onSelect={(range) => {
                          setBulkDateRange(range);
                          if (range?.from && range?.to) {
                            setBulkDatePickerOpen(false);
                          }
                        }}
                        numberOfMonths={2}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulk-goal">Valor da meta (R$)</Label>
                  <Input
                    id="bulk-goal"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 250.00"
                    value={bulkGoalValue}
                    onChange={(e) => setBulkGoalValue(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleBulkAdd}
                  disabled={!bulkDateRange?.from || !bulkDateRange?.to || !bulkGoalValue || upsertGoal.isPending}
                >
                  {upsertGoal.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Adicionar Metas
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Single Goal Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2 w-full sm:w-auto">
                <Plus className="w-5 h-5" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Nova Meta Diária
                </DialogTitle>
                <DialogDescription>
                  Defina sua meta de faturamento para um dia específico
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-value">Valor da meta (R$)</Label>
                  <Input
                    id="goal-value"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 250.00"
                    value={goalValue}
                    onChange={(e) => setGoalValue(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddGoal}
                  disabled={!goalValue || upsertGoal.isPending}
                >
                  {upsertGoal.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Salvar Meta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Meta
            </DialogTitle>
            <DialogDescription>
              {editingGoal && (
                <>
                  Editando meta do dia{" "}
                  {format(parseLocalDate(editingGoal.date), "dd 'de' MMMM", { locale: ptBR })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-goal-value">Valor da meta (R$)</Label>
              <Input
                id="edit-goal-value"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 250.00"
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleEditGoal}
              disabled={!goalValue || upsertGoal.isPending}
            >
              {upsertGoal.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goals List */}
      {sortedGoals.length === 0 ? (
        <Card variant="elevated" className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Nenhuma meta definida</h3>
              <p className="text-muted-foreground max-w-md">
                Comece definindo suas metas diárias de faturamento para acompanhar seu progresso no Dashboard.
              </p>
            </div>
            <Button variant="hero" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Definir Primeira Meta
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Metas Cadastradas ({sortedGoals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {sortedGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-muted-foreground">Data</span>
                      <span className="text-sm font-medium break-words">
                        {format(parseLocalDate(goal.date), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                      {formatCurrency(goal.daily_goal)}
                    </span>
                  </div>
                  <div className="flex justify-end gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(goal)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteGoal(goal.date)}
                      disabled={deleteGoal.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedGoals.map((goal) => (
                    <TableRow key={goal.id}>
                      <TableCell className="font-medium">
                        {format(parseLocalDate(goal.date), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-primary font-semibold">
                        {formatCurrency(goal.daily_goal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(goal)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGoal(goal.date)}
                            disabled={deleteGoal.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">Como funcionam as metas?</h4>
              <p className="text-sm text-muted-foreground">
                As metas definidas aqui são exibidas automaticamente no Dashboard. Ao selecionar um dia 
                ou período no filtro de datas, você verá a comparação entre sua meta e o faturamento real, 
                incluindo um indicador visual de progresso. Para períodos de vários dias, o sistema soma 
                todas as metas e todos os faturamentos para calcular o percentual atingido.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
