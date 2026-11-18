import { checkDiagnosticsTable } from '../../lib/diagnostics-schema.js';
import { configured, failure, getSession, json, sameOrigin } from '../../lib/auth.js';
const CHAVE = 'T26-3A-72FC-CE8A-AADA-5A53';

export async function onRequest({ request, env }) {
  if (!['GET', 'POST'].includes(request.method)) return json({ ok: false, error: 'method_not_allowed' }, 405, { Allow: 'GET, POST' });
  const sessionUser = await getSession(request, env);
  if (request.method === 'GET') {
    let d1Connected = false;
    let totalRegistros = 0;
    let ultimosRegistros = [];
    if (env.DB) {
      try {
        // Checks the migrated table, not merely D1 binding presence.
        await checkDiagnosticsTable(env.DB);
        if (sessionUser) {
          const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM project_records WHERE user_id = ? AND chave_projeto = ?').bind(sessionUser.user_id, CHAVE).first();
          const records = await env.DB.prepare('SELECT id, user_id, username, conteudo, created_at FROM project_records WHERE user_id = ? AND chave_projeto = ? ORDER BY id DESC LIMIT 10').bind(sessionUser.user_id, CHAVE).all();
          if (records.success === false) throw new Error('Database query failed');
          totalRegistros = Number(count?.total || 0);
          ultimosRegistros = records.results || [];
        }
        d1Connected = true;
      } catch { totalRegistros = 0; ultimosRegistros = []; }
    }
    return json({ ok: true, chave: CHAVE, projectId: 0, projectTitle: 'Painel de diagnóstico', d1Connected,
      discordOAuthConfigured: configured(env), sessionUser, totalRegistros, ultimosRegistros, serverTimestamp: new Date().toISOString() });
  }
  if (!sessionUser) return failure(401, 'unauthenticated', 'Entre com Discord para registrar um diagnóstico.');
  if (!sameOrigin(request)) return failure(403, 'invalid_origin', 'Origem não autorizada.');
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return failure(415, 'invalid_content_type', 'Envie JSON.');
  if (Number(request.headers.get('Content-Length')) > 8192) return failure(413, 'payload_too_large', 'Requisição muito grande.');
  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 8192) return failure(413, 'payload_too_large', 'Requisição muito grande.');
    body = JSON.parse(raw);
  } catch { return failure(400, 'invalid_json', 'JSON inválido.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.conteudo !== 'string'
    || Object.keys(body).some(key => key !== 'conteudo')) return failure(400, 'invalid_payload', 'Informe somente o campo conteudo.');
  const conteudo = body.conteudo.trim();
  if (!conteudo || body.conteudo.length > 500) return failure(400, 'invalid_content', 'O registro deve conter de 1 a 500 caracteres.');
  if (!env.DB) return failure(503, 'database_unavailable', 'Banco de dados indisponível.');
  try {
    const result = await env.DB.prepare('INSERT INTO project_records (user_id, username, chave_projeto, conteudo) VALUES (?, ?, ?, ?)')
      .bind(sessionUser.user_id, sessionUser.username, CHAVE, conteudo).run();
    if (result.success === false) throw new Error('Database write failed');
    return json({ ok: true, saved: true, chave: CHAVE, serverTimestamp: new Date().toISOString() }, 201);
  } catch { return failure(503, 'database_unavailable', 'Não foi possível salvar o registro. Tente novamente.'); }
}
