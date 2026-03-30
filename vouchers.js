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
let voucherIdAtribuir = null; // ID do voucher a atribuir cliente

// =========================================
// MODAL DE CONFIRMAÇÃO PERSONALIZADO
// =========================================
function confirmarModal({ icone = '⚠️', titulo, texto, corBotao = '#c62828', textoBotao = 'Confirmar', onConfirm }) {
  document.getElementById('modal-confirmar-icone').textContent = icone;
  document.getElementById('modal-confirmar-titulo').textContent = titulo;
  document.getElementById('modal-confirmar-texto').textContent = texto;

  const okBtn = document.getElementById('modal-confirmar-ok');
  okBtn.textContent = textoBotao;
  okBtn.style.background = corBotao;
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
    inputData.style.opacity = '0.4';
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
// CRIAR VOUCHER
// =========================================
async function criarVoucher() {
  const nome = document.getElementById('v-nome').value.trim();
  const numero = document.getElementById('v-numero').value.trim();
  const email = document.getElementById('v-email').value.trim();
  const validade = document.getElementById('v-validade').value;
  const desconto = parseInt(document.getElementById('v-desconto').value);

  if (!desconto || desconto < 1 || desconto > 100) {
    alert('Por favor, insira uma percentagem de desconto válida (1–100%).');
    return;
  }

  if (!modoVitalicio && !validade) {
    const confirmar = confirm('Não definiu um prazo de validade. Deseja criar como Vitalício?');
    if (!confirmar) return;
    modoVitalicio = true;
  }

  const btn = document.querySelector('.btn-criar');
  btn.textContent = 'A criar...';
  btn.disabled = true;

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

  btn.textContent = '✨ Criar Voucher';
  btn.disabled = false;

  if (error) {
    alert('Erro ao criar voucher: ' + error.message);
    console.error(error);
    return;
  }

  // Limpar formulário
  document.getElementById('v-nome').value = '';
  document.getElementById('v-numero').value = '';
  document.getElementById('v-email').value = '';
  document.getElementById('v-validade').value = '';
  document.getElementById('v-desconto').value = '';
  if (modoVitalicio) toggleVitalicio(); // reset

  alert(`✅ Voucher criado com sucesso!\nCódigo: ${novoVoucher.codigo}`);
  await carregarVouchers();
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
      `<div class="empty-state"><p>❌</p><p>Erro ao carregar vouchers: ${error.message}</p></div>`;
    return;
  }

  // Verificar e atualizar expirados automaticamente
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  for (const v of data) {
    if (v.estado === 'disponivel' && !v.vitalicio && v.data_validade) {
      const dataVal = new Date(v.data_validade + 'T00:00:00');
      if (dataVal < hoje) {
        // Marca como expirado na BD
        await db.from('vouchers').update({ estado: 'expirado', data_estado_mudado: new Date().toISOString() }).eq('id', v.id);
        v.estado = 'expirado';
        if (!v.data_estado_mudado) v.data_estado_mudado = new Date().toISOString();
      }
    }
  }

  todosVouchers = data;
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
    // Filtro de estado
    if (filtroAtivo !== 'todos' && v.estado !== filtroAtivo) return false;
    // Filtro de pesquisa
    if (termoPesquisa) {
      const matchNome = v.nome_cliente?.toLowerCase().includes(termoPesquisa);
      const matchCodigo = v.codigo?.toLowerCase().includes(termoPesquisa);
      if (!matchNome && !matchCodigo) return false;
    }
    return true;
  });

  if (lista.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>🎫</p><p>Nenhum voucher encontrado.</p></div>`;
    return;
  }

  container.innerHTML = lista.map(v => {
    const nomeStr = v.nome_cliente || '<em style="color:#bbb;">Sem cliente atribuído</em>';
    const descontoStr = v.desconto_percentagem ? `${v.desconto_percentagem}%` : '—';
    const badgeClasse = v.estado === 'disponivel' ? 'badge-disponivel' :
                        v.estado === 'utilizado'  ? 'badge-utilizado'  : 'badge-expirado';
    const badgeLabel  = v.estado === 'disponivel' ? '✅ Disponível' :
                        v.estado === 'utilizado'  ? '❌ Utilizado'   : '⌛ Expirado';

    const ticketClasse = v.estado === 'utilizado' ? 'usado' :
                         v.estado === 'expirado'  ? 'expirado' : '';
    const watermarkLabel = v.estado === 'utilizado' ? 'USADO' : 'EXPIRADO';

    const validadeStr = v.vitalicio ? '♾️ Vitalício' :
      (v.data_validade ? `📅 Válido até: ${formatarData(v.data_validade)}` : '♾️ Vitalício');

    const numStr  = v.numero_cliente ? `📞 ${v.numero_cliente}` : '';
    const emailStr = v.email_cliente  ? `✉️ ${v.email_cliente}`  : '';

    const botoesFooter = v.estado === 'disponivel' ? `
      ${!v.nome_cliente ? `<button class="btn-atribuir" onclick="abrirModalAtribuir('${v.id}')">👤 Atribuir Cliente</button>` : ''}
      <button class="btn-utilizado" onclick="marcarUtilizado('${v.id}')">✔️ Já Utilizado</button>
      <button class="btn-excluir"   onclick="excluirVoucher('${v.id}')">🗑️ Excluir</button>
    ` : `
      <button class="btn-excluir" style="flex:1" onclick="excluirVoucher('${v.id}')">🗑️ Excluir</button>
    `;

    return `
      <div class="ticket ${ticketClasse}" data-label="${watermarkLabel}" data-id="${v.id}">
        <div class="ticket-header">
          <span class="codigo">${v.codigo}</span>
          <span class="badge ${badgeClasse}">${badgeLabel}</span>
        </div>
        <div class="ticket-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div class="cliente-nome">👤 ${nomeStr}</div>
            <div style="background:#fff8e1; border:1px solid #ffe082; border-radius:8px; padding:4px 10px; font-size:1rem; font-weight:900; color:#7a5c00; white-space:nowrap;">${descontoStr} OFF</div>
          </div>
          <div class="ticket-meta">
            ${numStr   ? `<span>${numStr}</span>`   : ''}
            ${emailStr ? `<span>${emailStr}</span>` : ''}
            <span>${validadeStr}</span>
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
  document.querySelectorAll('.filtros-voucher button').forEach(b => b.classList.remove('ativo'));
  document.getElementById(`filtro-${filtro}`)?.classList.add('ativo');
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
    icone: '✔️',
    titulo: 'Marcar como Utilizado',
    texto: 'Tem a certeza que deseja marcar este voucher como já utilizado? Esta ação não pode ser desfeita.',
    corBotao: '#2e7d32',
    textoBotao: '✔️ Confirmar',
    onConfirm: async () => {
      const { error } = await db
        .from('vouchers')
        .update({ estado: 'utilizado', data_estado_mudado: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        alert('Erro ao atualizar voucher: ' + error.message);
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
    alert('Por favor, insira o nome da cliente.');
    return;
  }

  const { error } = await db
    .from('vouchers')
    .update({ nome_cliente: nome })
    .eq('id', voucherIdAtribuir);

  if (error) {
    alert('Erro ao atribuir cliente: ' + error.message);
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
    icone: '🗑️',
    titulo: 'Excluir Voucher',
    texto: 'Tem a certeza que deseja excluir este voucher permanentemente? Esta ação não pode ser desfeita.',
    corBotao: '#c62828',
    textoBotao: '🗑️ Excluir',
    onConfirm: async () => {
      const { error } = await db.from('vouchers').delete().eq('id', id);
      if (error) {
        alert('Erro ao excluir: ' + error.message);
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
    console.log(`🧹 ${count} voucher(s) antigo(s) removidos.`);
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
  }
});
