import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User as UserType } from "@supabase/supabase-js";
import { Crown, LogOut, Settings, Book, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "./UserAvatar";
import { cn } from "@/lib/utils";

interface UserMenuDropdownProps {
  user: UserType;
  profile: {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  } | null;
  subscription: {
    plan_name?: string;
    current_period_end?: string;
  } | null;
  subscriptionIsActive: boolean;
  onLogout: () => Promise<void>;
  onNavigate?: () => void;
  variant?: "sidebar" | "header";
}

export function UserMenuDropdown({
  user,
  profile,
  subscription,
  subscriptionIsActive,
  onLogout,
  onNavigate,
  variant = "sidebar",
}: UserMenuDropdownProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const firstName = profile?.first_name || "";
  const lastName = profile?.last_name || "";
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || user.email?.split("@")[0] || "Usuário";
  const avatarUrl = profile?.avatar_url;
  const planName = subscription?.plan_name || "Sem plano";

  const handleNavigate = (path: string) => {
    setOpen(false);
    onNavigate?.();
    navigate(path);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    // Direct navigation to profile on avatar click
    e.stopPropagation();
    onNavigate?.();
    navigate("/dashboard/configuracoes");
  };

  const handleLogout = async () => {
    setOpen(false);
    await onLogout();
  };

  return (
    <div className="flex items-center gap-2">
      {/* Clickable Avatar - goes directly to profile */}
      <button
        onClick={handleAvatarClick}
        className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-full"
        aria-label="Ir para Perfil"
      >
        <UserAvatar
          avatarUrl={avatarUrl}
          firstName={firstName}
          lastName={lastName}
          email={user.email}
          size="sm"
        />
      </button>

      {/* Dropdown for secondary actions */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "flex-1 justify-start gap-2 h-auto py-2 px-2 hover:bg-sidebar-accent/50 text-left",
              variant === "header" && "w-auto"
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Crown className="w-3 h-3" />
                {planName}
              </p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
          <div className="px-3 py-2">
            <p className="text-sm font-medium">{fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleNavigate("/dashboard/assinatura")}>
            <Crown className="mr-2 h-4 w-4" />
            Assinatura
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleNavigate("/dashboard/configuracoes")}>
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleNavigate("/dashboard/guia")}>
            <Book className="mr-2 h-4 w-4" />
            Guia da Plataforma
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
