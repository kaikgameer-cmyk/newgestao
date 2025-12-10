import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Target, Edit } from 'lucide-react';
import { useDailyGoals } from '@/hooks/useDailyGoals';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoalEditorProps {
  date: Date;
  currentGoal: number | null;
}

/**
 * Modal dialog for editing daily goal
 * Allows users to set or update their daily earning target
 */
export function GoalEditor({ date, currentGoal }: GoalEditorProps) {
  const [open, setOpen] = useState(false);
  const [goalValue, setGoalValue] = useState(currentGoal?.toString() || '');
  const { upsertGoal, deleteGoal } = useDailyGoals();

  const handleSave = () => {
    const value = parseFloat(goalValue.replace(',', '.'));
    if (isNaN(value) || value < 0) return;

    upsertGoal.mutate({ date, dailyGoal: value });
    setOpen(false);
  };

  const handleDelete = () => {
    deleteGoal.mutate(date);
    setGoalValue('');
    setOpen(false);
  };

  const formattedDate = format(date, "dd 'de' MMMM", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {currentGoal ? (
            <>
              <Edit className="h-4 w-4" />
              Editar Meta
            </>
          ) : (
            <>
              <Target className="h-4 w-4" />
              Definir Meta
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Meta Diária
          </DialogTitle>
          <DialogDescription>
            Defina sua meta de faturamento para {formattedDate}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal">Valor da meta (R$)</Label>
            <Input
              id="goal"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 250.00"
              value={goalValue}
              onChange={(e) => setGoalValue(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          {currentGoal && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteGoal.isPending}
            >
              Remover
            </Button>
          )}
          <Button
            type="submit"
            onClick={handleSave}
            disabled={upsertGoal.isPending || !goalValue}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
