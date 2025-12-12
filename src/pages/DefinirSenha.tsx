/**
 * Página de definição de senha para novos usuários
 * Rota: /definir-senha
 * 
 * Esta página é usada por novos clientes que compraram uma assinatura via Kiwify
 * e precisam definir sua senha de acesso ao Driver Control.
 * 
 * Recebe parâmetros via URL:
 * - email: email do usuário (pré-preenchido)
 * - token: token de recuperação (opcional, se vier do link do Supabase)
 */

import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { z } from "zod";

// Zod schemas for validation
const emailSchema = z.string()
  .trim()
  .min(1, "Email é obrigatório")
  .email("Formato de email inválido");

const passwordSchema = z.object({
  password: z.string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(128, "Senha deve ter no máximo 128 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type PageState = "form" | "success" | "error";

export default function DefinirSenha() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [pageState, setPageState] = useState<PageState>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  // Check for email in URL params and recovery token
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }

    // Check for Supabase recovery token in hash (from email link)
    const checkRecoveryToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const tokenType = hashParams.get("type");
      const refreshToken = hashParams.get("refresh_token");

      console.log("[DEFINIR-SENHA] Checking for recovery token...");
      console.log("[DEFINIR-SENHA] Hash params - token:", accessToken ? "present" : "none", "type:", tokenType);

      if (accessToken && tokenType === "recovery") {
        console.log("[DEFINIR-SENHA] Recovery token detected");
        
        try {
          // Try to set the session from the recovery token
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (error) {
            console.error("[DEFINIR-SENHA] Error setting session:", error);
            toast({
              title: "Link expirado",
              description: "Este link de recuperação expirou. Solicite um novo pelo login.",
              variant: "destructive",
            });
          } else if (data.session) {
            console.log("[DEFINIR-SENHA] Session established from recovery token");
            setHasRecoverySession(true);
            // Pre-fill email from session
            if (data.session.user.email) {
              setEmail(data.session.user.email);
            }
          }
        } catch (err) {
          console.error("[DEFINIR-SENHA] Exception checking token:", err);
        }
      }
    };

    checkRecoveryToken();
  }, [searchParams, toast]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setErrorMessage("");

    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }

    // Validate passwords
    const passwordResult = passwordSchema.safeParse({ password, confirmPassword });
    if (!passwordResult.success) {
      const fieldErrors: { password?: string; confirmPassword?: string } = {};
      passwordResult.error.errors.forEach((err) => {
        if (err.path[0] === "password") fieldErrors.password = err.message;
        if (err.path[0] === "confirmPassword") fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      // If we have a recovery session, update password directly
      if (hasRecoverySession) {
        console.log("[DEFINIR-SENHA] Updating password with recovery session");
        const { error } = await supabase.auth.updateUser({
          password: passwordResult.data.password,
        });

        if (error) {
          console.error("[DEFINIR-SENHA] Error updating password:", error);
          setErrorMessage("Não foi possível definir sua senha. Tente solicitar um novo link.");
          setPageState("error");
          return;
        }

        console.log("[DEFINIR-SENHA] Password updated successfully");
        await supabase.auth.signOut();
        setPageState("success");
        return;
      }

      // Without recovery session, we need to request a password reset
      // First, check if user exists by trying to sign in (will fail but confirms existence)
      console.log("[DEFINIR-SENHA] No recovery session, sending password reset email");
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/definir-senha?email=${encodeURIComponent(email)}`,
      });

      if (error) {
        console.error("[DEFINIR-SENHA] Error sending reset email:", error);
        
        if (error.message.includes("rate limit")) {
          setErrorMessage("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
        } else {
          setErrorMessage("Não foi possível enviar o email. Verifique se o email está correto.");
        }
        setPageState("error");
        return;
      }

      // Show message that email was sent
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada e clique no link para definir sua senha.",
      });

      setPageState("success");
    } catch (error: any) {
      console.error("[DEFINIR-SENHA] Unexpected error:", error);
      setErrorMessage("Ocorreu um erro inesperado. Tente novamente.");
      setPageState("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if form is valid for submit button
  const isFormValid = email.length > 0 && password.length >= 8 && confirmPassword.length > 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <img src={logo} alt="Driver Control" className="w-12 h-12" />
            <span className="text-xl font-semibold">Driver Control</span>
          </Link>

          {pageState === "form" && (
            <>
              <CardTitle className="text-2xl">Criar sua senha</CardTitle>
              <CardDescription>
                Use o e-mail que você usou na compra e crie sua senha para acessar o Driver Control.
              </CardDescription>
            </>
          )}

          {pageState === "success" && (
            <>
              <CardTitle className="text-2xl text-primary">Senha criada com sucesso!</CardTitle>
              <CardDescription>
                Agora você já pode acessar o Driver Control.
              </CardDescription>
            </>
          )}

          {pageState === "error" && (
            <>
              <CardTitle className="text-2xl text-destructive">Ops! Algo deu errado</CardTitle>
              <CardDescription>
                {errorMessage || "Não foi possível definir sua senha."}
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {pageState === "form" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={hasRecoverySession}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className={errors.password ? "border-destructive pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Confirm password field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Digite a senha novamente"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Criando senha...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Criar senha e acessar
                  </>
                )}
              </Button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
                  Já tenho senha, ir para login
                </Link>
              </div>
            </form>
          )}

          {pageState === "success" && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <CheckCircle2 className="w-20 h-20 text-primary" />
              </div>
              
              {hasRecoverySession ? (
                <p className="text-muted-foreground">
                  Sua senha foi criada com sucesso! Agora você pode fazer login com seu email e a senha que acabou de criar.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Enviamos um link para <strong>{email}</strong>.<br />
                  Clique no link do email para definir sua senha.
                </p>
              )}

              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={() => navigate("/login")}
              >
                Ir para Login
              </Button>
            </div>
          )}

          {pageState === "error" && (
            <div className="text-center space-y-6">
              <p className="text-muted-foreground">
                {errorMessage}
              </p>

              <div className="space-y-3">
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={() => {
                    setPageState("form");
                    setErrorMessage("");
                  }}
                >
                  Tentar novamente
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/login")}
                >
                  Ir para Login
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
