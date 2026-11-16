// =========================================
// VOUCHERS.JS - Lógica completa de cupões
// =========================================

// --- Inicialização do Supabase ---
if (!window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(
    "https://cixjmwfkfmeedajpmzmp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeGptd2ZrZm1lZWRhanBtem1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzM5ODIsImV4cCI6MjA2OTEwOTk4Mn0.vFvgRMK_oabG19FNauNaBu_CoQTL8QRSXcptyfY6rbM"
  );
}
const db = window.supabaseClient;

// Estado global
let todosVouchers = [];
let filtroAtivo = 'todos';
let modoVitalicio = false;
let voucherIdAtribuir = null;
let cacheClientesVoucher = [];

// Ícones SVG Minimalistas
const SVG_ICONS = {
  check: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  alert: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  trash: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
};

function obterSvgIconeModal(icone) {
  if (!icone) return SVG_ICONS.info;
  if (icone.includes('✔') || icone.includes('✅') || icone.includes('✨') || icone === 'check') return SVG_ICONS.check;
  if (icone.includes('🗑') || icone === 'trash') return SVG_ICONS.trash;
  if (icone.includes('❌') || icone === 'error') return SVG_ICONS.error;
  if (icone.includes('⚠') || icone === 'alert') return SVG_ICONS.alert;
  return SVG_ICONS.info;
}

// =========================================
// POPOVER DE FILTRO NA BARRA DE TOPO
// =========================================
window.toggleFiltroPopover = function(popoverId, event) {
  if (event) event.stopPropagation();
  const pop = document.getElementById(popoverId);
  const btn = document.getElementById('btn-filter-vouchers');
  if (!pop) return;
  const isOpen = pop.classList.contains('aberto');
  document.querySelectorAll('.filter-popover.aberto').forEach(el => el.classList.remove('aberto'));
  document.querySelectorAll('.btn-filter-icon.ativo').forEach(el => el.classList.remove('ativo'));
  if (!isOpen) {
    pop.classList.add('aberto');
    if (btn) btn.classList.add('ativo');
  }
};

document.addEventListener('click', () => {
  document.querySelectorAll('.filter-popover.aberto').forEach(el => el.classList.remove('aberto'));
  document.querySelectorAll('.btn-filter-icon.ativo').forEach(el => el.classList.remove('ativo'));
});

// =========================================
// MODAL CRIAR CUPÃO
// =========================================
function abrirModalCriarVoucher() {
  const modal = document.getElementById('modal-criar-voucher');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('v-nome')?.focus(), 80);
}

function fecharModalCriarVoucher() {
  const modal = document.getElementById('modal-criar-voucher');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
  const drop = document.getElementById('v-sugestoes-clientes');
  if (drop) drop.style.display = 'none';
}

function definirDescontoRapido(valor) {
  const input = document.getElementById('v-desconto');
  if (input) input.value = valor;
}

// =========================================
// AUTOCOMPLETE DE CLIENTES NO MODAL VOUCHER
// =========================================
async function carregarClientesAutocompleteVoucher() {
  try {
    const { data } = await db
      .from('clientes_financas')
      .select('nome, telefone, email')
      .order('nome', { ascending: true });
    if (data) cacheClientesVoucher = data;
  } catch (e) {
    console.warn('Autocomplete clientes voucher:', e);
  }
}

function filtrarSugestoesClienteVoucher(termo) {
  const drop = document.getElementById('v-sugestoes-clientes');
  if (!drop) return;
  const q = (termo || '').trim().toLowerCase();
  if (q.length < 1 || cacheClientesVoucher.length === 0) {
    drop.style.display = 'none';
    return;
  }
  const matches = cacheClientesVoucher
    .filter(c => c.nome && c.nome.toLowerCase().includes(q))
    .slice(0, 6);

  if (matches.length === 0) {
    drop.style.display = 'none';
    return;
  }

  drop.innerHTML = matches.map((c, idx) => `
    <div class="v-sugestao-item" onclick="selecionarClienteVoucher(${idx}, '${(c.nome || '').replace(/'/g, "\\'")}', '${(c.telefone || '').replace(/'/g, "\\'")}', '${(c.email || '').replace(/'/g, "\\'")}')">
      <span style="font-weight:500; color:#1a1a1a;">${c.nome}</span>
      <span style="font-size:0.76rem; color:#888;">${c.telefone || c.email || ''}</span>
    </div>
  `).join('');
  drop.style.display = 'block';
}

function selecionarClienteVoucher(idx, nome, telefone, email) {
  const elNome = document.getElementById('v-nome');
  const elNum = document.getElementById('v-numero');
  const elEmail = document.getElementById('v-email');
  const drop = document.getElementById('v-sugestoes-clientes');

  if (elNome) elNome.value = nome;
  if (elNum && telefone) elNum.value = telefone;
  if (elEmail && email) elEmail.value = email;
  if (drop) drop.style.display = 'none';
}

// =========================================
// MODAL DE CONFIRMAÇÃO PERSONALIZADO
// =========================================
function confirmarModal({ icone = 'alert', titulo, texto, corBotao = '#dc2626', textoBotao = 'Confirmar', onConfirm }) {
  const iconeEl = document.getElementById('modal-confirmar-icone');
  if (iconeEl) iconeEl.innerHTML = obterSvgIconeModal(icone);

  document.getElementById('modal-confirmar-titulo').textContent = titulo;
  document.getElementById('modal-confirmar-texto').textContent = texto;

  const cancelarBtn = document.getElementById('modal-confirmar-cancelar');
  if (cancelarBtn) cancelarBtn.style.display = 'inline-flex';

  const okBtn = document.getElementById('modal-confirmar-ok');
  okBtn.textContent = textoBotao;
  okBtn.style.background = corBotao;
  okBtn.style.borderColor = corBotao;
  okBtn.style.color = '#fff';
  okBtn.onclick = () => {
    fecharModalConfirmar();
    onConfirm();
  };

  document.getElementById('modal-confirmar').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharModalConfirmar() {
  document.getElementById('modal-confirmar').style.display = 'none';
  document.body.style.overflow = 'auto';
}

// =========================================
// MODAL DE ALERTA RÁPIDO
// =========================================
window.alertaModal = function(titulo, texto, icone = 'info') {
  const m = document.getElementById('modal-confirmar');
  if (!m) {
    alert(texto.replace(/<br>/g, '\n').replace(/<[^>]+>/g, ''));
    return;
  }

  const iconeEl = document.getElementById('modal-confirmar-icone');
  if (iconeEl) iconeEl.innerHTML = obterSvgIconeModal(icone);

  document.getElementById('modal-confirmar-titulo').innerHTML = titulo;
  document.getElementById('modal-confirmar-texto').innerHTML = texto;

  const okBtn = document.getElementById('modal-confirmar-ok');
  okBtn.textContent = 'Entendido';
  okBtn.style.background = '#1a1a1a';
  okBtn.style.borderColor = '#1a1a1a';
  okBtn.style.color = '#fff';

  const cancelarBtn = document.getElementById('modal-confirmar-cancelar');
  if (cancelarBtn) cancelarBtn.style.display = 'none';

  okBtn.onclick = () => {
    fecharModalConfirmar();
    if (cancelarBtn) cancelarBtn.style.display = 'inline-flex';
  };

  m.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

// =========================================
// TOGGLE VITALÍCIO
// =========================================
function toggleVitalicio() {
  modoVitalicio = !modoVitalicio;
  const btn = document.getElementById('btn-vitalicio-toggle');
  const inputData = document.getElementById('v-validade');

  if (modoVitalicio) {
    btn.classList.add('active');
    inputData.disabled = true;
    inputData.value = '';
    inputData.style.opacity = '0.45';
  } else {
    btn.classList.remove('active');
    inputData.disabled = false;
    inputData.style.opacity = '1';
  }
}

// =========================================
// GERAR CÓDIGO ÚNICO DO CUPÃO (ex: EVA-4X9K2)
// =========================================
function gerarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'EVA-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// =========================================
// COPIAR CÓDIGO DO VOUCHER
// =========================================
function copiarCodigoVoucher(codigo, btnEl) {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(codigo).then(() => {
    if (!btnEl) return;
    const original = btnEl.innerHTML;
    btnEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    setTimeout(() => { btnEl.innerHTML = original; }, 1400);
  });
}

// =========================================
// CRIAR VOUCHER
// =========================================
async function criarVoucher() {
  const nome = document.getElementById('v-nome').value.trim();
  const numero = document.getElementById('v-numero').value.trim();
  const email = document.getElementById('v-email').value.trim();
  const validade = document.getElementById('v-validade').value;
  const desconto = parseInt(document.getElementById('v-desconto').value);

  if (!desconto || desconto < 1 || desconto > 100) {
    alertaModal('Desconto Inválido', 'Por favor, insira uma percentagem de desconto válida (entre 1% e 100%).', 'alert');
    return;
  }

  if (!modoVitalicio && !validade) {
    modoVitalicio = true;
  }

  const btn = document.querySelector('.btn-criar');
  const htmlOriginal = btn ? btn.innerHTML : 'Criar Cupão';
  if (btn) {
    btn.textContent = 'A criar...';
    btn.disabled = true;
  }

  const novoVoucher = {
    codigo: gerarCodigo(),
    nome_cliente: nome || null,
    numero_cliente: numero || null,
    email_cliente: email || null,
    desconto_percentagem: desconto,
    data_validade: modoVitalicio ? null : validade,
    vitalicio: modoVitalicio,
    estado: 'disponivel',
    criado_em: new Date().toISOString(),
  };

  // Garante código único
  let codigoUnico = false;
  while (!codigoUnico) {
    const { data: existe } = await db.from('vouchers').select('id').eq('codigo', novoVoucher.codigo).single();
    if (!existe) {
      codigoUnico = true;
    } else {
      novoVoucher.codigo = gerarCodigo();
    }
  }

  const { error } = await db.from('vouchers').insert(novoVoucher);

  if (btn) {
    btn.innerHTML = htmlOriginal;
    btn.disabled = false;
  }

  if (error) {
    alertaModal('Erro', 'Erro ao criar cupão: ' + error.message, 'error');
    console.error(error);
    return;
  }

  // Limpar formulário e fechar modal
  document.getElementById('v-nome').value = '';
  document.getElementById('v-numero').value = '';
  document.getElementById('v-email').value = '';
  document.getElementById('v-validade').value = '';
  document.getElementById('v-desconto').value = '';
  if (modoVitalicio) toggleVitalicio();

  fecharModalCriarVoucher();

  alertaModal(
    'Cupão Criado',
    `O cupão de <strong>${desconto}% OFF</strong> foi registado com sucesso.<br><br><span style="font-size:1.15rem; color:#1a1a1a; font-family:monospace; font-weight:700; background:#f3f0ea; border:1px solid #e5e0d5; padding:8px 16px; border-radius:8px; display:inline-block; letter-spacing:1.5px;">${novoVoucher.codigo}</span>`,
    'check'
  );

  await carregarVouchers();
}

// =========================================
// ATUALIZAR KPIS DE VOUCHERS
// =========================================
function atualizarKPIsVouchers() {
  const total = todosVouchers.length;
  const disponiveis = todosVouchers.filter(v => v.estado === 'disponivel').length;
  const utilizados = todosVouchers.filter(v => v.estado === 'utilizado').length;
  const expirados = todosVouchers.filter(v => v.estado === 'expirado').length;

  const elTotal = document.getElementById('kpi-v-total');
  const elDisp = document.getElementById('kpi-v-disponiveis');
  const elUtil = document.getElementById('kpi-v-utilizados');
  const elExp = document.getElementById('kpi-v-expirados');

  if (elTotal) elTotal.textContent = total;
  if (elDisp) elDisp.textContent = disponiveis;
  if (elUtil) elUtil.textContent = utilizados;
  if (elExp) elExp.textContent = expirados;
}

// =========================================
// CARREGAR VOUCHERS
// =========================================
async function carregarVouchers() {
  const { data, error } = await db
    .from('vouchers')
    .select('*')
    .order('criado_em', { ascending: false });

  if (error) {
    document.getElementById('vouchers-lista').innerHTML =
      `<div class="empty-state"><p>Erro ao carregar cupões: ${error.message}</p></div>`;
    return;
  }

  // Verificar e atualizar expirados automaticamente
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  for (const v of data) {
    if (v.estado === 'disponivel' && !v.vitalicio && v.data_validade) {
      const dataVal = new Date(v.data_validade + 'T00:00:00');
      if (dataVal < hoje) {
        await db.from('vouchers').update({ estado: 'expirado', data_estado_mudado: new Date().toISOString() }).eq('id', v.id);
        v.estado = 'expirado';
        if (!v.data_estado_mudado) v.data_estado_mudado = new Date().toISOString();
      }
    }
  }

  todosVouchers = data;
  atualizarKPIsVouchers();
  renderVouchers();
  await limparVouchersAntigos();
}

// =========================================
// RENDERIZAR VOUCHERS
// =========================================
function renderVouchers() {
  const container = document.getElementById('vouchers-lista');
  const termoPesquisa = (document.getElementById('pesquisa-vouchers')?.value || '').toLowerCase();

  let lista = todosVouchers.filter(v => {
    if (filtroAtivo !== 'todos' && v.estado !== filtroAtivo) return false;
    if (termoPesquisa) {
      const matchNome = v.nome_cliente?.toLowerCase().includes(termoPesquisa);
      const matchCodigo = v.codigo?.toLowerCase().includes(termoPesquisa);
      if (!matchNome && !matchCodigo) return false;
    }
    return true;
  });

  if (lista.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        <p style="font-weight:600; color:#444;">Nenhum cupão encontrado</p>
        <p style="font-size:0.82rem; color:#999;">Experimente ajustar os filtros ou clique em "Criar Cupão".</p>
      </div>`;
    return;
  }

  const svgUser = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const svgPhone = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  const svgMail = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
  const svgCalendar = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  const svgInfinity = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/></svg>`;
  const svgCopy = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const svgCheck = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const svgUserPlus = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`;
  const svgTrash = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

  container.innerHTML = lista.map(v => {
    const nomeStr = v.nome_cliente || '<span style="color:#999; font-weight:400;">Sem cliente atribuído</span>';
    const descontoStr = v.desconto_percentagem ? `${v.desconto_percentagem}%` : '—';

    const badgeClasse = v.estado === 'disponivel' ? 'badge-disponivel' :
                        v.estado === 'utilizado'  ? 'badge-utilizado'  : 'badge-expirado';
    const dotClasse   = v.estado === 'disponivel' ? 'dot-green' :
                        v.estado === 'utilizado'  ? 'dot-red'   : 'dot-gray';
    const badgeLabel  = v.estado === 'disponivel' ? 'Disponível' :
                        v.estado === 'utilizado'  ? 'Utilizado'   : 'Expirado';

    const ticketClasse = v.estado === 'utilizado' ? 'usado' :
                         v.estado === 'expirado'  ? 'expirado' : '';

    const validadeHtml = (v.vitalicio || !v.data_validade)
      ? `<span>${svgInfinity} Vitalício</span>`
      : `<span>${svgCalendar} Válido até ${formatarData(v.data_validade)}</span>`;

    const numHtml   = v.numero_cliente ? `<span>${svgPhone} ${v.numero_cliente}</span>` : '';
    const emailHtml = v.email_cliente  ? `<span>${svgMail} ${v.email_cliente}</span>`  : '';

    const botoesFooter = v.estado === 'disponivel' ? `
      ${!v.nome_cliente ? `<button class="btn-ticket-action" onclick="abrirModalAtribuir('${v.id}')">${svgUserPlus} Atribuir</button>` : ''}
      <button class="btn-ticket-action btn-utilizado" onclick="marcarUtilizado('${v.id}')">${svgCheck} Marcar Usado</button>
      <button class="btn-ticket-action btn-excluir" onclick="excluirVoucher('${v.id}')" title="Excluir Cupão">${svgTrash}</button>
    ` : `
      <button class="btn-ticket-action btn-excluir" style="flex:1;" onclick="excluirVoucher('${v.id}')">${svgTrash} Excluir Registo</button>
    `;

    return `
      <div class="ticket ${ticketClasse}" data-id="${v.id}">
        <div class="ticket-header">
          <div class="codigo-wrap">
            <span class="codigo">${v.codigo}</span>
            <button type="button" class="btn-copiar-codigo" onclick="copiarCodigoVoucher('${v.codigo}', this)" title="Copiar código">
              ${svgCopy}
            </button>
          </div>
          <span class="badge-status ${badgeClasse}">
            <span class="status-dot ${dotClasse}"></span>
            ${badgeLabel}
          </span>
        </div>
        <div class="ticket-body">
          <div class="ticket-main-row">
            <div class="cliente-nome">${svgUser} <span>${nomeStr}</span></div>
            <div class="desconto-pill">${descontoStr} OFF</div>
          </div>
          <div class="ticket-meta">
            ${numHtml}
            ${emailHtml}
            ${validadeHtml}
          </div>
        </div>
        <div class="ticket-footer">
          ${botoesFooter}
        </div>
      </div>
    `;
  }).join('');
}

// =========================================
// FILTROS
// =========================================
function aplicarFiltro(filtro) {
  filtroAtivo = filtro;

  // Atualiza pills no popover
  document.querySelectorAll('.vouchers-filter-pills button').forEach(b => b.classList.remove('ativo'));
  document.getElementById(`filtro-${filtro}`)?.classList.add('ativo');

  // Atualiza KPI cards
  document.querySelectorAll('.v-kpi-card').forEach(c => c.classList.remove('ativo'));
  document.getElementById(`kpi-card-${filtro}`)?.classList.add('ativo');

  // Indicador de filtro ativo no botão da barra
  const btnFilter = document.getElementById('btn-filter-vouchers');
  if (btnFilter) {
    btnFilter.classList.toggle('tem-filtro', filtro !== 'todos');
  }

  renderVouchers();
}

function filtrarVouchers() {
  renderVouchers();
}

// =========================================
// MARCAR COMO UTILIZADO
// =========================================
async function marcarUtilizado(id) {
  confirmarModal({
    icone: 'check',
    titulo: 'Marcar como Utilizado',
    texto: 'Confirma que este cupão já foi utilizado? Esta ação não pode ser desfeita.',
    corBotao: '#15803d',
    textoBotao: 'Confirmar Uso',
    onConfirm: async () => {
      const { error } = await db
        .from('vouchers')
        .update({ estado: 'utilizado', data_estado_mudado: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        alertaModal('Erro', 'Erro ao atualizar cupão: ' + error.message, 'error');
        return;
      }
      await carregarVouchers();
    }
  });
}

// =========================================
// ATRIBUIR CLIENTE A VOUCHER SEM NOME
// =========================================
function abrirModalAtribuir(id) {
  voucherIdAtribuir = id;
  document.getElementById('modal-nome-cliente').value = '';
  document.getElementById('modal-atribuir').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('modal-nome-cliente').focus(), 100);
}

function fecharModalAtribuir() {
  voucherIdAtribuir = null;
  document.getElementById('modal-atribuir').style.display = 'none';
  document.body.style.overflow = 'auto';
}

async function salvarAtribuicao() {
  const nome = document.getElementById('modal-nome-cliente').value.trim();
  if (!nome) {
    alertaModal('Atenção', 'Por favor, insira o nome da cliente.', 'alert');
    return;
  }

  const { error } = await db
    .from('vouchers')
    .update({ nome_cliente: nome })
    .eq('id', voucherIdAtribuir);

  if (error) {
    alertaModal('Erro', 'Erro ao atribuir cliente: ' + error.message, 'error');
    return;
  }

  fecharModalAtribuir();
  await carregarVouchers();
}

// =========================================
// EXCLUIR VOUCHER
// =========================================
async function excluirVoucher(id) {
  confirmarModal({
    icone: 'trash',
    titulo: 'Excluir Cupão',
    texto: 'Tem a certeza que deseja eliminar este cupão permanentemente?',
    corBotao: '#dc2626',
    textoBotao: 'Excluir',
    onConfirm: async () => {
      const { error } = await db.from('vouchers').delete().eq('id', id);
      if (error) {
        alertaModal('Erro', 'Erro ao excluir: ' + error.message, 'error');
        return;
      }
      await carregarVouchers();
    }
  });
}

// =========================================
// LIMPEZA AUTOMÁTICA (30 dias após uso/expiração)
// =========================================
async function limparVouchersAntigos() {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - 30);
  const dataStr = dataLimite.toISOString();

  const { error, count } = await db
    .from('vouchers')
    .delete({ count: 'exact' })
    .in('estado', ['utilizado', 'expirado'])
    .lt('data_estado_mudado', dataStr);

  if (!error && count > 0) {
    console.log(`${count} voucher(s) antigo(s) removidos.`);
  }
}

// =========================================
// BUSCAR VOUCHER POR CÓDIGO OU NOME (usado externamente em adicionar-pedido)
// =========================================
async function buscarVoucher(termo) {
  if (!termo || termo.trim() === '') return null;

  const termoLimpo = termo.trim().toUpperCase();

  // Tenta pelo código
  const { data: porCodigo } = await db
    .from('vouchers')
    .select('*')
    .eq('codigo', termoLimpo)
    .eq('estado', 'disponivel')
    .single();

  if (porCodigo) return porCodigo;

  // Tenta pelo nome (case insensitive)
  const { data: porNome } = await db
    .from('vouchers')
    .select('*')
    .ilike('nome_cliente', `%${termo.trim()}%`)
    .eq('estado', 'disponivel')
    .limit(1)
    .single();

  return porNome || null;
}

// =========================================
// FORMATAR DATA
// =========================================
function formatarData(dataStr) {
  if (!dataStr) return '-';
  const d = new Date(dataStr + 'T00:00:00');
  return d.toLocaleDateString('pt-PT');
}

// =========================================
// INICIALIZAÇÃO
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('vouchers-lista')) {
    carregarVouchers();
    carregarClientesAutocompleteVoucher();
  }
});
