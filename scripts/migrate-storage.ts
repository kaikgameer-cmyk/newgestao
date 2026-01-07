/**
 * Script de Migração de Storage - New Gestão
 * 
 * Este script copia todos os arquivos de um projeto Supabase para outro,
 * preservando a estrutura de pastas.
 * 
 * Uso:
 *   1. Preencha as credenciais abaixo
 *   2. Execute: npx ts-node scripts/migrate-storage.ts
 * 
 * IMPORTANTE: Use SERVICE_ROLE_KEY (não anon key) para ter acesso completo
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// CONFIGURAÇÃO - PREENCHER ANTES DE EXECUTAR
// ============================================================

const CONFIG = {
  source: {
    url: 'https://bvondnxrfqizehlrcyhm.supabase.co',
    serviceKey: 'COLOQUE_SUA_SERVICE_ROLE_KEY_ORIGEM_AQUI'
  },
  destination: {
    url: 'https://SEU-PROJECT-ID.supabase.co',
    serviceKey: 'COLOQUE_SUA_SERVICE_ROLE_KEY_DESTINO_AQUI'
  },
  buckets: ['avatars', 'support-attachments'],
  rateLimitMs: 100, // Delay entre operações para evitar throttling
  dryRun: false // Se true, apenas lista arquivos sem copiar
};

// ============================================================
// IMPLEMENTAÇÃO
// ============================================================

interface MigrationStats {
  bucket: string;
  totalFiles: number;
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

class StorageMigrator {
  private sourceClient: SupabaseClient;
  private destClient: SupabaseClient;
  private stats: MigrationStats[] = [];

  constructor() {
    // Validar configuração
    if (CONFIG.source.serviceKey.includes('COLOQUE')) {
      throw new Error('❌ Configure a SERVICE_ROLE_KEY do projeto ORIGEM');
    }
    if (CONFIG.destination.serviceKey.includes('COLOQUE') || CONFIG.destination.url.includes('SEU-PROJECT-ID')) {
      throw new Error('❌ Configure as credenciais do projeto DESTINO');
    }

    this.sourceClient = createClient(CONFIG.source.url, CONFIG.source.serviceKey, {
      auth: { persistSession: false }
    });

    this.destClient = createClient(CONFIG.destination.url, CONFIG.destination.serviceKey, {
      auth: { persistSession: false }
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async listAllFiles(bucket: string, path = ''): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const { data, error } = await this.sourceClient.storage
        .from(bucket)
        .list(path, { 
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (error) {
        console.error(`  ⚠️  Erro ao listar ${bucket}/${path}: ${error.message}`);
        return files;
      }
      
      for (const item of data || []) {
        const fullPath = path ? `${path}/${item.name}` : item.name;
        
        // item.id === null indica que é uma pasta
        if (item.id === null) {
          const subFiles = await this.listAllFiles(bucket, fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (err) {
      console.error(`  ⚠️  Exceção ao listar ${bucket}/${path}:`, err);
    }
    
    return files;
  }

  private async checkFileExists(bucket: string, filePath: string): Promise<boolean> {
    try {
      const { data } = await this.destClient.storage
        .from(bucket)
        .list(filePath.split('/').slice(0, -1).join('/'), {
          limit: 1,
          search: filePath.split('/').pop()
        });
      
      return (data?.length || 0) > 0;
    } catch {
      return false;
    }
  }

  private async migrateFile(bucket: string, filePath: string, stats: MigrationStats): Promise<void> {
    try {
      // Verificar se já existe no destino
      const exists = await this.checkFileExists(bucket, filePath);
      if (exists) {
        console.log(`  ⏭️  Já existe: ${filePath}`);
        stats.skipped++;
        return;
      }

      if (CONFIG.dryRun) {
        console.log(`  🔍 [DRY-RUN] Migraria: ${filePath}`);
        return;
      }

      // Download do arquivo
      const { data: fileData, error: downloadError } = await this.sourceClient.storage
        .from(bucket)
        .download(filePath);
      
      if (downloadError) {
        const errorMsg = `Download falhou: ${filePath} - ${downloadError.message}`;
        console.error(`  ❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
        stats.failed++;
        return;
      }

      if (!fileData) {
        const errorMsg = `Arquivo vazio: ${filePath}`;
        console.error(`  ❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
        stats.failed++;
        return;
      }

      // Upload para destino
      const { error: uploadError } = await this.destClient.storage
        .from(bucket)
        .upload(filePath, fileData, {
          upsert: true,
          contentType: fileData.type || 'application/octet-stream'
        });
      
      if (uploadError) {
        const errorMsg = `Upload falhou: ${filePath} - ${uploadError.message}`;
        console.error(`  ❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
        stats.failed++;
        return;
      }
      
      console.log(`  ✅ Migrado: ${filePath} (${this.formatBytes(fileData.size)})`);
      stats.success++;

    } catch (err) {
      const errorMsg = `Exceção: ${filePath} - ${err}`;
      console.error(`  ❌ ${errorMsg}`);
      stats.errors.push(errorMsg);
      stats.failed++;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private async migrateBucket(bucket: string): Promise<MigrationStats> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Bucket: ${bucket}`);
    console.log(`${'='.repeat(60)}`);

    const stats: MigrationStats = {
      bucket,
      totalFiles: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    // Verificar se bucket existe no destino
    const { data: buckets } = await this.destClient.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.id === bucket);
    
    if (!bucketExists) {
      console.log(`  ⚠️  Bucket "${bucket}" não existe no destino. Criando...`);
      
      const { error } = await this.destClient.storage.createBucket(bucket, {
        public: bucket === 'avatars', // avatars é público, support-attachments é privado
        fileSizeLimit: bucket === 'avatars' ? 5 * 1024 * 1024 : 10 * 1024 * 1024
      });
      
      if (error) {
        console.error(`  ❌ Falha ao criar bucket: ${error.message}`);
        stats.errors.push(`Falha ao criar bucket: ${error.message}`);
        return stats;
      }
      console.log(`  ✅ Bucket criado`);
    }

    // Listar todos os arquivos
    console.log(`  📋 Listando arquivos...`);
    const files = await this.listAllFiles(bucket);
    stats.totalFiles = files.length;
    
    if (files.length === 0) {
      console.log(`  ℹ️  Nenhum arquivo encontrado`);
      return stats;
    }

    console.log(`  📊 Encontrados ${files.length} arquivos\n`);

    // Migrar cada arquivo
    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      const progress = `[${i + 1}/${files.length}]`;
      process.stdout.write(`${progress} `);
      
      await this.migrateFile(bucket, filePath, stats);
      await this.delay(CONFIG.rateLimitMs);
    }

    return stats;
  }

  async run(): Promise<void> {
    console.log('\n🚀 MIGRAÇÃO DE STORAGE - New Gestão');
    console.log('='.repeat(60));
    console.log(`📤 Origem:  ${CONFIG.source.url}`);
    console.log(`📥 Destino: ${CONFIG.destination.url}`);
    console.log(`📦 Buckets: ${CONFIG.buckets.join(', ')}`);
    if (CONFIG.dryRun) {
      console.log(`⚠️  MODO DRY-RUN: Nenhum arquivo será copiado`);
    }

    const startTime = Date.now();

    for (const bucket of CONFIG.buckets) {
      const stats = await this.migrateBucket(bucket);
      this.stats.push(stats);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Relatório final
    console.log('\n');
    console.log('='.repeat(60));
    console.log('📊 RELATÓRIO FINAL');
    console.log('='.repeat(60));
    
    let totalFiles = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const stat of this.stats) {
      console.log(`\n📦 ${stat.bucket}:`);
      console.log(`   Total:    ${stat.totalFiles}`);
      console.log(`   ✅ Sucesso: ${stat.success}`);
      console.log(`   ⏭️  Pulados: ${stat.skipped}`);
      console.log(`   ❌ Falhas:  ${stat.failed}`);
      
      if (stat.errors.length > 0) {
        console.log(`   Erros:`);
        stat.errors.slice(0, 5).forEach(e => console.log(`      - ${e}`));
        if (stat.errors.length > 5) {
          console.log(`      ... e mais ${stat.errors.length - 5} erros`);
        }
      }

      totalFiles += stat.totalFiles;
      totalSuccess += stat.success;
      totalFailed += stat.failed;
      totalSkipped += stat.skipped;
    }

    console.log('\n' + '-'.repeat(60));
    console.log(`TOTAL: ${totalFiles} arquivos`);
    console.log(`  ✅ Migrados: ${totalSuccess}`);
    console.log(`  ⏭️  Pulados:  ${totalSkipped}`);
    console.log(`  ❌ Falhas:   ${totalFailed}`);
    console.log(`  ⏱️  Tempo:    ${elapsed}s`);
    console.log('='.repeat(60));

    if (totalFailed > 0) {
      console.log('\n⚠️  Houve falhas. Verifique os erros acima e re-execute se necessário.');
      process.exit(1);
    } else {
      console.log('\n✨ Migração concluída com sucesso!');
    }
  }
}

// Executar
const migrator = new StorageMigrator();
migrator.run().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
