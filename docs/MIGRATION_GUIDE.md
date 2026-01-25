# Guia de Migração Supabase - New Gestão

Este guia detalha o processo completo de migração do banco de dados e storage do projeto Lovable Cloud para um novo projeto Supabase.

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Extensões Necessárias](#extensões-necessárias)
3. [Migração do Banco de Dados](#migração-do-banco-de-dados)
4. [Migração do Storage](#migração-do-storage)
5. [Atualização das Variáveis de Ambiente](#atualização-das-variáveis-de-ambiente)
6. [Validação e Testes](#validação-e-testes)
7. [Checklist Final](#checklist-final)
8. [Rollback](#rollback)

---

## Pré-requisitos

### Ferramentas necessárias

```bash
# PostgreSQL client (pg_dump, pg_restore)
# macOS
brew install postgresql@15

# Ubuntu/Debian
sudo apt-get install postgresql-client-15

# Windows - baixar de https://www.postgresql.org/download/windows/

# Node.js 18+ (para script de storage)
node --version  # >= 18.0.0

# Supabase CLI (opcional, mas útil)
npm install -g supabase
```

### Informações necessárias

Você precisará das seguintes informações de **AMBOS** os projetos:

| Dado | Projeto ORIGEM (Lovable) | Projeto DESTINO (Novo) |
|------|--------------------------|------------------------|
| Project ID | `bvondnxrfqizehlrcyhm` | `seu-project-id` |
| Database Host | `db.bvondnxrfqizehlrcyhm.supabase.co` | `db.seu-project-id.supabase.co` |
| Database Password | (obter no dashboard Lovable) | (definido ao criar projeto) |
| Anon Key | (atual no .env) | (dashboard do novo projeto) |
| Service Role Key | (obter no dashboard) | (dashboard do novo projeto) |

### Obter credenciais do projeto ORIGEM

1. Acesse o Dashboard Lovable → Settings → Connectors → Lovable Cloud
2. Anote o **Database Password** (ou redefina se não souber)
3. As outras credenciais estão no arquivo `.env`

### Criar projeto DESTINO

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique "New Project"
3. Configure:
   - Nome: `new-gestao-prod` (ou similar)
   - Database Password: **ANOTE EM LOCAL SEGURO**
   - Região: `South America (São Paulo)` - mesma região para menor latência
4. Aguarde provisionamento (~2 min)

---

## Extensões Necessárias

O projeto utiliza as seguintes extensões PostgreSQL. **Habilite-as NO PROJETO DESTINO antes da migração**:

```sql
-- Executar no SQL Editor do projeto DESTINO (Supabase Dashboard)

-- Extensões obrigatórias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Funções criptográficas (bcrypt para senhas)
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Monitoramento (opcional mas recomendado)

-- Verificar extensões ativas
SELECT * FROM pg_extension;
```

### Lista de extensões usadas no projeto

| Extensão | Uso no projeto |
|----------|----------------|
| `uuid-ossp` | `gen_random_uuid()` em todas as PKs |
| `pgcrypto` | `crypt()` e `gen_salt()` para hash de senhas de competições |

---

## Migração do Banco de Dados

### Passo 1: Exportar do projeto ORIGEM

```bash
# Definir variáveis (substituir valores)
export SOURCE_HOST="db.bvondnxrfqizehlrcyhm.supabase.co"
export SOURCE_DB="postgres"
export SOURCE_USER="postgres"
export SOURCE_PASSWORD="SUA_SENHA_ORIGEM"

# Criar diretório para backup
mkdir -p ./migration-backup
cd ./migration-backup

# OPÇÃO A: Dump completo em formato custom (RECOMENDADO)
# Inclui: schema, dados, functions, triggers, views, indexes, RLS policies
PGPASSWORD=$SOURCE_PASSWORD pg_dump \
  --host=$SOURCE_HOST \
  --port=5432 \
  --username=$SOURCE_USER \
  --dbname=$SOURCE_DB \
  --format=custom \
  --verbose \
  --no-owner \
  --no-privileges \
  --exclude-schema='supabase_*' \
  --exclude-schema='_realtime' \
  --exclude-schema='_analytics' \
  --exclude-schema='storage' \
  --exclude-schema='vault' \
  --exclude-schema='pgsodium*' \
  --exclude-schema='graphql*' \
  --exclude-table='auth.users' \
  --exclude-table='auth.identities' \
  --exclude-table='auth.sessions' \
  --exclude-table='auth.refresh_tokens' \
  --exclude-table='auth.mfa_*' \
  --exclude-table='auth.flow_state' \
  --exclude-table='auth.saml_*' \
  --exclude-table='auth.sso_*' \
  --file=newgestao_backup.dump

# OPÇÃO B: Dump em SQL puro (para debug/inspeção)
PGPASSWORD=$SOURCE_PASSWORD pg_dump \
  --host=$SOURCE_HOST \
  --port=5432 \
  --username=$SOURCE_USER \
  --dbname=$SOURCE_DB \
  --format=plain \
  --verbose \
  --no-owner \
  --no-privileges \
  --exclude-schema='supabase_*' \
  --exclude-schema='_realtime' \
  --exclude-schema='_analytics' \
  --exclude-schema='storage' \
  --exclude-schema='vault' \
  --exclude-schema='pgsodium*' \
  --exclude-schema='graphql*' \
  --file=newgestao_backup.sql
```

### Passo 2: Dump separado apenas do schema `public`

```bash
# Schema apenas (sem dados) - útil para setup inicial
PGPASSWORD=$SOURCE_PASSWORD pg_dump \
  --host=$SOURCE_HOST \
  --port=5432 \
  --username=$SOURCE_USER \
  --dbname=$SOURCE_DB \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file=newgestao_schema_only.sql

# Dados apenas (para carregar depois)
PGPASSWORD=$SOURCE_PASSWORD pg_dump \
  --host=$SOURCE_HOST \
  --port=5432 \
  --username=$SOURCE_USER \
  --dbname=$SOURCE_DB \
  --schema=public \
  --data-only \
  --no-owner \
  --no-privileges \
  --file=newgestao_data_only.sql
```

### Passo 3: Importar no projeto DESTINO

```bash
# Definir variáveis do DESTINO
export DEST_HOST="db.SEU-PROJECT-ID.supabase.co"
export DEST_DB="postgres"
export DEST_USER="postgres"
export DEST_PASSWORD="SUA_SENHA_DESTINO"

# IMPORTANTE: Antes de importar, garantir extensões
PGPASSWORD=$DEST_PASSWORD psql \
  --host=$DEST_HOST \
  --port=5432 \
  --username=$DEST_USER \
  --dbname=$DEST_DB \
  -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"

# Restaurar o backup (formato custom)
PGPASSWORD=$DEST_PASSWORD pg_restore \
  --host=$DEST_HOST \
  --port=5432 \
  --username=$DEST_USER \
  --dbname=$DEST_DB \
  --verbose \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  newgestao_backup.dump

# OU restaurar SQL puro
PGPASSWORD=$DEST_PASSWORD psql \
  --host=$DEST_HOST \
  --port=5432 \
  --username=$DEST_USER \
  --dbname=$DEST_DB \
  --file=newgestao_backup.sql
```

### Passo 4: Verificar objetos migrados

```sql
-- Executar no SQL Editor do projeto DESTINO

-- Listar todas as tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Listar todas as functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' ORDER BY routine_name;

-- Listar todas as views
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public';

-- Listar triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Listar policies (RLS)
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Listar indexes
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public';

-- Contar registros em tabelas principais
SELECT 'profiles' as tabela, count(*) FROM profiles
UNION ALL SELECT 'subscriptions', count(*) FROM subscriptions
UNION ALL SELECT 'competitions', count(*) FROM competitions
UNION ALL SELECT 'income_days', count(*) FROM income_days
UNION ALL SELECT 'expenses', count(*) FROM expenses
UNION ALL SELECT 'fuel_logs', count(*) FROM fuel_logs
UNION ALL SELECT 'support_tickets', count(*) FROM support_tickets
UNION ALL SELECT 'announcements', count(*) FROM announcements;
```

### Tabelas esperadas (checklist)

- [ ] `profiles`
- [ ] `subscriptions`
- [ ] `user_roles`
- [ ] `role_audit_log`
- [ ] `platforms`
- [ ] `user_platforms`
- [ ] `expense_categories`
- [ ] `user_expense_categories`
- [ ] `income_days`
- [ ] `income_day_items`
- [ ] `expenses`
- [ ] `fuel_logs`
- [ ] `daily_km_logs`
- [ ] `daily_goals`
- [ ] `daily_work_summary`
- [ ] `work_sessions`
- [ ] `work_session_pauses`
- [ ] `maintenance_records`
- [ ] `maintenance_history`
- [ ] `credit_cards`
- [ ] `credit_card_invoices`
- [ ] `credit_card_transactions`
- [ ] `fixed_bills`
- [ ] `bills_instances`
- [ ] `paid_bills`
- [ ] `recurring_expenses`
- [ ] `competitions`
- [ ] `competition_members`
- [ ] `competition_teams`
- [ ] `competition_team_members`
- [ ] `competition_results`
- [ ] `competition_payouts`
- [ ] `competition_user_popups`
- [ ] `support_tickets`
- [ ] `support_messages`
- [ ] `support_reads`
- [ ] `announcements`
- [ ] `announcement_targets`
- [ ] `announcement_ack`
- [ ] `feedback_campaigns`
- [ ] `feedback_responses`
- [ ] `notifications`
- [ ] `password_tokens`
- [ ] `webhook_logs`

---

## Migração do Storage

### Passo 1: Criar buckets no projeto DESTINO

```sql
-- Executar no SQL Editor do DESTINO

-- Bucket de avatares (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Bucket de anexos de suporte (PRIVADO - corrigido!)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  false, -- PRIVADO!
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
);

-- Policies para avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policies para support-attachments (SEGURAS)
CREATE POLICY "Users can upload support attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'support-attachments'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view support attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_support_access(auth.uid())
  )
);
```

### Passo 2: Script de migração de arquivos

Crie o arquivo `scripts/migrate-storage.ts`:

```typescript
// scripts/migrate-storage.ts
// Executar com: npx ts-node scripts/migrate-storage.ts

import { createClient } from '@supabase/supabase-js';

// CONFIGURAÇÃO - PREENCHER ANTES DE EXECUTAR
const SOURCE_URL = 'https://bvondnxrfqizehlrcyhm.supabase.co';
const SOURCE_SERVICE_KEY = 'SEU_SERVICE_ROLE_KEY_ORIGEM'; // Dashboard Lovable

const DEST_URL = 'https://SEU-PROJECT-ID.supabase.co';
const DEST_SERVICE_KEY = 'SEU_SERVICE_ROLE_KEY_DESTINO'; // Dashboard novo projeto

const BUCKETS_TO_MIGRATE = ['avatars', 'support-attachments'];

// Clientes
const sourceClient = createClient(SOURCE_URL, SOURCE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const destClient = createClient(DEST_URL, DEST_SERVICE_KEY, {
  auth: { persistSession: false }
});

interface StorageFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

async function listAllFiles(bucket: string, path = ''): Promise<string[]> {
  const files: string[] = [];
  
  const { data, error } = await sourceClient.storage
    .from(bucket)
    .list(path, { limit: 1000 });
  
  if (error) {
    console.error(`Erro ao listar ${bucket}/${path}:`, error.message);
    return files;
  }
  
  for (const item of data || []) {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    
    if (item.id === null) {
      // É uma pasta, listar recursivamente
      const subFiles = await listAllFiles(bucket, fullPath);
      files.push(...subFiles);
    } else {
      // É um arquivo
      files.push(fullPath);
    }
  }
  
  return files;
}

async function migrateFile(bucket: string, filePath: string): Promise<boolean> {
  try {
    // Download do arquivo origem
    const { data: fileData, error: downloadError } = await sourceClient.storage
      .from(bucket)
      .download(filePath);
    
    if (downloadError) {
      console.error(`❌ Download falhou: ${bucket}/${filePath}`, downloadError.message);
      return false;
    }
    
    // Upload para destino
    const { error: uploadError } = await destClient.storage
      .from(bucket)
      .upload(filePath, fileData, {
        upsert: true,
        contentType: fileData.type
      });
    
    if (uploadError) {
      console.error(`❌ Upload falhou: ${bucket}/${filePath}`, uploadError.message);
      return false;
    }
    
    console.log(`✅ Migrado: ${bucket}/${filePath}`);
    return true;
  } catch (err) {
    console.error(`❌ Erro em ${bucket}/${filePath}:`, err);
    return false;
  }
}

async function migrateBucket(bucket: string) {
  console.log(`\n📦 Migrando bucket: ${bucket}`);
  console.log('='.repeat(50));
  
  const files = await listAllFiles(bucket);
  console.log(`Encontrados ${files.length} arquivos`);
  
  let success = 0;
  let failed = 0;
  
  for (const filePath of files) {
    const result = await migrateFile(bucket, filePath);
    if (result) success++;
    else failed++;
    
    // Rate limiting para evitar throttling
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Resultado ${bucket}:`);
  console.log(`   ✅ Sucesso: ${success}`);
  console.log(`   ❌ Falha: ${failed}`);
}

async function main() {
  console.log('🚀 Iniciando migração de Storage');
  console.log(`Origem: ${SOURCE_URL}`);
  console.log(`Destino: ${DEST_URL}`);
  
  for (const bucket of BUCKETS_TO_MIGRATE) {
    await migrateBucket(bucket);
  }
  
  console.log('\n✨ Migração de Storage concluída!');
}

main().catch(console.error);
```

### Passo 3: Executar migração

```bash
# Instalar dependências
npm install @supabase/supabase-js typescript ts-node

# Editar o script com suas credenciais
# IMPORTANTE: Usar SERVICE_ROLE_KEY (não anon key)

# Executar
npx ts-node scripts/migrate-storage.ts
```

---

## Atualização das Variáveis de Ambiente

### Arquivo `.env` (desenvolvimento local)

```env
# Projeto NOVO
VITE_SUPABASE_URL="https://SEU-PROJECT-ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ...sua-anon-key..."
VITE_SUPABASE_PROJECT_ID="SEU-PROJECT-ID"

# NÃO colocar service_role no frontend!
```

### Variáveis no Lovable (produção)

1. Vá em **Settings → Environment Variables**
2. Atualize:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

### Edge Functions (se houver)

Para edge functions que usam `SERVICE_ROLE_KEY`:

1. No dashboard Supabase do projeto DESTINO:
   - Settings → API → Service Role Key
2. Configure como secret:
   - Settings → Edge Functions → Add Secret
   - Nome: `SUPABASE_SERVICE_ROLE_KEY`

---

## Validação e Testes

### Testes obrigatórios pós-migração

Execute cada cenário e marque como ✅ ou ❌:

#### Autenticação

- [ ] **Login com email/senha** - usuário existente consegue logar
- [ ] **Signup novo usuário** - registro funciona, email confirmado
- [ ] **Reset de senha** - link de reset funciona
- [ ] **Logout** - sessão é destruída

#### Onboarding

- [ ] **Novo usuário** - fluxo de onboarding aparece
- [ ] **Profile criado** - dados salvos em `profiles`
- [ ] **Plataformas default** - plataformas iniciais criadas

#### Dashboard

- [ ] **Carregar dashboard** - métricas aparecem
- [ ] **Filtros de data** - funcionam corretamente
- [ ] **Timer de trabalho** - inicia/pausa/finaliza

#### Lançamentos

- [ ] **Novo lançamento de corrida** - salva em `income_days` + `income_day_items`
- [ ] **Editar lançamento** - update funciona
- [ ] **Excluir lançamento** - delete funciona
- [ ] **Listar lançamentos** - paginação ok

#### Combustível

- [ ] **Novo abastecimento** - salva em `fuel_logs` + `expenses`
- [ ] **Editar abastecimento** - update sincronizado
- [ ] **Excluir abastecimento** - cascade funciona

#### Despesas

- [ ] **Nova despesa avulsa** - salva em `expenses`
- [ ] **Despesa com cartão** - vincula invoice
- [ ] **Despesas recorrentes** - listagem ok

#### Metas

- [ ] **Criar meta diária** - salva em `daily_goals`
- [ ] **Atualizar meta** - update funciona

#### Suporte (com imagem)

- [ ] **Abrir ticket** - salva em `support_tickets`
- [ ] **Anexar imagem** - upload para `support-attachments`
- [ ] **Visualizar imagem** - URL assinada funciona (não pública!)
- [ ] **Responder ticket (admin)** - permissão ok
- [ ] **Fechar ticket** - status atualiza

#### WhatsApp Bot

- [ ] **Conectar WhatsApp** - credenciais salvas
- [ ] **Testar conexão** - validação funciona
- [ ] **Mensagem duplicada** - não cria draft duplicado
- [ ] **Draft expirado** - resposta SIM rejeitada
- [ ] **Confirmação SIM** - lançamento salvo com source='whatsapp'
- [ ] **Confirmação NÃO** - draft cancelado

#### Admin

- [ ] **Acessar área admin** - role verificada
- [ ] **Ver usuários** - listagem ok
- [ ] **Gerenciar cargos** - add/remove funciona
- [ ] **Criar aviso** - salva em `announcements`
- [ ] **Ver métricas de aviso** - contadores ok

#### Avisos (usuário)

- [ ] **Popup aparece** - após login em rota segura
- [ ] **Clicar OK** - grava ack, não aparece mais
- [ ] **Fechar X** - cooldown de 24h

### Script de validação rápida

```sql
-- Executar no SQL Editor do DESTINO para validar integridade

-- Verificar se RLS está ativo em todas as tabelas
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
-- Esperado: vazio ou apenas views

-- Verificar functions críticas existem
SELECT proname FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
AND proname IN (
  'create_competition',
  'join_competition',
  'finalize_competition',
  'get_competition_dashboard',
  'has_role',
  'has_support_access'
);

-- Verificar triggers
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgnamespace = 'public'::regnamespace;

-- Verificar enum app_role
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype;
```

---

## Checklist Final

### Antes de cortar para produção

- [ ] Backup do projeto ORIGEM feito e guardado
- [ ] Extensões criadas no DESTINO
- [ ] Schema restaurado sem erros
- [ ] Dados restaurados (contagem de linhas confere)
- [ ] Functions/triggers verificados
- [ ] RLS policies aplicadas
- [ ] Storage buckets criados com policies corretas
- [ ] Arquivos de storage migrados
- [ ] Variáveis de ambiente atualizadas
- [ ] **Todos os testes funcionais passaram**

### Corte para produção

1. Coloque app em manutenção (se possível)
2. Faça dump final do ORIGEM
3. Restaure no DESTINO
4. Migre storage final
5. Atualize variáveis de produção
6. Limpe cache do navegador
7. Teste fluxos críticos
8. Libere acesso

---

## Rollback

Caso algo falhe criticamente:

### Reverter variáveis

```env
# Voltar para projeto ORIGEM
VITE_SUPABASE_URL="https://bvondnxrfqizehlrcyhm.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ...key-original..."
VITE_SUPABASE_PROJECT_ID="bvondnxrfqizehlrcyhm"
```

### Manter projeto ORIGEM ativo

- **NÃO delete** o projeto origem por pelo menos 30 dias
- Monitore métricas de uso para confirmar que todos migraram

### Se precisar restaurar dados

```bash
# Restaurar do backup guardado
PGPASSWORD=$SOURCE_PASSWORD pg_restore \
  --host=$SOURCE_HOST \
  --port=5432 \
  --username=$SOURCE_USER \
  --dbname=$SOURCE_DB \
  --clean \
  --if-exists \
  newgestao_backup.dump
```

---

## Troubleshooting

### Erro: "permission denied for schema public"

```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
```

### Erro: "function does not exist"

Verifique se o dump incluiu functions. Restaure apenas functions:

```bash
pg_restore -Fc --section=pre-data --section=post-data backup.dump
```

### Erro: "extension not available"

Algumas extensões precisam ser habilitadas pelo dashboard Supabase (não via SQL).

### RLS bloqueando queries

Verifique se o usuário tem permissões adequadas:

```sql
-- Testar como usuário específico
SET request.jwt.claim.sub = 'user-uuid-aqui';
SET request.jwt.claim.role = 'authenticated';
SELECT * FROM profiles LIMIT 1;
```

---

## Suporte

Em caso de dúvidas sobre a migração:
1. Verifique logs no dashboard Supabase
2. Consulte [documentação oficial](https://supabase.com/docs/guides/platform/migrating-and-upgrading-projects)
3. Abra ticket no suporte Supabase (se tiver plano pago)
