import { Component, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: unknown;
}

export class CompetitionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    console.error("CompetitionErrorBoundary caught error", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error("CompetitionErrorBoundary componentDidCatch", { error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  handleBack = () => {
    window.location.href = "/dashboard/competicoes";
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Erro ao carregar a competição</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Ocorreu um problema inesperado ao carregar os dados da competição. Tente novamente ou
              volte para a lista de competições.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={this.handleBack}>
                Voltar para Competições
              </Button>
              <Button onClick={this.handleRetry}>Tentar novamente</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
