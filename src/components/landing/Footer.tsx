import { Link } from "react-router-dom";
import { BRAND } from "@/config/brand";

export function Footer() {
  return (
    <footer className="py-8 md:py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo-ng.png" alt="New Gestão" className="w-7 h-7" />
            <span className="font-medium text-foreground">New Gestão</span>
          </Link>
          
          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Termos</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
            <a href={`mailto:${BRAND.SUPPORT_EMAIL}`} className="hover:text-foreground transition-colors">
              Contato
            </a>
          </div>
          
          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} New Gestão
          </p>
        </div>
      </div>
    </footer>
  );
}
