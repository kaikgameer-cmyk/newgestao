import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "./UserAvatar";
import { Crown, LogOut, Settings, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  user: {
    email?: string | null;
  };
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  } | null;
  subscription?: {
    plan_name?: string | null;
  } | null;
  subscriptionIsActive?: boolean;
  onLogout: () => void;
  variant?: "sidebar" | "header";
}

export function UserMenu({
  user,
  profile,
  subscription,
  subscriptionIsActive,
  onLogout,
  variant = "sidebar",
}: UserMenuProps) {
  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.first_name || user.email || "Usuário";

  const getAvatarUrl = () => {
    if (!profile?.avatar_url) return null;
    // If it's already a full URL, return as-is
    if (profile.avatar_url.startsWith("http")) return profile.avatar_url;
    // Otherwise construct the public URL
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 w-full rounded-lg transition-colors hover:bg-sidebar-accent p-2",
            variant === "header" && "hover:bg-accent"
          )}
        >
          <UserAvatar
            avatarUrl={getAvatarUrl()}
            firstName={profile?.first_name}
            lastName={profile?.last_name}
            email={user.email}
          />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate">
              {displayName}
            </p>
            {subscriptionIsActive && subscription?.plan_name && (
              <div className="flex items-center gap-1 mt-0.5">
                <Crown className="w-3 h-3 text-primary" />
                <span className="text-xs text-muted-foreground truncate">
                  {subscription.plan_name}
                </span>
              </div>
            )}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard/configuracoes" className="flex items-center gap-2 cursor-pointer">
            <User className="w-4 h-4" />
            Meu Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/assinatura" className="flex items-center gap-2 cursor-pointer">
            <Crown className="w-4 h-4" />
            Assinatura
            {subscriptionIsActive && subscription?.plan_name && (
              <Badge variant="outline" className="ml-auto text-xs">
                {subscription.plan_name.split(" ")[0]}
              </Badge>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
