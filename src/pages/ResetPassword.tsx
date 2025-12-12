import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { z } from "zod";

// Zod schema for password validation
const passwordSchema = z.object({
  password: z.string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(128, "Senha deve ter no máximo 128 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const emailSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "Email é obrigatório")
    .email("Formato de email inválido"),
});

type Mode = "request" | "reset" | "success";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Detect mode based on URL hash/params (Supabase sends recovery tokens via hash fragment)
  const [mode, setMode] = useState<Mode>("request");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [tokenProcessed, setTokenProcessed] = useState(false);

  // Check for recovery token in URL (Supabase uses hash fragment for recovery)
  useEffect(() => {
    const checkForToken = async () => {
      // Supabase recovery links have the format: /reset-password#access_token=...&type=recovery
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const tokenType = hashParams.get("type");

      // Also check query params as fallback
      const queryToken = searchParams.get("token");
      const queryType = searchParams.get("type");

      console.log("[RESET] Checking for recovery token...");
      console.log("[RESET] Hash params - token:", accessToken ? "present" : "none", "type:", tokenType);
      console.log("[RESET] Query params - token:", queryToken ? "present" : "none", "type:", queryType);

      if ((accessToken && tokenType === "recovery") || (queryToken && queryType === "recovery")) {
        // We have a recovery token, let Supabase handle the session
        console.log("[RESET] Recovery token detected, switching to reset mode");
        
        // The Supabase client should automatically pick up the session from the URL
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[RESET] Error getting session:", error);
          toast({
            title: "Link inválido",
            description: "Este link de recuperação é inválido ou expirou. Solicite um novo.",
            variant: "destructive",
          });
          setMode("request");
        } else if (session) {
          console.log("[RESET] Session established, ready for password reset");
          setMode("reset");
          setTokenProcessed(true);
        } else {
          // Try to set session from URL
          const { data, error: authError } = await supabase.auth.setSession({
            access_token: accessToken || queryToken || "",
            refresh_token: hashParams.get("refresh_token") || "",
          });

          if (authError || !data.session) {
            console.error("[RESET] Error setting session:", authError);
            toast({
              title: "Link expirado",
              description: "Este link de recuperação expirou. Solicite um novo.",
              variant: "destructive",
            });
            setMode("request");
          } else {
            console.log("[RESET] Session set successfully");
            setMode("reset");
            setTokenProcessed(true);
          }
        }
      }
    };

    checkForToken();
  }, [searchParams, toast]);

  // Handle password reset request (send email)
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setErrors({ email: result.error.errors[0].message });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error("[RESET] Error requesting password reset:", error);
        toast({
          title: "Erro",
          description: "Não foi possível enviar o email. Tente novamente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setMode("success");
      }
    } catch (error) {
      console.error("[RESET] Unexpected error:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: { password?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "password") fieldErrors.password = err.message;
        if (err.path[0] === "confirmPassword") fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: result.data.password,
      });

      if (error) {
        console.error("[RESET] Error updating password:", error);
        toast({
          title: "Erro ao atualizar senha",
          description: error.message || "Não foi possível atualizar sua senha. Tente novamente.",
          variant: "destructive",
        });
      } else {
        console.log("[RESET] Password updated successfully");
        toast({
          title: "Senha definida com sucesso!",
          description: "Agora você pode acessar sua conta.",
        });
        // Sign out to force fresh login with new password
        await supabase.auth.signOut();
        navigate("/login");
      }
    } catch (error) {
      console.error("[RESET] Unexpected error:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <img src={logo} alt="Driver Control" className="w-10 h-10" />
            <span className="text-xl font-semibold">Driver Control</span>
          </Link>
          
          {mode === "request" && (
            <>
              <CardTitle className="text-2xl">Esqueci minha senha</CardTitle>
              <CardDescription>
                Digite seu email para receber um link de recuperação
              </CardDescription>
            </>
          )}
          
          {mode === "reset" && (
            <>
              <CardTitle className="text-2xl">Definir nova senha</CardTitle>
              <CardDescription>
                Crie uma senha segura para sua conta
              </CardDescription>
            </>
          )}
          
          {mode === "success" && (
            <>
              <CardTitle className="text-2xl">Email enviado!</CardTitle>
              <CardDescription>
                Verifique sua caixa de entrada
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {mode === "request" && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="hero"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  "Enviar link de recuperação"
                )}
              </Button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
                  Voltar para o login
                </Link>
              </div>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={errors.confirmPassword ? "border-destructive" : ""}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="hero"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Definir senha
                  </>
                )}
              </Button>
            </form>
          )}

          {mode === "success" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-primary" />
              </div>
              <p className="text-muted-foreground">
                Enviamos um link de recuperação para <strong>{email}</strong>.
                Verifique sua caixa de entrada e clique no link para definir sua nova senha.
              </p>
              <p className="text-sm text-muted-foreground">
                Não recebeu? Verifique a pasta de spam ou{" "}
                <button 
                  onClick={() => setMode("request")} 
                  className="text-primary hover:underline"
                >
                  tente novamente
                </button>
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/login")}
              >
                Voltar para o login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
