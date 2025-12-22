import { Link } from "react-router-dom";
import logo from "@/assets/logo-ng.png";

export function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="New Gestão" className="w-8 h-8" />
            <span className="text-lg font-semibold">New Gestão</span>
          </Link>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Termos de uso</a>
            <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
            <a href="mailto:newgestao.contato@outlook.com" className="hover:text-primary transition-colors">Contato</a>
          </div>
          
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} New Gestão. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
