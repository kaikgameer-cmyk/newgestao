import { useState } from "react";
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
import { Loader2, CreditCard, Zap, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

// Electric charge types
export const ELECTRIC_CHARGE_TYPES = ['ac_lento', 'ac_semi', 'dc_rapido', 'residencial'];

export const chargeTypeLabels: Record<string, string> = {
  ac_lento: "AC Lento (3-7 kW)",
  ac_semi: "AC Semi-Rápido (7-22 kW)",
  dc_rapido: "DC Rápido (50+ kW)",
  residencial: "Residencial",
};

export interface ElectricRechargeFormData {
  date: string;
  station: string;
  kwh: string;
  totalValue: string;
  chargeType: string;
  odometerKm: string;
  paymentMethod: string;
  creditCardId: string;
  notes?: string;
}

interface CreditCardOption {
  id: string;
  name: string;
  last_digits?: string | null;
  available?: number | null;
}

interface ElectricRechargeFormProps {
  onSubmit: (data: ElectricRechargeFormData) => void;
  isPending?: boolean;
  creditCards?: CreditCardOption[];
  showNotes?: boolean;
  initialData?: Partial<ElectricRechargeFormData>;
}

export function ElectricRechargeForm({
  onSubmit,
  isPending = false,
  creditCards = [],
  showNotes = false,
  initialData,
}: ElectricRechargeFormProps) {
  const [date, setDate] = useState(initialData?.date || format(new Date(), "yyyy-MM-dd"));
  const [station, setStation] = useState(initialData?.station || "");
  const [kwh, setKwh] = useState(initialData?.kwh || "");
  const [totalValue, setTotalValue] = useState(initialData?.totalValue || "");
  const [chargeType, setChargeType] = useState(initialData?.chargeType || "");
  const [odometerKm, setOdometerKm] = useState(initialData?.odometerKm || "");
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || "");
  const [creditCardId, setCreditCardId] = useState(initialData?.creditCardId || "");
  const [notes, setNotes] = useState(initialData?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      date,
      station,
      kwh,
      totalValue,
      chargeType,
      odometerKm,
      paymentMethod,
      creditCardId,
      notes,
    });
  };

  const selectedCard = creditCards.find(c => c.id === creditCardId);
  const available = selectedCard?.available != null ? Number(selectedCard.available) : Infinity;
  const expenseValue = parseFloat(totalValue) || 0;
  const exceedsLimit = selectedCard && expenseValue > available;

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data *</Label>
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label>Estação (opcional)</Label>
          <Input 
            placeholder="Ex: Eletroposto Enel" 
            value={station} 
            onChange={(e) => setStation(e.target.value)} 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>kWh *</Label>
          <Input 
            type="number" 
            step="0.01" 
            placeholder="0.00" 
            value={kwh} 
            onChange={(e) => setKwh(e.target.value)} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label>Valor Total *</Label>
          <Input 
            type="number" 
            step="0.01" 
            placeholder="0.00" 
            value={totalValue} 
            onChange={(e) => setTotalValue(e.target.value)} 
            required 
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Tipo de carregamento *</Label>
        <Select value={chargeType} onValueChange={setChargeType} required>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {ELECTRIC_CHARGE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {chargeTypeLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>Quilometragem atual</Label>
        <Input 
          type="number" 
          placeholder="0" 
          value={odometerKm} 
          onChange={(e) => setOdometerKm(e.target.value)} 
        />
      </div>
      
      <div className="space-y-2">
        <Label>Método de pagamento</Label>
        <Select 
          value={paymentMethod} 
          onValueChange={(value) => {
            setPaymentMethod(value);
            if (value !== "credito") setCreditCardId("");
          }}
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
      
      {paymentMethod === "credito" && creditCards.length > 0 && (
        <>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Selecione o cartão
            </Label>
            <Select value={creditCardId} onValueChange={setCreditCardId}>
              <SelectTrigger><SelectValue placeholder="Escolha um cartão cadastrado" /></SelectTrigger>
              <SelectContent>
                {creditCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name} {card.last_digits ? `(•••• ${card.last_digits})` : ""}
                    {card.available != null && Number(card.available) <= 0 && " (sem limite)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCard && available <= 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Cartão sem limite disponível</p>
                <p className="text-xs opacity-80">
                  Use outro cartão ou pague uma fatura para liberar limite.
                </p>
              </div>
            </div>
          )}
          
          {selectedCard && available > 0 && exceedsLimit && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Limite insuficiente</p>
                <p className="text-xs opacity-80">
                  Disponível: R$ {available.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
        </>
      )}
      
      {paymentMethod === "credito" && creditCards.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum cartão cadastrado. Cadastre um cartão na seção de Cartões de Crédito.
        </p>
      )}
      
      {showNotes && (
        <div className="space-y-2">
          <Label>Observação (opcional)</Label>
          <Input 
            placeholder="Ex: Carga completa" 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
          />
        </div>
      )}
      
      <Button 
        type="submit" 
        variant="hero" 
        className="w-full" 
        disabled={isPending || exceedsLimit}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Zap className="w-4 h-4 mr-2" />
            Salvar Recarga
          </>
        )}
      </Button>
    </form>
  );
}
