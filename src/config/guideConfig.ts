import { LucideIcon, LayoutDashboard, Receipt, Fuel, Repeat, Crown, Target, Shield } from "lucide-react";

/**
 * Configuração centralizada do Guia da Plataforma
 * Para atualizar o guia, edite este arquivo.
 * Cada seção pode ter texto, lista de features e dicas.
 */

export interface GuideFeature {
  title: string;
  description: string;
}

export interface GuideTip {
  text: string;
}

export interface GuideSection {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  features: GuideFeature[];
  tips?: GuideTip[];
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    description:
      "O Dashboard é a página principal onde você acompanha todos os seus resultados financeiros de forma visual e intuitiva.",
    features: [
      {
        title: "Cards de KPIs",
        description:
          "Veja rapidamente sua Receita Total, Despesas, Lucro Líquido e Média por Dia. Os valores se atualizam automaticamente conforme o período selecionado.",
      },
      {
        title: "Filtro de Período",
        description:
          "Use os botões 'Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias' ou 'Este mês' para filtrar todos os dados da página. Você também pode selecionar um período personalizado.",
      },
      {
        title: "Gráfico de Lucro Diário",
        description:
          "Visualize a evolução do seu lucro dia a dia em um gráfico de área. Passe o mouse sobre os pontos para ver os valores exatos.",
      },
      {
        title: "Despesas por Categoria",
        description:
          "O gráfico de pizza mostra como suas despesas estão distribuídas entre as categorias: Combustível, Manutenção, Pedágio, Despesas Fixas, etc.",
      },
      {
        title: "Metas Diárias",
        description:
          "Defina metas de faturamento para cada dia e acompanhe se você está batendo suas metas. O card de metas mostra o progresso com barra visual.",
      },
    ],
    tips: [
      { text: "Use o filtro 'Últimos 7 dias' para ter uma visão semanal do seu desempenho." },
      { text: "Defina metas realistas baseadas no seu histórico de faturamento." },
    ],
  },
  {
    id: "lancamentos",
    title: "Lançamentos",
    icon: Receipt,
    description:
      "Aqui você registra todas as suas receitas (ganhos com corridas) e despesas do dia a dia.",
    features: [
      {
        title: "Adicionar Receita",
        description:
          "Clique em 'Nova Receita' para registrar seus ganhos. Informe a data, o aplicativo (Uber, 99, InDrive, etc.), o valor total e opcionalmente uma observação.",
      },
      {
        title: "Adicionar Despesa",
        description:
          "Clique em 'Nova Despesa' para registrar gastos. Escolha a categoria, data, valor e forma de pagamento. Se for cartão de crédito, selecione o cartão específico.",
      },
      {
        title: "Parcelamento",
        description:
          "Ao registrar uma despesa no cartão de crédito, você pode informar o número de parcelas. O sistema distribui automaticamente o valor entre os meses.",
      },
      {
        title: "Filtrar por Período",
        description:
          "Use o filtro de datas no topo da página para ver apenas os lançamentos de um período específico.",
      },
      {
        title: "Editar e Excluir",
        description:
          "Clique nos ícones de lápis ou lixeira em cada lançamento para editar ou excluir.",
      },
    ],
    tips: [
      { text: "Registre seus ganhos diariamente para manter o controle em dia." },
      { text: "Use as categorias corretamente para ter relatórios precisos." },
    ],
  },
  {
    id: "combustivel",
    title: "Combustível",
    icon: Fuel,
    description:
      "Controle detalhado dos seus abastecimentos com cálculo automático de consumo médio.",
    features: [
      {
        title: "Registrar Abastecimento",
        description:
          "Informe a data, posto, tipo de combustível, litros, valor total e quilometragem atual do veículo.",
      },
      {
        title: "Consumo Médio",
        description:
          "O sistema calcula automaticamente seu consumo em km/litro baseado nos abastecimentos registrados.",
      },
      {
        title: "Filtrar por Período",
        description:
          "Veja o total gasto com combustível hoje, nos últimos 7 dias ou no mês. Use o filtro de período no topo da página.",
      },
      {
        title: "Forma de Pagamento",
        description:
          "Registre se pagou em dinheiro, débito, PIX ou cartão de crédito. Gastos no cartão entram automaticamente na fatura.",
      },
    ],
    tips: [
      { text: "Registre sempre a quilometragem para ter o cálculo de consumo correto." },
      { text: "Compare os postos onde você abastece para encontrar os melhores preços." },
    ],
  },
  {
    id: "despesas-fixas",
    title: "Despesas Fixas",
    icon: Repeat,
    description:
      "Cadastre despesas que se repetem todo mês, como aluguel do carro, seguro, financiamento, etc.",
    features: [
      {
        title: "Cadastrar Despesa Fixa",
        description:
          "Informe o nome da despesa, valor mensal e data de início. O sistema divide o valor por 30 dias automaticamente.",
      },
      {
        title: "Impacto nos Relatórios",
        description:
          "As despesas fixas são incluídas automaticamente no cálculo de lucro diário e nos relatórios semanais/mensais.",
      },
      {
        title: "Ativar/Desativar",
        description:
          "Você pode desativar temporariamente uma despesa fixa sem excluí-la. Ela deixará de ser contabilizada até você reativá-la.",
      },
      {
        title: "Data de Término",
        description:
          "Se a despesa tem prazo (ex: financiamento de 48 meses), você pode definir uma data de término.",
      },
    ],
    tips: [
      { text: "Inclua todas as despesas fixas para ter uma visão real do seu lucro." },
      { text: "Revise periodicamente para remover despesas que não existem mais." },
    ],
  },
  {
    id: "metas",
    title: "Metas Diárias",
    icon: Target,
    description:
      "Sistema de metas para acompanhar se você está atingindo seus objetivos de faturamento.",
    features: [
      {
        title: "Definir Meta do Dia",
        description:
          "No Dashboard, ao selecionar um dia específico, clique em 'Definir Meta' para estabelecer quanto você quer faturar naquele dia.",
      },
      {
        title: "Acompanhar Progresso",
        description:
          "O card de metas mostra uma barra de progresso indicando quanto você já faturou em relação à meta.",
      },
      {
        title: "Status da Meta",
        description:
          "Veja claramente se a meta foi batida (✅) ou não (❌) com indicador visual colorido.",
      },
      {
        title: "Resumo Semanal",
        description:
          "Ao selecionar um período de vários dias, veja o resumo com a soma das metas vs soma do faturamento.",
      },
    ],
    tips: [
      { text: "Comece com metas alcançáveis e vá aumentando conforme ganha confiança." },
      { text: "Use o histórico para definir metas realistas baseadas em dias anteriores." },
    ],
  },
  {
    id: "assinatura",
    title: "Assinatura",
    icon: Crown,
    description:
      "Gerencie seu plano de assinatura do Driver Control.",
    features: [
      {
        title: "Ver Plano Atual",
        description:
          "Veja qual plano você está usando (Mensal, Trimestral ou Anual), status e data de renovação.",
      },
      {
        title: "Alterar Plano",
        description:
          "Clique no botão do plano desejado para ser redirecionado à página de checkout da Kiwify.",
      },
      {
        title: "Dias Restantes",
        description:
          "O sistema mostra quantos dias faltam para a renovação da sua assinatura no menu lateral.",
      },
    ],
    tips: [
      { text: "Planos mais longos (Trimestral e Anual) oferecem economia." },
    ],
  },
  {
    id: "admin",
    title: "Painel Admin",
    icon: Shield,
    description:
      "Área exclusiva para administradores gerenciarem usuários e assinaturas.",
    features: [
      {
        title: "Lista de Usuários",
        description:
          "Visualize todos os usuários cadastrados com nome, email, cidade, plano e status da assinatura.",
      },
      {
        title: "Criar Usuário",
        description:
          "Crie novos usuários manualmente. Um email com as credenciais será enviado automaticamente.",
      },
      {
        title: "Gerenciar Assinaturas",
        description:
          "Crie, edite ou remova assinaturas de qualquer usuário. Altere planos e períodos conforme necessário.",
      },
      {
        title: "Tornar Admin",
        description:
          "Promova usuários comuns para administradores ou remova o acesso admin.",
      },
    ],
    tips: [
      { text: "Esta seção só aparece para usuários com role de admin." },
    ],
  },
];

/**
 * Texto de introdução do guia
 */
export const GUIDE_INTRO = {
  title: "Bem-vindo ao Driver Control",
  subtitle: "Guia Completo da Plataforma",
  description:
    "O Driver Control é uma plataforma de gestão financeira desenvolvida especialmente para motoristas de aplicativo. Aqui você controla suas receitas, despesas, combustível e muito mais de forma simples e visual. Este guia explica como usar cada funcionalidade do sistema.",
};
