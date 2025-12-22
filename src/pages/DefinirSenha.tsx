/**
 * Página de definição de senha para novos usuários
 * Rota: /definir-senha
 * 
 * Esta página é usada por novos clientes que compraram uma assinatura via Kiwify
 * e precisam definir sua senha de acesso ao New Gestão.
 * 
 * Recebe parâmetros via URL:
 * - token: token de criação de senha (obrigatório para definir senha)
 * - email: email do usuário (opcional, para pré-preencher o campo)
 */

import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-ng.png";
import { z } from "zod";

const PROD_APP_URL = "https://newgestao.app";

// Zod schemas for validation
const passwordSchema = z.object({
  password: z.string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(128, "Senha deve ter no máximo 128 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type PageState = "loading" | "form" | "success" | "error" | "invalid";

interface TokenValidation {
  valid: boolean;
  email: string;
  type: string;
  userId: string;
}

export default function DefinirSenha() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [pageState, setPageState] = useState<PageState>("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);

  // Validate token on page load
  useEffect(() => {
    document.title = "Definir senha | New Gestão";
  }, []);

  useEffect(() => {
    const validateToken = async () => {
      const tokenParam = searchParams.get("token");
      const emailParam = searchParams.get("email");

      console.log("[DEFINIR-SENHA] Checking URL params...");
      console.log("  - Token:", tokenParam ? "present" : "none");
      console.log("  - Email:", emailParam || "none");
      console.log("  - Hash:", window.location.hash ? "present" : "none");
      console.log("  - Full URL:", window.location.href);

      // Check for Supabase auth tokens in hash (recovery links from auth emails)
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        console.log("[DEFINIR-SENHA] Found auth tokens in hash - processing recovery flow");
        try {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const type = hashParams.get("type");

          console.log("  - Type:", type);
          console.log("  - Access token:", accessToken ? "present" : "none");
          console.log("  - Refresh token:", refreshToken ? "present" : "none");

          // ✅ Required behavior: only allow recovery here
          if (type !== "recovery") {
            setErrorMessage("Este link não é de recuperação de senha. Solicite um novo link.");
            setPageState("invalid");
            return;
          }

          if (!accessToken || !refreshToken) {
            setErrorMessage("Link incompleto. Solicite um novo link.");
            setPageState("invalid");
            return;
          }

          console.log("[DEFINIR-SENHA] Setting session with recovery tokens...");
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("[DEFINIR-SENHA] Error setting session:", sessionError.message);
            if (
              sessionError.message.includes("expired") ||
              sessionError.message.includes("invalid") ||
              sessionError.message.includes("Token")
            ) {
              setErrorMessage("O link expirou ou é inválido. Reenvie um novo link para definir sua senha.");
              setPageState("invalid");
              return;
            }
            throw sessionError;
          }

          const { data: { user }, error: userError } = await supabase.auth.getUser();

          if (userError) {
            console.error("[DEFINIR-SENHA] Error getting user:", userError.message);
            setErrorMessage("Erro ao validar sessão. Reenvie um novo link.");
            setPageState("error");
            return;
          }

          if (user?.email) {
            setEmail(user.email);
            console.log("[DEFINIR-SENHA] Session established successfully for:", user.email);
            setPageState("form");
            // Clear hash from URL for security
            window.history.replaceState(null, "", window.location.pathname);
            return;
          }

          console.error("[DEFINIR-SENHA] Session set but no user email found");
          setErrorMessage("Erro ao recuperar dados do usuário. Tente novamente.");
          setPageState("error");
          return;
        } catch (err: any) {
          console.error("[DEFINIR-SENHA] Error processing hash tokens:", err);
          setErrorMessage("Erro ao processar o link. Reenvie um novo link.");
          setPageState("error");
          return;
        }
      }

      // Handle custom token from password_tokens table
      if (tokenParam) {
        setToken(tokenParam);

        try {
          console.log("[DEFINIR-SENHA] Validating custom token via edge function...");

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const response = await fetch(
            `${supabaseUrl}/functions/v1/set-password?token=${encodeURIComponent(tokenParam)}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          const result = await response.json();

          if (!response.ok) {
            console.log("[DEFINIR-SENHA] Token validation failed:", result.error);
            setErrorMessage(result.error || "Link inválido ou expirado.");
            setPageState("invalid");
            return;
          }

          console.log("[DEFINIR-SENHA] Token valid for user:", result.email);
          setEmail(result.email || "");
          setPageState("form");
          return;
        } catch (err: any) {
          console.error("[DEFINIR-SENHA] Error validating token:", err);
          setErrorMessage("Erro ao validar o link. Tente novamente.");
          setPageState("error");
          return;
        }
      }

      // No token provided - check if there's an email param
      console.log("[DEFINIR-SENHA] No token provided");
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam));
      }
      setErrorMessage("Link inválido. Use o link enviado por e-mail para definir sua senha.");
      setPageState("invalid");
    };

    validateToken();
  }, [searchParams]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setErrorMessage("");

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

    setIsSubmitting(true);

    try {
      console.log("[DEFINIR-SENHA] Setting password...");

      // Check if we're using a custom token (from password_tokens table)
      if (token) {
        console.log("[DEFINIR-SENHA] Using custom token flow via edge function");
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/set-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: token,
            newPassword: password,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error("[DEFINIR-SENHA] Error setting password via token:", result.error);
          setErrorMessage(result.error || "Não foi possível definir sua senha. Tente novamente.");
          setPageState("error");
          return;
        }

        console.log("[DEFINIR-SENHA] Password set successfully via token!");
        setPageState("success");
      } else {
        // We're using Supabase Auth session (from recovery link)
        console.log("[DEFINIR-SENHA] Using Supabase Auth session to update password");
        
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateError) {
          console.error("[DEFINIR-SENHA] Error updating password via Auth:", updateError.message);
          setErrorMessage(updateError.message || "Não foi possível definir sua senha. Tente novamente.");
          setPageState("error");
          return;
        }

        console.log("[DEFINIR-SENHA] Password updated successfully via Auth!");
        
        // Sign out so user can login fresh with new password
        await supabase.auth.signOut();
        
        setPageState("success");
      }
    } catch (error: any) {
      console.error("[DEFINIR-SENHA] Unexpected error:", error);
      setErrorMessage("Ocorreu um erro inesperado. Tente novamente.");
      setPageState("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is valid for submit button
  const isFormValid = password.length >= 8 && confirmPassword.length > 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <img src={logo} alt="New Gestão" className="w-12 h-12" />
            <span className="text-xl font-semibold">New Gestão</span>
          </Link>

          {pageState === "loading" && (
            <>
              <CardTitle className="text-2xl">Validando link...</CardTitle>
              <CardDescription>
                Aguarde enquanto verificamos seu link de acesso.
              </CardDescription>
            </>
          )}

          {pageState === "form" && (
            <>
              <CardTitle className="text-2xl">Criar sua senha</CardTitle>
              <CardDescription>
                Defina sua senha para acessar o New Gestão.
              </CardDescription>
            </>
          )}

          {pageState === "success" && (
            <>
              <CardTitle className="text-2xl text-primary">Senha criada com sucesso!</CardTitle>
              <CardDescription>
                Agora você já pode acessar o New Gestão.
              </CardDescription>
            </>
          )}

          {(pageState === "error" || pageState === "invalid") && (
            <>
              <CardTitle className="text-2xl text-destructive">
                {pageState === "invalid" ? "Link inválido" : "Ops! Algo deu errado"}
              </CardTitle>
              <CardDescription>
                {errorMessage || "Não foi possível definir sua senha."}
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {pageState === "loading" && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          )}

          {pageState === "form" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email field (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
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
                disabled={isSubmitting || !isFormValid}
              >
                {isSubmitting ? (
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
              
              <p className="text-muted-foreground">
                Sua senha foi criada com sucesso! Agora você pode fazer login com seu email e a senha que acabou de criar.
              </p>

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

          {(pageState === "error" || pageState === "invalid") && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <AlertCircle className="w-16 h-16 text-destructive" />
              </div>
              
              <p className="text-muted-foreground">
                {errorMessage}
              </p>

              <div className="space-y-3">
                {pageState === "error" && (
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
                )}

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
