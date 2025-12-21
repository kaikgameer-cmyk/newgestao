import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2, Key } from "lucide-react";
import { useUpdateMemberPix, useMemberPix } from "@/hooks/useCompetitions";
import { formatPixKey, unmaskPixKey, detectPixType, PixKeyType } from "@/lib/pixMasks";

interface EditPixModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitionId: string;
}

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave Aleatória" },
];

export function EditPixModal({ open, onOpenChange, competitionId }: EditPixModalProps) {
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<string>("");
  
  const { data: currentPix, isLoading: loadingPix } = useMemberPix(competitionId);
  const updatePixMutation = useUpdateMemberPix();

  // Load current values when data arrives
  useEffect(() => {
    if (currentPix) {
      setPixKey(currentPix.pix_key || "");
      setPixKeyType(currentPix.pix_key_type || "");
    }
  }, [currentPix]);

  const handleSave = async () => {
    if (pixKey.trim().length < 5) return;
    
    await updatePixMutation.mutateAsync({
      competition_id: competitionId,
      pix_key: pixKey.trim(),
      pix_key_type: pixKeyType || null,
    });
    
    onOpenChange(false);
  };

  const isValid = unmaskPixKey(pixKey).trim().length >= 5 && pixKeyType.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Editar Chave PIX
          </DialogTitle>
          <DialogDescription>
            Atualize sua chave PIX para receber prêmios desta competição
          </DialogDescription>
        </DialogHeader>

        {loadingPix ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pixKey">Chave PIX *</Label>
              <Input
                id="pixKey"
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                value={pixKey}
                onChange={(e) => {
                  const raw = e.target.value;
                  setPixKey(raw);
                  const currentType = (pixKeyType || "") as PixKeyType;
                  if (!currentType) {
                    const autoType = detectPixType(raw);
                    if (autoType) {
                      setPixKeyType(autoType);
                    }
                  }
                }}
                onBlur={() => {
                  const type = (pixKeyType || "") as PixKeyType;
                  if (type) {
                    const formatted = formatPixKey(pixKey, type);
                    setPixKey(formatted);
                  }
                }}
              />
              {pixKey.length > 0 && unmaskPixKey(pixKey).trim().length < 5 && (
                <p className="text-xs text-destructive">
                  Mínimo de 5 caracteres
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pixKeyType">Tipo da Chave *</Label>
              <Select 
                value={pixKeyType || ""} 
                onValueChange={(value: string) => {
                  const typedValue = value as PixKeyType;
                  setPixKeyType(typedValue);
                  // Re-format when type changes
                  const unmasked = unmaskPixKey(pixKey);
                  setPixKey(formatPixKey(unmasked, typedValue));
                }}
              >
                <SelectTrigger id="pixKeyType" className="bg-background">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  {PIX_KEY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!pixKeyType && (
                <p className="text-xs text-destructive">
                  Selecione o tipo da chave
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || updatePixMutation.isPending || loadingPix}
          >
            {updatePixMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
