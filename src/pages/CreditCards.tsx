import { useState } from "react";
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
import { Plus, CreditCard as CardIcon, DollarSign, Percent, Loader2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function CreditCards() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [lastDigits, setLastDigits] = useState("");
  const [brand, setBrand] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [bestPurchaseDay, setBestPurchaseDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
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
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
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

  const totalLimit = creditCards.reduce((acc, card) => acc + (Number(card.credit_limit) || 0), 0);

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
                <p className="text-2xl font-bold">R$ {totalLimit.toLocaleString("pt-BR")}</p>
              </CardContent>
            </Card>
            <Card variant="elevated">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CardIcon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Total de Cartões</span>
                </div>
                <p className="text-2xl font-bold">{creditCards.length}</p>
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
                <p className="text-2xl font-bold">100%</p>
              </CardContent>
            </Card>
          </div>

          {/* Cards Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {creditCards.map((card) => (
              <Card key={card.id} variant="elevated" className="hover:border-primary/30 transition-colors">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{card.name}</CardTitle>
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
                  {card.credit_limit && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Limite</span>
                        <span className="font-medium">R$ {Number(card.credit_limit).toLocaleString("pt-BR")}</span>
                      </div>
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
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
