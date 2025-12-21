import { useState, useEffect } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, User, Phone, MapPin, Mail, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOnboarding } from "@/hooks/useOnboarding";
import { usePlatforms } from "@/hooks/usePlatforms";

// Validation schema
const onboardingSchema = z.object({
  first_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  last_name: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  whatsapp: z
    .string()
    .min(10, "WhatsApp inválido")
    .regex(/^[\d\s\(\)\-\+]+$/, "Formato de telefone inválido"),
  city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  enabledPlatformKeys: z.array(z.string()).min(1, "Selecione pelo menos 1 plataforma"),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

interface OnboardingModalProps {
  open: boolean;
}

export function OnboardingModal({ open }: OnboardingModalProps) {
  const { toast } = useToast();
  const { profile, userEmail, completeOnboarding } = useOnboarding();
  const { platforms, loadingPlatforms } = usePlatforms();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill form with existing data
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setWhatsapp(profile.whatsapp || "");
      setCity(profile.city || "");
    }
  }, [profile]);

  // Filter to system platforms only for onboarding
  const systemPlatforms = platforms.filter((p) => p.user_id === null && p.is_active);

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    // Clear platform error when user selects
    if (errors.enabledPlatformKeys) {
      setErrors((prev) => ({ ...prev, enabledPlatformKeys: "" }));
    }
  };

  const getPlatformColor = (key: string): string => {
    if (key === "uber") return "bg-black";
    if (key === "99") return "bg-[#FFB800]";
    if (key === "indrive") return "bg-[#2DCC70]";
    return "bg-primary";
  };

  const formatWhatsApp = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "");
    
    // Format as (XX) XXXXX-XXXX
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setWhatsapp(formatted);
  };

  const handleSubmit = async () => {
    // Validate form
    const formData: OnboardingFormData = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      whatsapp: whatsapp.trim(),
      city: city.trim(),
      enabledPlatformKeys: selectedPlatforms,
    };

    const result = onboardingSchema.safeParse(formData);
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    try {
      await completeOnboarding.mutateAsync({
        first_name: formData.first_name,
        last_name: formData.last_name,
        whatsapp: formData.whatsapp,
        city: formData.city,
        enabledPlatformKeys: formData.enabledPlatformKeys,
      });
      toast({
        title: "Perfil configurado!",
        description: "Bem-vindo ao Driver Control. Boas corridas!",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar seu perfil. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} modal>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-2xl">Configure seu Perfil</DialogTitle>
          <DialogDescription>
            Preencha seus dados para começar a usar o Driver Control
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Nome *
              </Label>
              <Input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="João"
                className={errors.first_name ? "border-destructive" : ""}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Sobrenome *</Label>
              <Input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Silva"
                className={errors.last_name ? "border-destructive" : ""}
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name}</p>
              )}
            </div>
          </div>

          {/* WhatsApp */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              WhatsApp *
            </Label>
            <Input
              id="whatsapp"
              value={whatsapp}
              onChange={handleWhatsAppChange}
              placeholder="(11) 99999-9999"
              className={errors.whatsapp ? "border-destructive" : ""}
            />
            {errors.whatsapp && (
              <p className="text-xs text-destructive">{errors.whatsapp}</p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="email"
              value={userEmail}
              readOnly
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Seu email não pode ser alterado
            </p>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city" className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Cidade *
            </Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="São Paulo"
              className={errors.city ? "border-destructive" : ""}
            />
            {errors.city && (
              <p className="text-xs text-destructive">{errors.city}</p>
            )}
          </div>

          {/* Platforms */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Car className="w-4 h-4 text-muted-foreground" />
              Plataformas que você trabalha *
            </Label>
            <p className="text-xs text-muted-foreground">
              Selecione pelo menos uma plataforma
            </p>

            {loadingPlatforms ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-border p-3">
                {systemPlatforms.map((platform) => (
                  <div
                    key={platform.key}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${getPlatformColor(platform.key)}`}
                      />
                      <span className="font-medium">{platform.name}</span>
                    </div>
                    <Switch
                      checked={selectedPlatforms.includes(platform.key)}
                      onCheckedChange={() => togglePlatform(platform.key)}
                    />
                  </div>
                ))}
              </div>
            )}
            {errors.enabledPlatformKeys && (
              <p className="text-xs text-destructive">{errors.enabledPlatformKeys}</p>
            )}
          </div>
        </div>

        {/* Submit button */}
        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={completeOnboarding.isPending}
        >
          {completeOnboarding.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar e Continuar"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
