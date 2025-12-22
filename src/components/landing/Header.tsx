import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-ng.png";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Spacer for balance */}
        <div className="w-20 md:hidden" />

        {/* Logo - Centered */}
        <Link to="/" className="absolute left-1/2 -translate-x-1/2">
          <img src={logo} alt="New Gestão" className="w-10 h-10" />
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Como funciona
          </a>
          <a href="#recursos" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Recursos
          </a>
          <a href="#precos" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Preços
          </a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Perguntas
          </a>
        </nav>

        {/* Login Button */}
        <Link to="/login">
          <Button variant="hero" size="default">
            Login
          </Button>
        </Link>
      </div>
    </header>
  );
}
