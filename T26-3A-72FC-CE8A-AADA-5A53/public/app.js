'use strict';
const $ = (id) => document.getElementById(id);
let environment = null;
let busy = false;
let refreshing = false;

function status(id, text, state) {
  $(id).textContent = text;
  $(id).dataset.state = state;
}
function feedback(text, error = false) {
  $('statusMessage').textContent = text;
  $('statusMessage').classList.toggle('error', error);
}
function updateControls() {
  const ready = Boolean(environment?.sessionUser && environment?.d1Connected);
  $('recordInput').disabled = !ready || busy;
  $('sendBtn').disabled = !ready || busy || refreshing || !$('recordInput').value.trim();
  $('logoutBtn').disabled = busy || refreshing;
  $('refreshBtn').disabled = busy || refreshing;
  $('sendBtn').textContent = busy ? 'Gravando…' : 'Gravar no banco →';
  $('characterCount').textContent = `${$('recordInput').value.length} / 500 caracteres`;
}
function emptyRecords(text) {
  const li = document.createElement('li');
  li.className = 'empty-state';
  li.textContent = text;
  $('recordsList').replaceChildren(li);
}
function render(data) {
  const user = data.sessionUser;
  status('apiStatus', 'Disponível', 'ok');
  status('dbStatus', data.d1Connected ? 'Conectado' : 'Indisponível', data.d1Connected ? 'ok' : 'error');
  status('oauthStatus', data.discordOAuthConfigured ? 'Configurado' : 'Configuração pendente', data.discordOAuthConfigured ? 'ok' : 'pending');
  status('sessionStatus', user ? 'Autenticada' : 'Não autenticada', user ? 'ok' : 'pending');
  $('discordProfile').hidden = !user;
  $('logoutBtn').hidden = !user;
  $('discordLoginLink').hidden = Boolean(user) || !data.discordOAuthConfigured;
  if (user) {
    $('discordUserText').textContent = user.username;
    $('discordUserId').textContent = user.user_id;
    const avatar = typeof user.avatar === 'string' && /^https:\/\/cdn\.discordapp\.com\//.test(user.avatar) ? user.avatar : '';
    $('discordAvatar').hidden = !avatar;
    if (avatar) $('discordAvatar').src = avatar;
    else $('discordAvatar').removeAttribute('src');
  }
  $('formHint').textContent = !data.d1Connected ? 'O banco está indisponível. A gravação ficará disponível quando a conexão for confirmada.' : !user ? 'Entre com Discord para gravar e consultar os seus registros.' : 'Esta nota será vinculada à sua conta e à chave de teste do projeto.';
  $('diagnosticNote').textContent = `Última consulta: ${new Date().toLocaleTimeString('pt-BR')}. ${data.d1Connected && data.discordOAuthConfigured ? 'Serviços configurados. A gravação abaixo permite testar a persistência.' : 'Há configurações pendentes; o ambiente ainda não está pronto.'}`;
  $('recordCount').textContent = user && data.d1Connected ? String(Number(data.totalRegistros) || 0) : '—';
  const records = Array.isArray(data.ultimosRegistros) ? data.ultimosRegistros : [];
  if (!data.d1Connected) emptyRecords('Não foi possível consultar os registros no banco.');
  else if (!user) emptyRecords('Entre com Discord para visualizar seu histórico.');
  else if (!records.length) emptyRecords('Nenhuma nota ainda. Seu primeiro teste começa ao lado.');
  else {
    const items = records.map((record) => {
      const li = document.createElement('li');
      const content = document.createElement('p');
      content.className = 'record-content';
      content.textContent = record.conteudo;
      const meta = document.createElement('div');
      meta.className = 'record-meta';
      const author = document.createElement('span');
      author.textContent = record.username || user.username;
      const time = document.createElement('time');
      const raw = String(record.created_at || '');
      const date = new Date(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(raw) ? raw.replace(' ', 'T') + 'Z' : raw);
      if (!Number.isNaN(date.getTime())) { time.dateTime = date.toISOString(); time.textContent = date.toLocaleString('pt-BR'); }
      else time.textContent = 'Data indisponível';
      meta.append(author, time);
      li.append(content, meta);
      return li;
    });
    $('recordsList').replaceChildren(...items);
  }
}
async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {credentials: 'same-origin', cache: 'no-store', ...options, signal: controller.signal});
    const data = response.status === 204 ? {ok: true} : await response.json();
    if (!response.ok || data.ok === false) {
      if (response.status === 401) throw new Error('Sua sessão expirou. Entre novamente com Discord.');
      if (response.status === 503) throw new Error('O serviço está indisponível. Confira a configuração e tente novamente.');
      if (response.status === 403) throw new Error('A solicitação não foi autorizada. Atualize a página e tente novamente.');
      if (response.status === 400) throw new Error('Confira a mensagem: ela deve conter entre 1 e 500 caracteres.');
      throw new Error('Não foi possível concluir a solicitação. Tente novamente.');
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('O servidor demorou para responder. Atualize o diagnóstico.');
    if (error instanceof SyntaxError || error instanceof TypeError) throw new Error('Não foi possível conectar à API. Verifique a publicação do ambiente.');
    throw error;
  } finally { clearTimeout(timer); }
}
async function loadStatus() {
  if (refreshing) return;
  refreshing = true;
  updateControls();
  try {
    const data = await request('/api/status');
    if (typeof data.d1Connected !== 'boolean' || typeof data.discordOAuthConfigured !== 'boolean') throw new Error('A API retornou um diagnóstico inesperado.');
    environment = data;
    render(data);
  } catch (error) {
    environment = null;
    status('apiStatus', 'Não confirmada', 'error');
    ['dbStatus', 'oauthStatus', 'sessionStatus'].forEach((id) => status(id, 'Não verificado', 'pending'));
    $('discordProfile').hidden = true;
    $('discordLoginLink').hidden = true;
    $('logoutBtn').hidden = true;
    $('diagnosticNote').textContent = error.message;
    $('formHint').textContent = 'A gravação está bloqueada até que o ambiente possa ser verificado.';
    $('recordCount').textContent = '—';
    emptyRecords('Histórico indisponível. Use “Atualizar diagnóstico” para tentar novamente.');
  } finally { refreshing = false; updateControls(); }
}
$('recordInput').addEventListener('input', updateControls);
$('refreshBtn').addEventListener('click', loadStatus);
$('recordForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy || refreshing || !environment?.sessionUser || !environment?.d1Connected) return;
  const conteudo = $('recordInput').value.trim();
  if (!conteudo || conteudo.length > 500) { feedback('Digite uma mensagem entre 1 e 500 caracteres.', true); return; }
  busy = true;
  feedback('Enviando a nota ao banco…');
  updateControls();
  try {
    const result = await request('/api/status', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({conteudo})});
    if (result.saved !== true) throw new Error('O servidor não confirmou a gravação. Sua mensagem foi mantida para uma nova tentativa.');
    $('recordInput').value = '';
    feedback('Nota gravada. Atualize a página para verificar que ela permanece no histórico.');
  } catch (error) { feedback(error.message, true); }
  finally { busy = false; await loadStatus(); updateControls(); }
});
$('logoutBtn').addEventListener('click', async () => {
  if (busy || refreshing) return;
  busy = true;
  updateControls();
  try {
    await request('/api/auth/logout', {method: 'POST'});
    $('recordInput').value = '';
    feedback('Você saiu da conta.');
  } catch (error) { feedback(error.message, true); }
  finally { busy = false; await loadStatus(); }
});
if (new URLSearchParams(location.search).has('auth_error')) {
  feedback('O login não foi concluído. Atualize o diagnóstico e tente entrar novamente com Discord.', true);
  history.replaceState(null, '', location.pathname);
}
loadStatus();
