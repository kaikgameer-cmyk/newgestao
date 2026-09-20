// TEMPORARY export function — used once to dump all data for migration, then deleted.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TABLES = [
  "announcement_ack","announcement_targets","announcements","bills_instances",
  "competition_members","competition_payouts","competition_results",
  "competition_team_members","competition_teams","competition_user_popups",
  "competitions","credit_card_invoices","credit_card_transactions","credit_cards",
  "daily_goals","daily_km_logs","daily_work_summary","expense_categories",
  "expenses","feature_flags","feedback_campaigns","feedback_responses",
  "fixed_bills","fuel_logs","income_day_items","income_days","maintenance_history",
  "maintenance_records","notifications","paid_bills","password_tokens","platforms",
  "profiles","rate_limit_attempts","recurring_expenses","revenues","role_audit_log",
  "security_audit_logs","subscriptions","support_messages","support_reads",
  "support_tickets","user_expense_categories","user_platforms","user_roles",
  "webhook_logs","whatsapp_connections","whatsapp_drafts","whatsapp_inbound_messages",
  "whatsapp_outbound_messages","whatsapp_pairing_tokens","work_session_pauses",
  "work_sessions",
];

Deno.serve(async (req) => {
  const token = req.headers.get("x-export-token");
  const expected = Deno.env.get("EXPORT_TOKEN");
  if (!expected || token !== expected) {
    return new Response("forbidden", { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const out: Record<string, unknown> = { tables: {} as Record<string, unknown[]> };
  const tables = out.tables as Record<string, unknown[]>;

  for (const t of TABLES) {
    const rows: unknown[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase.from(t).select("*").range(from, from + 999);
      if (error) return new Response(JSON.stringify({ error: `${t}: ${error.message}` }), { status: 500 });
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
      from += 1000;
    }
    tables[t] = rows;
  }

  // auth users
  const users: unknown[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return new Response(JSON.stringify({ error: `auth: ${error.message}` }), { status: 500 });
    const batch = data?.users ?? [];
    users.push(...batch.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, confirmed_at: u.confirmed_at })));
    if (batch.length < 1000) break;
    page++;
  }
  out.users = users;

  // storage files (base64)
  const storage: unknown[] = [];
  for (const bucket of ["avatars", "support-attachments"]) {
    const { data: files } = await supabase.storage.from(bucket).list("", { limit: 1000 });
    for (const f of files ?? []) {
      if (!f.id) continue; // folder placeholder
      const { data: blob } = await supabase.storage.from(bucket).download(f.name);
      if (blob) {
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        storage.push({ bucket, name: f.name, b64: btoa(bin) });
      }
    }
  }
  out.storage = storage;

  return new Response(JSON.stringify(out), {
    headers: { "content-type": "application/json" },
  });
});
