import { 
  LucideIcon, 
  LayoutDashboard, 
  Receipt, 
  Wrench, 
  Repeat, 
  Crown, 
  Target, 
  Shield, 
  UserCircle, 
  Layers, 
  Trophy,
  Bell,
  HelpCircle,
  Palette,
  Rocket
} from "lucide-react";

/**
 * Configuração centralizada do Guia da Plataforma
 * Manual oficial do New Gestão - atualizado e completo
 */

export interface GuideFeature {
  title: string;
  description: string;
}

export interface GuideTip {
  text: string;
  type?: "info" | "warning" | "error";
}

export interface GuideSection {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  features: GuideFeature[];
  tips?: GuideTip[];
  rules?: string[];
  commonErrors?: { error: string; solution: string }[];
}

export const GUIDE_SECTIONS: GuideSection[] = [
  // 1. PRIMEIRO ACESSO
  {
    id: "primeiro-acesso",
    title: "Comece por aqui",
    icon: Rocket,
    description:
      "Ao fazer seu primeiro login no New Gestão, você verá um pop-up obrigatório para configurar seu perfil. Este passo é essencial para usar o sistema.",
    features: [
      {
        title: "Pop-up de Boas-vindas",
        description:
          "Ao entrar pela primeira vez, um modal de onboarding aparece automaticamente. Você só consegue acessar o sistema após completar este passo.",
      },
      {
        title: "Campos Obrigatórios",
        description:
          "Você deve preencher: Nome, Sobrenome, WhatsApp, Email (já preenchido automaticamente) e Cidade. Esses dados são usados em competições e contato.",
      },
      {
        title: "Ativar Plataformas",
        description:
          "No mesmo pop-up, selecione as plataformas em que você trabalha (Uber, 99, InDrive, etc). Apenas plataformas ativas aparecerão nos lançamentos de receita.",
      },
      {
        title: "Concluir Onboarding",
        description:
          "Após preencher tudo e selecionar ao menos uma plataforma, clique em Concluir. Você será redirecionado ao Dashboard.",
      },
    ],
    rules: [
      "O onboarding é obrigatório - você não consegue usar o sistema sem completá-lo.",
      "Mantenha seus dados atualizados, especialmente o WhatsApp (usado em competições).",
    ],
    tips: [
      { text: "Você pode editar seus dados depois em Configurações → Perfil." },
      { text: "Se esqueceu de ativar uma plataforma, vá em Configurações → Plataformas." },
    ],
  },

  // 2. PERFIL E CONFIGURAÇÕES
  {
    id: "perfil-configuracoes",
    title: "Perfil e Configurações",
    icon: UserCircle,
    description:
      "Na página de Configurações você pode editar seus dados pessoais, foto de perfil e preferências do sistema.",
    features: [
      {
        title: "Editar Perfil",
        description:
          "Altere seu Nome, Sobrenome, WhatsApp, Cidade e Email. Lembre-se: o WhatsApp é usado para contato em competições.",
      },
      {
        title: "Foto de Perfil",
        description:
          "Clique na foto para fazer upload de uma nova imagem. Ela aparecerá no menu lateral e no ranking de competições.",
      },
      {
        title: "Dia de Início da Semana",
        description:
          "Configure se sua semana começa no Domingo ou Segunda. Isso afeta os cálculos semanais do Dashboard.",
      },
    ],
    tips: [
      { text: "Mantenha o WhatsApp atualizado - hosts de competições usam para contato sobre prêmios." },
    ],
  },

  // 3. PLATAFORMAS E OUTRAS RECEITAS
  {
    id: "plataformas",
    title: "Plataformas e Outras Receitas",
    icon: Layers,
    description:
      "Gerencie as plataformas de trabalho (Uber, 99, InDrive) e cadastre outras fontes de receita como 'Loja', 'Freela', etc.",
    features: [
      {
        title: "Plataformas Padrão",
        description:
          "O sistema já vem com Uber, 99, InDrive e Outros. Você pode ativar/desativar cada uma conforme trabalha.",
      },
      {
        title: "Criar Nova Plataforma",
        description:
          "Clique em 'Adicionar Plataforma' para criar fontes de receita personalizadas. Informe o nome e escolha uma cor.",
      },
      {
        title: "Seletor de Cor",
        description:
          "Cada plataforma tem uma cor que aparece nos gráficos e cards do Dashboard. Escolha cores diferentes para fácil identificação.",
      },
      {
        title: "Ativar/Desativar",
        description:
          "Use o toggle para ativar ou desativar plataformas. Apenas as ativas aparecem no formulário de lançamento de receita.",
      },
    ],
    rules: [
      "Apenas plataformas ativas aparecem nos lançamentos e relatórios.",
      "Nomes de plataforma são normalizados (sem espaços extras, capitalização correta).",
    ],
    commonErrors: [
      {
        error: "Plataforma não aparece no lançamento",
        solution: "Verifique se a plataforma está ativada em Configurações → Plataformas.",
      },
    ],
    tips: [
      { text: "Use 'Outros' para receitas esporádicas que não se encaixam em nenhuma categoria." },
    ],
  },

  // 4. LANÇAMENTOS DE RECEITA
  {
    id: "lancamentos",
    title: "Lançamentos de Receita",
    icon: Receipt,
    description:
      "Registre seus ganhos diários. Cada lançamento representa um dia de trabalho com valores separados por plataforma.",
    features: [
      {
        title: "Um Lançamento por Dia",
        description:
          "Cada dia tem UM único lançamento de receita. Dentro dele você informa o valor ganho em cada plataforma separadamente.",
      },
      {
        title: "Dados Gerais do Dia",
        description:
          "Informe o total de Viagens, Quilômetros Rodados e Horas Trabalhadas do dia. Esses valores são o total somando todas as plataformas.",
      },
      {
        title: "Valores por Plataforma",
        description:
          "Para cada plataforma ativa, há um campo de valor. Preencha quanto você recebeu em cada app naquele dia.",
      },
      {
        title: "Total Automático",
        description:
          "O sistema soma automaticamente os valores de todas as plataformas para calcular o total do dia.",
      },
      {
        title: "Editar Lançamento",
        description:
          "Clique no ícone de lápis para editar um lançamento existente. Você pode alterar qualquer campo.",
      },
    ],
    rules: [
      "Só é possível ter um lançamento de receita por dia.",
      "O total do dia = soma de todas as plataformas.",
      "Viagens, KM e Horas são totais do dia (não por plataforma).",
    ],
    tips: [
      { text: "Registre seus ganhos no fim de cada dia para não esquecer." },
      { text: "Os KM rodados são usados para calcular o rendimento por km." },
    ],
  },

  // 5. DASHBOARD
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    description:
      "O Dashboard é a página principal onde você visualiza seus resultados financeiros. Comece sempre pelo dia atual e navegue entre datas.",
    features: [
      {
        title: "Visualização Inicial",
        description:
          "Ao entrar, o Dashboard mostra os resultados do dia atual. Use o seletor de datas para ver outros dias ou períodos.",
      },
      {
        title: "Seletor de Data/Período",
        description:
          "Você pode selecionar um dia específico OU um intervalo (data inicial → data final). O layout se adapta mostrando dados daquele período.",
      },
      {
        title: "Card de Meta",
        description:
          "No topo, veja sua meta do dia e o progresso. Verde = meta batida, Vermelho = meta não batida.",
      },
      {
        title: "Resumo do Dia",
        description:
          "Cards com Receita Total, Despesas, Lucro Líquido. Valores em verde são positivos, em vermelho negativos.",
      },
      {
        title: "Receita por Plataforma",
        description:
          "Gráfico mostrando quanto você ganhou em cada plataforma (Uber, 99, etc) no período selecionado.",
      },
      {
        title: "Métricas do Dia",
        description:
          "Viagens realizadas, KM rodados, Horas trabalhadas e médias (R$/viagem, R$/km, R$/hora).",
      },
      {
        title: "Despesas por Categoria",
        description:
          "Gráfico de pizza mostrando a distribuição das despesas (Combustível, Manutenção, etc).",
      },
      {
        title: "Manutenções Próximas",
        description:
          "No final, veja alertas de manutenções que estão próximas do vencimento por KM.",
      },
    ],
    rules: [
      "O Dashboard sempre abre no dia atual.",
      "Ao selecionar um intervalo, os dados são somados (não é média).",
    ],
    tips: [
      { text: "Use o intervalo semanal (segunda a domingo) para ver seu resultado da semana." },
      { text: "Compare semanas para ver sua evolução." },
    ],
  },

  // 6. METAS
  {
    id: "metas",
    title: "Metas Diárias",
    icon: Target,
    description:
      "Defina metas de faturamento para cada dia e acompanhe seu progresso. Metas ajudam a manter o foco e motivação.",
    features: [
      {
        title: "Definir Meta do Dia",
        description:
          "Na página de Metas, selecione um dia e defina quanto você quer faturar. A meta fica salva para aquele dia específico.",
      },
      {
        title: "Meta Padrão",
        description:
          "Você pode definir uma meta padrão que é usada automaticamente para novos dias.",
      },
      {
        title: "Progresso Visual",
        description:
          "No Dashboard, uma barra de progresso mostra quanto da meta você já atingiu.",
      },
      {
        title: "Status da Meta",
        description:
          "Verde com ✓ = meta batida. Vermelho = meta não batida. Aparece no card de metas.",
      },
    ],
    tips: [
      { text: "Comece com metas realistas baseadas no seu histórico." },
      { text: "Aumente gradualmente conforme ganha confiança." },
    ],
  },

  // 7. DESPESAS E MANUTENÇÕES
  {
    id: "despesas-manutencoes",
    title: "Despesas e Manutenções",
    icon: Wrench,
    description:
      "Registre todas as suas despesas (combustível, pedágio, manutenção) e acompanhe as manutenções programadas do veículo.",
    features: [
      {
        title: "Adicionar Despesa",
        description:
          "Em Lançamentos, clique em 'Nova Despesa'. Escolha categoria, data, valor e forma de pagamento.",
      },
      {
        title: "Categorias de Despesa",
        description:
          "Combustível, Manutenção, Pedágio, Alimentação, Lavagem, Estacionamento, Multas, Outros.",
      },
      {
        title: "Pagamento em Cartão",
        description:
          "Se pagar no cartão de crédito, selecione qual cartão e o número de parcelas. O sistema divide automaticamente.",
      },
      {
        title: "Controle de Combustível",
        description:
          "Na página de Combustível, registre abastecimentos com litros, valor e KM. O sistema calcula consumo médio.",
      },
      {
        title: "Manutenções Programadas",
        description:
          "Cadastre manutenções (troca de óleo, pneus, etc) com KM atual e próxima troca. Receba alertas quando estiver próximo.",
      },
      {
        title: "Alertas de Manutenção",
        description:
          "Quando faltam poucos KM para uma manutenção, um alerta aparece no Dashboard e na página de Manutenção.",
      },
    ],
    rules: [
      "Despesas em vermelho indicam impacto negativo no lucro.",
      "Manutenções com status 'Crítico' estão vencidas ou muito próximas.",
    ],
    tips: [
      { text: "Registre até pequenas despesas - elas somam no fim do mês." },
      { text: "Mantenha a quilometragem atualizada para alertas precisos de manutenção." },
    ],
  },

  // 8. DESPESAS FIXAS
  {
    id: "despesas-fixas",
    title: "Despesas Fixas",
    icon: Repeat,
    description:
      "Cadastre despesas que se repetem mensalmente: aluguel do carro, seguro, financiamento, plano de celular, etc.",
    features: [
      {
        title: "Cadastrar Despesa Fixa",
        description:
          "Informe nome, valor mensal e data de início. O sistema divide automaticamente o valor por 30 dias para cálculo diário.",
      },
      {
        title: "Impacto no Lucro",
        description:
          "Despesas fixas são deduzidas automaticamente do lucro diário/semanal/mensal nos relatórios.",
      },
      {
        title: "Ativar/Desativar",
        description:
          "Use o toggle para pausar temporariamente uma despesa sem excluí-la.",
      },
      {
        title: "Data de Término",
        description:
          "Para despesas com prazo (financiamento), defina uma data final. Após essa data, ela para de ser contabilizada.",
      },
    ],
    tips: [
      { text: "Inclua TODAS as despesas fixas para ter uma visão real do lucro." },
      { text: "Revise mensalmente para remover despesas que não existem mais." },
    ],
  },

  // 9. COMPETIÇÕES - SEÇÃO COMPLETA
  {
    id: "competicoes",
    title: "Competições",
    icon: Trophy,
    description:
      "Participe de competições de receita contra outros motoristas. Bata a meta, tenha a maior receita e ganhe prêmios!",
    features: [
      {
        title: "O que são Competições",
        description:
          "Competições são desafios de RECEITA onde você compete com outros motoristas. Quem faturar mais dentro do período, ou bater a meta, ganha o prêmio.",
      },
      {
        title: "Como Entrar",
        description:
          "Para entrar em uma competição, você precisa do Código + Senha fornecidos pelo criador (host). Não existe entrada por link.",
      },
      {
        title: "Aba 'Disponíveis'",
        description:
          "Mostra competições públicas que você ainda não participa. Você pode entrar em qualquer uma que ainda não começou ou está em andamento.",
      },
      {
        title: "Aba 'Minhas'",
        description:
          "Mostra competições que você criou + competições que você está participando. Aqui você acompanha seu progresso.",
      },
      {
        title: "Aba 'Finalizadas'",
        description:
          "Competições encerradas (após o último dia às 23:59). Veja o resultado final e os vencedores.",
      },
      {
        title: "Individual ou Times",
        description:
          "Competições podem ser individuais (cada um por si) ou em times (grupos competem entre si).",
      },
      {
        title: "Compromisso de Transparência",
        description:
          "Ao entrar, você aceita o compromisso de transparência (checkbox obrigatório). Isso garante fair play.",
      },
      {
        title: "Cadastrar Chave PIX",
        description:
          "Ao entrar, você informa sua Chave PIX e Tipo (CPF, Email, Telefone, Aleatória). Isso é necessário para receber o prêmio caso ganhe.",
      },
      {
        title: "Ranking",
        description:
          "Dentro da competição, veja o ranking em tempo real com a receita de cada participante (ou time).",
      },
      {
        title: "Progresso da Meta",
        description:
          "A barra de progresso mostra quanto da meta da competição você já atingiu.",
      },
    ],
    rules: [
      "A competição só encerra no último dia às 23:59:59.",
      "Apenas receitas lançadas DENTRO do período da competição contam para o ranking.",
      "Receitas lançadas após o término NÃO são contabilizadas.",
      "O vencedor é quem tem a maior receita E bateu a meta (se houver).",
      "Se ninguém bater a meta, não há vencedor.",
    ],
    commonErrors: [
      {
        error: "Minha receita não aparece no ranking",
        solution: "Verifique se a data do lançamento está dentro do período da competição.",
      },
      {
        error: "Não consigo entrar na competição",
        solution: "Confirme o código e senha com o host. Verifique se a competição ainda aceita participantes.",
      },
    ],
    tips: [
      { text: "Lance suas receitas diariamente para manter o ranking atualizado." },
      { text: "Mantenha sua chave PIX atualizada para receber prêmios." },
      { text: "Acompanhe o ranking para saber sua posição." },
    ],
  },

  // 10. MENSAGENS DE COMPETIÇÃO
  {
    id: "mensagens-notificacoes",
    title: "Mensagens e Notificações",
    icon: Bell,
    description:
      "O sistema envia mensagens automáticas sobre competições: vitória, derrota, meta não batida e instruções para hosts.",
    features: [
      {
        title: "Mensagem de Vencedor (Individual)",
        description:
          "\"Parabéns! Você ganhou a competição! Você vai receber R$ X. O host da competição vai entrar em contato para combinar o pagamento do prêmio.\"",
      },
      {
        title: "Mensagem de Vencedor (Time)",
        description:
          "\"Seu time ganhou a competição! Você vai receber R$ X (prêmio dividido entre os membros do time). O host vai entrar em contato...\"",
      },
      {
        title: "Mensagem de Perdedor",
        description:
          "Quando outro participante/time vence, você recebe uma mensagem informando quem ganhou e incentivo para próximas competições.",
      },
      {
        title: "Meta Não Batida",
        description:
          "Se ninguém atingir a meta, todos recebem: \"A competição terminou, mas ninguém atingiu a meta. Não houve vencedor desta vez.\"",
      },
      {
        title: "Mensagem para o Host",
        description:
          "O criador da competição recebe lista dos ganhadores com: Nome, WhatsApp, Chave PIX e valor a pagar cada um.",
      },
      {
        title: "Marcar como Lida",
        description:
          "Clique em 'Marcar como lida' ou no X para fechar. A mensagem não reaparece após marcada.",
      },
    ],
    rules: [
      "Mensagens marcadas como lidas não reaparecem.",
      "O host é responsável por entrar em contato e realizar o pagamento.",
    ],
    tips: [
      { text: "Verifique suas notificações após o fim de cada competição." },
    ],
  },

  // 11. ASSINATURA E PLANOS
  {
    id: "assinatura",
    title: "Assinatura e Planos",
    icon: Crown,
    description:
      "O New Gestão é um SaaS com planos de assinatura. Gerencie seu plano na página de Assinatura.",
    features: [
      {
        title: "Plano Mensal",
        description:
          "R$ 39,90 por mês. Renovação automática. Acesso completo a todas as funcionalidades.",
      },
      {
        title: "Plano Trimestral",
        description:
          "R$ 89,70 por trimestre (3 meses). Parcelado em 3x de R$ 32,01. Mais popular!",
      },
      {
        title: "Plano Anual",
        description:
          "R$ 297,90 por ano. Parcelado em 12x de R$ 30,81. Melhor custo-benefício!",
      },
      {
        title: "Ver Plano Atual",
        description:
          "Na página de Assinatura, veja qual plano você está usando, status e data de renovação.",
      },
      {
        title: "Alterar Plano",
        description:
          "Clique no botão do plano desejado para ser redirecionado à página de checkout da Kiwify.",
      },
      {
        title: "Dias Restantes",
        description:
          "No menu lateral, veja quantos dias faltam para a renovação da sua assinatura.",
      },
    ],
    tips: [
      { text: "Planos mais longos oferecem economia significativa." },
      { text: "Se sua assinatura vencer, você verá um paywall até renovar." },
    ],
  },

  // 12. SEGURANÇA E REGRAS
  {
    id: "seguranca",
    title: "Segurança e Regras",
    icon: Shield,
    description:
      "Entenda as regras de segurança e privacidade do New Gestão.",
    features: [
      {
        title: "Seus Dados são Seus",
        description:
          "Apenas você tem acesso aos seus dados financeiros. Nem mesmo administradores podem ver seus lançamentos detalhados.",
      },
      {
        title: "Dados em Competições",
        description:
          "Em competições, apenas o TOTAL de receita é compartilhado no ranking. Detalhes (por plataforma, despesas) são privados.",
      },
      {
        title: "Chave PIX",
        description:
          "Sua chave PIX só é visível para o host da competição, e somente quando você ganha.",
      },
      {
        title: "WhatsApp",
        description:
          "Seu WhatsApp é usado apenas para contato sobre competições (prêmios, avisos).",
      },
    ],
    tips: [
      { text: "Use uma senha forte e não compartilhe com ninguém." },
    ],
  },

  // 13. PADRÃO VISUAL
  {
    id: "visual",
    title: "Padrão Visual",
    icon: Palette,
    description:
      "Entenda as cores e indicadores visuais usados no sistema.",
    features: [
      {
        title: "Fundo Escuro",
        description:
          "O New Gestão usa tema escuro para conforto visual, especialmente à noite.",
      },
      {
        title: "Verde = Positivo",
        description:
          "Lucros, receitas, metas batidas e indicadores positivos aparecem em verde.",
      },
      {
        title: "Vermelho = Negativo",
        description:
          "Despesas, prejuízos, metas não batidas e alertas aparecem em vermelho.",
      },
      {
        title: "Azul = Ações",
        description:
          "Botões, links e elementos de ação usam azul escuro como cor principal.",
      },
      {
        title: "Cores de Plataforma",
        description:
          "Cada plataforma tem sua cor nos gráficos. Você pode personalizar em Configurações.",
      },
    ],
  },

  // 14. FAQ
  {
    id: "faq",
    title: "FAQ e Solução de Problemas",
    icon: HelpCircle,
    description:
      "Respostas para as dúvidas mais comuns e soluções para problemas frequentes.",
    features: [
      {
        title: "Como recuperar minha senha?",
        description:
          "Na tela de login, clique em 'Esqueci minha senha'. Um link de recuperação será enviado para seu email.",
      },
      {
        title: "Posso usar em mais de um dispositivo?",
        description:
          "Sim! Faça login com seu email e senha em qualquer navegador. Seus dados sincronizam automaticamente.",
      },
      {
        title: "Por que minha receita não aparece?",
        description:
          "Verifique se a data do lançamento está correta e dentro do período selecionado no filtro.",
      },
      {
        title: "Como excluir um lançamento?",
        description:
          "Na lista de lançamentos, clique no ícone de lixeira ao lado do item que deseja excluir.",
      },
      {
        title: "Posso exportar meus dados?",
        description:
          "Atualmente não há função de exportação. Esta funcionalidade está em desenvolvimento.",
      },
      {
        title: "O app funciona offline?",
        description:
          "Não, o New Gestão precisa de conexão com internet para funcionar.",
      },
    ],
    commonErrors: [
      {
        error: "Tela branca após login",
        solution: "Limpe o cache do navegador e faça login novamente.",
      },
      {
        error: "Dados não carregam",
        solution: "Verifique sua conexão com internet. Tente recarregar a página.",
      },
      {
        error: "Erro ao salvar lançamento",
        solution: "Verifique se todos os campos obrigatórios estão preenchidos corretamente.",
      },
    ],
    tips: [
      { text: "Para suporte, envie email para newgestao.contato@outlook.com" },
    ],
  },
];

/**
 * Texto de introdução do guia
 */
export const GUIDE_INTRO = {
  title: "Bem-vindo ao New Gestão",
  subtitle: "Guia Completo da Plataforma",
  description:
    "Este é o manual oficial do New Gestão. Aqui você encontra explicações detalhadas sobre cada funcionalidade, regras importantes e soluções para problemas comuns. Use o menu lateral para navegar entre as seções.",
};
