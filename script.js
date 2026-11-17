// ==========================================
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO (BLINDADA)
// ==========================================

// 1. Verifica se o cliente já foi criado anteriormente (para evitar o erro "already declared")
if (!window.supabaseClient) {
  const _supabase = window.supabase;
  // Cria e guarda no "window" (memória global do navegador)
  window.supabaseClient = _supabase.createClient(
    "https://cixjmwfkfmeedajpmzmp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeGptd2ZrZm1lZWRhanBtem1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzM5ODIsImV4cCI6MjA2OTEwOTk4Mn0.vFvgRMK_oabG19FNauNaBu_CoQTL8QRSXcptyfY6rbM"
  );
}

// 2. Define a variável 'supabase' para ser usada no resto deste arquivo.
// Usamos 'var' em vez de 'const' porque 'var' não dá erro se o arquivo carregar 2 vezes.
var supabase = window.supabaseClient;

// ==========================================
// 1.5. GERENCIAMENTO DINÂMICO DE TIPOS DE ITENS
// ==========================================
window.tiposItensCarregados = [];

async function carregarTodosTiposItens() {
  const defaults = [
    { nome: "macacão", dias: 3, label: "Macacão" },
    { nome: "vestido normal", dias: 3, label: "Vestido Normal" },
    { nome: "vestido de festa", dias: 7, label: "Vestido de Festa" },
    { nome: "pantalona", dias: 3, label: "Pantalona" },
    { nome: "saia", dias: 3, label: "Saia" },
    { nome: "kimono", dias: 3, label: "Kimono" },
    { nome: "fato", dias: 3, label: "Fato" },
    { nome: "concerto", dias: 3, label: "Concerto" },
    { nome: "modificacao", dias: 3, label: "Modificação" }
  ];

  const map = new Map();
  defaults.forEach(d => map.set(d.nome.toLowerCase().trim(), d));

  // 1. Tentar ler do Supabase
  try {
    const { data: dbTypes, error } = await supabase
      .from('tipos_itens')
      .select('*');

    if (!error && dbTypes && dbTypes.length > 0) {
      dbTypes.forEach(t => {
        const nomeL = t.nome.toLowerCase().trim();
        map.set(nomeL, {
          nome: nomeL,
          dias: parseInt(t.dias),
          label: t.nome.charAt(0).toUpperCase() + t.nome.slice(1)
        });
      });
    }
  } catch (err) {
    console.warn("Tabela 'tipos_itens' não disponível no Supabase. Usando fallbacks.", err);
  }

  // 2. Fallback localStorage
  try {
    const localCustom = JSON.parse(localStorage.getItem("tipos_itens_custom") || "[]");
    localCustom.forEach(item => {
      const nomeL = item.nome.toLowerCase().trim();
      map.set(nomeL, {
        nome: nomeL,
        dias: parseInt(item.dias),
        label: item.nome.charAt(0).toUpperCase() + item.nome.slice(1)
      });
    });
  } catch (e) { }

  // 3. Fallback: Ler pedidos antigos
  try {
    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select('itens');

    if (!error && pedidos) {
      pedidos.forEach(p => {
        let itensList = [];
        try {
          if (typeof p.itens === 'object' && p.itens !== null) {
            itensList = p.itens;
          } else if (typeof p.itens === 'string') {
            itensList = JSON.parse(p.itens);
          }
        } catch (e) { }

        if (Array.isArray(itensList)) {
          itensList.forEach(item => {
            if (item.subtipo) {
              const nameL = item.subtipo.toLowerCase().trim();
              if (!map.has(nameL)) {
                const val = parseInt(item.dias);
                map.set(nameL, {
                  nome: nameL,
                  dias: isNaN(val) ? 3 : val,
                  label: item.subtipo.charAt(0).toUpperCase() + item.subtipo.slice(1)
                });
              }
            }
          });
        }
      });
    }
  } catch (e) { }

  window.tiposItensCarregados = Array.from(map.values());

  // Atualizar selects de outros locais (como o modal de edição se já estiver aberto)
  atualizarOpcoesSelectsEditor();

  return window.tiposItensCarregados;
}

// --- APLICAR MASONRY UI ---
async function aplicarMasonryUI(statusDaPagina) {
  // O código Masonry original manteve-se
}

// =====================================================
// MODAL GLOBAL DE FATURAS (SIMPLIFICADO — APENAS LINK DA FATURA COMPLETA)
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    const modalHTML = `
    <div class="modal-overlay" id="modal-fatura" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.55); z-index:9999; justify-content:center; align-items:center; backdrop-filter:blur(3px);">
        <div style="background:#fff; width:92%; max-width:440px; padding:26px; border-radius:14px; box-shadow:0 12px 40px rgba(0,0,0,0.22);">
            <h3 style="margin-top:0; font-size:1.15rem; color:#1a1a2e; display:flex; align-items:center; gap:8px; border-bottom: 1px solid #f0ebe1; padding-bottom:12px; margin-bottom:16px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                Fatura Completa do Pedido
            </h3>
            
            <input type="hidden" id="fatura-pedido-id">

            <!-- Resumo Automático do Pedido -->
            <div id="fatura-resumo-info" style="background:#faf8f3; border:1px solid #e8dfd1; border-radius:10px; padding:12px 14px; margin-bottom:16px; font-size:0.86rem; color:#444; line-height:1.65;">
                <div><strong>Cliente:</strong> <span id="fatura-info-cliente">—</span></div>
                <div><strong>NIF:</strong> <span id="fatura-info-nif" style="font-family:monospace; font-weight:700; color:#2e7d32;">—</span></div>
                <div><strong>Valor Total:</strong> <span id="fatura-info-valor" style="font-weight:700; color:#1a1a2e;">€0.00</span></div>
            </div>

            <!-- Botão Rápido se já existir fatura -->
            <a id="fatura-final-btn" href="#" target="_blank" style="display:none; width:100%; box-sizing:border-box; text-align:center; padding:10px 14px; background:#f1f8f2; border:1px solid #b8deb9; border-radius:8px; color:#256029; text-decoration:none; font-size:0.88rem; font-weight:600; margin-bottom:16px; transition:all 0.2s;">
                Abrir Fatura Atual numa Nova Aba
            </a>
            
            <!-- Campo Único: Link da Fatura Completa -->
            <div style="margin-bottom: 20px;">
                <label style="font-size:0.86rem; font-weight:700; color:#333; display:block; margin-bottom:6px;">
                    Link da Fatura Completa (PDF / Drive / Portal AT)
                </label>
                <input type="url" id="fatura-final-input" placeholder="Cole aqui o link https://..." 
                    style="width:100%; padding:11px 12px; border:1.5px solid #d8d0c5; border-radius:8px; font-size:0.95rem; box-sizing:border-box; outline:none; font-family:inherit;"
                    onfocus="this.style.borderColor='#d4af37'" onblur="this.style.borderColor='#d8d0c5'">
                <small style="display:block; margin-top:6px; color:#888; font-size:0.78rem;">
                    O valor, data e NIF do cliente são associados automaticamente ao guardar.
                </small>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button type="button" onclick="document.getElementById('modal-fatura').style.display='none'" style="padding:10px 18px; background:#f2f2f2; border:none; border-radius:8px; cursor:pointer; color:#555; font-weight:600; margin:0;">Cancelar</button>
                <button type="button" onclick="salvarModalFatura()" id="btn-salvar-fatura" style="padding:10px 20px; background:#d4af37; border:none; border-radius:8px; cursor:pointer; color:#fff; font-weight:700; margin:0;">Guardar Fatura</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
});

async function abrirModalFatura(pedidoId) {
    const btn = document.getElementById('btn-salvar-fatura');
    btn.textContent = "A carregar...";
    btn.disabled = true;
    document.getElementById('modal-fatura').style.display = 'flex';
    document.getElementById('fatura-pedido-id').value = pedidoId;

    try {
        const { data: p, error } = await supabase.from('pedidos').select('*').eq('id', pedidoId).single();
        if (error) throw error;
        
        const { data: f } = await supabase.from('faturas').select('*').eq('pedido_id', pedidoId).maybeSingle();
        const fatura = f || {};

        // Buscar NIF do cliente
        let nifCliente = fatura.nif || '999999990';
        if (p.nome) {
            const { data: cliData } = await supabase
                .from('clientes_financas')
                .select('nif')
                .ilike('nome', `%${p.nome.trim()}%`)
                .limit(1);
            if (cliData && cliData.length > 0 && cliData[0].nif && cliData[0].nif.trim() !== '') {
                nifCliente = cliData[0].nif.trim();
            }
        }

        const valorAuto = fatura.valor_total !== undefined && fatura.valor_total !== null
            ? Number(fatura.valor_total)
            : Number(p.preco_final || p.preco_total || 0);

        document.getElementById('fatura-info-cliente').textContent = p.nome || 'Cliente';
        document.getElementById('fatura-info-nif').textContent = nifCliente === '999999990' ? '999999990 (Consumidor Final)' : nifCliente;
        document.getElementById('fatura-info-valor').textContent = `€${valorAuto.toFixed(2)}`;

        const linkAtual = fatura.final_link || fatura.simples_link || p.fatura_final_link || p.fatura_simples_link || '';
        document.getElementById('fatura-final-input').value = linkAtual;

        const fBtn = document.getElementById('fatura-final-btn');
        if (linkAtual) {
            fBtn.href = linkAtual;
            fBtn.style.display = 'block';
        } else {
            fBtn.style.display = 'none';
        }
    } catch (err) {
        console.error(err);
        if (window.mostrarAviso) await window.mostrarAviso("Erro ao carregar dados da fatura.", "Erro", "❌");
        else alert("Erro ao carregar dados do pedido.");
        document.getElementById('modal-fatura').style.display = 'none';
    } finally {
        btn.textContent = "💾 Guardar Fatura";
        btn.disabled = false;
    }
}

async function salvarModalFatura() {
    const id = document.getElementById('fatura-pedido-id').value;
    const finalLink = document.getElementById('fatura-final-input').value.trim() || null;

    const btn = document.getElementById('btn-salvar-fatura');
    btn.textContent = "A guardar...";
    btn.disabled = true;

    try {
        const { data: p } = await supabase.from('pedidos').select('*').eq('id', id).single();
        const nomeCliente = p ? p.nome : null;
        const valorTotal = p ? Number(p.preco_final || p.preco_total || 0) : 0;
        let nifAtual = '999999990';
        
        if (nomeCliente) {
            const nomeLimpo = nomeCliente.trim();
            const { data: cliData } = await supabase.from('clientes_financas').select('nif').ilike('nome', `%${nomeLimpo}%`).limit(1);
            if (cliData && cliData.length > 0 && cliData[0].nif && cliData[0].nif.trim() !== '') {
                nifAtual = cliData[0].nif.trim();
            }
        }

        const payload = {
            pedido_id: id,
            nome_cliente: nomeCliente,
            nif: nifAtual,
            final_link: finalLink,
            simples_link: null,
            valor_total: valorTotal,
            status_envio: finalLink ? 'enviado' : 'pendente',
            data_emissao: p ? (p.data_real ? new Date(p.data_real).toISOString() : new Date().toISOString()) : new Date().toISOString()
        };

        // Atualiza também no registo do pedido para compatibilidade
        await supabase.from('pedidos').update({
            fatura_final_link: finalLink,
            fatura_valor_total: valorTotal
        }).eq('id', id);

        // Verifica se a fatura já existe para este pedido
        const { data: existingData } = await supabase.from('faturas').select('id').eq('pedido_id', id).limit(1);
        const existing = existingData && existingData.length > 0 ? existingData[0] : null;
        
        if (existing && existing.id) {
            const { error } = await supabase.from('faturas').update(payload).eq('id', existing.id);
            if (error) throw error;
        } else if (finalLink) {
            const { error } = await supabase.from('faturas').insert([payload]);
            if (error) throw error;
        }
        
        document.getElementById('modal-fatura').style.display = 'none';
        
        if (window.location.pathname.includes('financas')) {
            if (typeof carregarFaturasFisicas === 'function') carregarFaturasFisicas();
            if (typeof carregarDashboardFaturas === 'function') carregarDashboardFaturas();
        } else {
            location.reload();
        }
    } catch (err) {
        console.error("Erro ao guardar fatura:", err);
        if (window.mostrarAviso) await window.mostrarAviso("Erro ao guardar fatura: " + (err.message || ''), "Erro", "❌");
        else alert("Erro ao guardar dados: " + (err.message || JSON.stringify(err)));
    } finally {
        btn.textContent = "💾 Guardar Fatura";
        btn.disabled = false;
    }
}

// Salva o novo tipo de item
async function salvarNovoTipoItem(nome, dias) {
  const nomeLimpo = nome.toLowerCase().trim();
  const val = parseInt(dias);
  const diasInt = isNaN(val) ? 3 : val;

  // 1. Tentar salvar no Supabase
  try {
    const { error } = await supabase
      .from('tipos_itens')
      .insert({ nome: nomeLimpo, dias: diasInt });
    if (error) {
      console.warn("Erro ao inserir na tabela 'tipos_itens' do Supabase:", error.message || error);
    }
  } catch (err) {
    console.error("Falha ao salvar no banco de dados:", err);
  }

  // 2. Salvar no localStorage (Garante funcionamento se offline/sem tabela)
  try {
    let localCustom = JSON.parse(localStorage.getItem("tipos_itens_custom") || "[]");
    // Evita duplicatas no localStorage
    if (!localCustom.some(item => item.nome.toLowerCase().trim() === nomeLimpo)) {
      localCustom.push({ nome: nomeLimpo, dias: diasInt });
      localStorage.setItem("tipos_itens_custom", JSON.stringify(localCustom));
    }
  } catch (e) { }

  // 3. Atualiza na lista em memória e sincroniza tudo
  await carregarTodosTiposItens();
}

function atualizarOpcoesSelectsEditor() {
  const editorSelect = document.getElementById("novo-subtipo");
  if (editorSelect) {
    const valAnterior = editorSelect.value;
    editorSelect.innerHTML = "";
    window.tiposItensCarregados.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.nome;
      opt.dataset.dias = item.dias;
      opt.textContent = item.label;
      editorSelect.appendChild(opt);
    });
    if (valAnterior) editorSelect.value = valAnterior;
  }
}

// Disparar o carregamento assim que carregar o script
carregarTodosTiposItens();

// ==========================================
// 2. LÓGICA DE ADICIONAR PEDIDO (NOVA LÓGICA DE AGENDAMENTO)
// ==========================================

if (document.getElementById('form-pedido')) {
  // Bloqueia Enter em inputs de texto/número para não submeter o form acidentalmente
  document.getElementById('form-pedido').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  });

  // --- AUTOCOMPLETE E PRÉ-PREENCHIMENTO DE CLIENTES ---
  let _clientesCachePedido = [];
  (async function inicializarAutocompleteClientes() {
    const inputNome = document.getElementById('nome');
    const inputTel = document.getElementById('telefone_cliente');
    const inputEmail = document.getElementById('email_cliente');
    const inputNif = document.getElementById('nif_cliente');
    const boxSugestoes = document.getElementById('cliente-sugestoes-lista');
    const boxMedidas = document.getElementById('cliente-medidas-alerta');

    // 1. Preencher via parâmetros de URL (vindo da Central de Clientes)
    const params = new URLSearchParams(window.location.search);
    if (params.get('nome') && inputNome) inputNome.value = params.get('nome');
    if (params.get('telefone') && inputTel) inputTel.value = params.get('telefone');
    if (params.get('email') && inputEmail) inputEmail.value = params.get('email');
    if (params.get('nif') && inputNif) inputNif.value = params.get('nif');

    // 2. Carregar clientes da base de dados (clientes_financas + histórico de pedidos)
    try {
      const [resCli, resPed] = await Promise.all([
        supabase.from('clientes_financas').select('*').order('nome', { ascending: true }),
        supabase.from('pedidos').select('nome, email_cliente, fatura_contato_envio').order('data_pedido', { ascending: false })
      ]);

      const mapa = new Map();
      const norm = (str) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

      (resCli.data || []).forEach(c => {
        const ch = norm(c.nome);
        if (!ch) return;
        let medidas = '';
        if (c.morada && String(c.morada).includes('\n---MEDIDAS---\n')) {
          medidas = String(c.morada).split('\n---MEDIDAS---\n').slice(1).join('\n').trim();
        }
        mapa.set(ch, {
          nome: c.nome.trim(),
          telefone: c.telefone || '',
          email: c.email || '',
          nif: (c.nif && c.nif !== '999999990') ? c.nif : '',
          medidas: medidas,
          pedidosCount: 0
        });
      });

      (resPed.data || []).forEach(p => {
        const ch = norm(p.nome);
        if (!ch) return;
        if (!mapa.has(ch)) {
          mapa.set(ch, {
            nome: p.nome.trim(),
            telefone: p.fatura_contato_envio || '',
            email: p.email_cliente || '',
            nif: '',
            medidas: '',
            pedidosCount: 1
          });
        } else {
          const item = mapa.get(ch);
          item.pedidosCount += 1;
          if (!item.email && p.email_cliente) item.email = p.email_cliente;
          if (!item.telefone && p.fatura_contato_envio) item.telefone = p.fatura_contato_envio;
        }
      });

      _clientesCachePedido = Array.from(mapa.values());

      // Se veio com nome na URL e tem medidas, mostra alerta
      if (params.get('nome')) {
        const cliUrl = mapa.get(norm(params.get('nome')));
        if (cliUrl && cliUrl.medidas && boxMedidas) {
          boxMedidas.style.display = 'block';
          boxMedidas.innerHTML = `<strong>Medidas guardadas na ficha de ${cliUrl.nome}:</strong><br>${cliUrl.medidas.replace(/\n/g, '<br>')}`;
        }
      }
    } catch (err) {
      console.warn("Aviso ao carregar sugestões de clientes:", err);
    }

    if (!inputNome || !boxSugestoes) return;

    inputNome.addEventListener('input', () => {
      const termo = String(inputNome.value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      if (!termo || termo.length < 1) {
        boxSugestoes.style.display = 'none';
        if (boxMedidas) boxMedidas.style.display = 'none';
        return;
      }

      const matches = _clientesCachePedido.filter(c => {
        const n = String(c.nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const t = String(c.telefone || '').toLowerCase();
        const nif = String(c.nif || '').toLowerCase();
        return n.includes(termo) || t.includes(termo) || nif.includes(termo);
      }).slice(0, 8);

      if (matches.length === 0) {
        boxSugestoes.style.display = 'none';
        return;
      }

      boxSugestoes.innerHTML = matches.map((c, idx) => `
        <div class="cliente-sugestao-item" data-idx="${idx}">
          <div>
            <strong>${c.nome}</strong>
            <div style="font-size:0.78rem; color:#666;">
              ${c.telefone ? `Tel: ${c.telefone} ` : ''}
              ${c.nif ? `| NIF: ${c.nif} ` : ''}
              ${c.email ? `| ${c.email}` : ''}
            </div>
          </div>
          <span style="font-size:0.75rem; background:#f5efe2; color:#8d6b20; padding:3px 8px; border-radius:99px; font-weight:600;">
            ${c.pedidosCount} pedido(s)
          </span>
        </div>
      `).join('');

      boxSugestoes.querySelectorAll('.cliente-sugestao-item').forEach((el, idx) => {
        el.addEventListener('click', () => {
          const escolhido = matches[idx];
          inputNome.value = escolhido.nome;
          if (inputTel && escolhido.telefone) inputTel.value = escolhido.telefone;
          if (inputEmail && escolhido.email) inputEmail.value = escolhido.email;
          if (inputNif && escolhido.nif) inputNif.value = escolhido.nif;
          boxSugestoes.style.display = 'none';

          if (boxMedidas) {
            if (escolhido.medidas) {
              boxMedidas.style.display = 'block';
              boxMedidas.innerHTML = `<strong>Medidas guardadas na ficha de ${escolhido.nome}:</strong><br>${escolhido.medidas.replace(/\n/g, '<br>')}`;
            } else {
              boxMedidas.style.display = 'none';
            }
          }
        });
      });

      boxSugestoes.style.display = 'block';
    });

    document.addEventListener('click', (ev) => {
      if (!inputNome.contains(ev.target) && !boxSugestoes.contains(ev.target)) {
        boxSugestoes.style.display = 'none';
      }
    });
  })();

  let _submittingPedido = false;
  document.getElementById('form-pedido').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (_submittingPedido) return;

    const nome = document.getElementById('nome').value.trim();
    if (!nome) {
      await mostrarAviso("Por favor, introduza o Nome da Cliente.", "Campo Obrigatório", "⚠️");
      return;
    }

    const dataInput = document.getElementById('data').value;
    if (!dataInput) {
      await mostrarAviso("Por favor, introduza a Data desejada para início.", "Campo Obrigatório", "⚠️");
      return;
    }

    const hoje = new Date();
    const dataEscolhida = new Date(dataInput + 'T12:00:00'); // T12:00 evita desfasamento UTC→WEST
    const itens = coletarItens();
    const preco_total = itens.reduce((acc, i) => acc + i.preco_total_item, 0);
    const email_cliente = document.getElementById('email_cliente').value;

    if (itens.length === 0) {
      await mostrarAviso("Adicione ao menos um item ao pedido.", "Aviso", "⚠️");
      return;
    }

    // Bloqueia submissões duplas
    _submittingPedido = true;
    const btnSalvar = document.querySelector('#form-pedido [type="submit"]');
    if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = 'A guardar...'; }

    // --- LÓGICA INTELIGENTE DE AGENDAMENTO ---
    let semanaData = ajustarParaSegunda(dataEscolhida);
    let diasTotais = itens.reduce((acc, i) => acc + (i.dias * i.quantidade), 0);

    // Procura a primeira semana que tem espaço para pelo menos o começo deste pedido
    let limiteSeguranca = 0;
    while (!(await semanaTemEspaco(semanaData, [itens[0]])) && limiteSeguranca < 52) {
      semanaData.setDate(semanaData.getDate() + 7);
      limiteSeguranca++;
    }

    // O trabalho não pode começar no passado (ex: se hoje é Quinta, não conta Segunda/Terça/Quarta)
    let dataInicioReal = new Date(dataEscolhida);
    if (dataInicioReal < semanaData) dataInicioReal = new Date(semanaData);

    const dataEntrega = calcularDataEntrega(dataInicioReal, diasTotais);
    // ------------------------------------------

    const cupao_codigo_el = document.getElementById('cupao-codigo');
    const cupao_desconto_el = document.getElementById('cupao-desconto');
    const cupao_codigo = (cupao_codigo_el && cupao_codigo_el.value) ? cupao_codigo_el.value : null;
    const desconto_percentagem = (cupao_desconto_el && cupao_desconto_el.value) ? parseInt(cupao_desconto_el.value) : null;

    const adiantamento_el = document.getElementById('valor_adiantado');
    const valor_adiantado = (adiantamento_el && adiantamento_el.value) ? parseFloat(adiantamento_el.value) : 0;

    let preco_final = preco_total;
    if (desconto_percentagem && desconto_percentagem > 0) {
      preco_final = preco_total - (preco_total * desconto_percentagem / 100);
    }

    const isProntoAVestir = itens.length > 0 && itens.every(i => parseInt(i.dias) === 0);

    // Pronto a vestir: pago = vai para 'entregue'; não pago = vai para 'concluido'
    const estaPagoTotal = preco_final > 0 && valor_adiantado >= preco_final;
    const valorFinalAdiantado = isProntoAVestir
      ? (estaPagoTotal ? preco_final : valor_adiantado)
      : valor_adiantado;

    const statusInicial = isProntoAVestir
      ? (estaPagoTotal ? 'entregue' : 'concluido')
      : 'pendente';

    // Método de pagamento do pagamento inicial
    const metodoPagamentoEl = document.getElementById('metodo_pagamento_inicial');
    const metodoPagamentoInicial = (metodoPagamentoEl && metodoPagamentoEl.value) ? metodoPagamentoEl.value : '';
    if (valorFinalAdiantado > 0 && !metodoPagamentoInicial) {
      await mostrarAviso("Escolha o método de pagamento do pagamento inicial (MB Way, Dinheiro ou Multibanco).", "Campo Obrigatório", "⚠️");
      _submittingPedido = false;
      if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = '✓ Salvar Pedido'; }
      return;
    }

    // Constrói array de pagamentos com data
    const dataInicialPgmt = document.getElementById('data_pagamento_inicial');
    const dataHoje = formatarParaISO(new Date());
    const pagamentosInicial = valorFinalAdiantado > 0 ? [{
      valor: valorFinalAdiantado,
      data: (dataInicialPgmt && dataInicialPgmt.value) ? dataInicialPgmt.value : dataHoje,
      nota: isProntoAVestir ? (estaPagoTotal ? 'Pagamento total (pronto a vestir)' : 'Pagamento parcial (pronto a vestir)') : 'Pagamento inicial',
      metodo: metodoPagamentoInicial
    }] : [];

    const nif_el = document.getElementById('nif_cliente');
    let nif_cliente = (nif_el && nif_el.value) ? nif_el.value.trim() : null;
    if (!nif_cliente || nif_cliente === '') {
        nif_cliente = '999999990';
    }

    const tel_el = document.getElementById('telefone_cliente');
    const telefone_cliente = (tel_el && tel_el.value) ? tel_el.value.trim() : null;

    const pedidoObj = {
      nome,
      data_pedido: formatarParaISO(dataInicioReal),
      data_real: formatarParaISO(new Date()),
      itens: JSON.stringify(itens),
      data_entrega: formatarParaISO(dataEntrega),
      status: statusInicial,
      preco_total: preco_total,
      preco_final: preco_final,
      cupao_codigo: cupao_codigo,
      desconto_percentagem: desconto_percentagem,
      valor_adiantado: valorFinalAdiantado,
      pagamentos: JSON.stringify(pagamentosInicial),
      email_cliente: email_cliente,
      fatura_contato_envio: telefone_cliente
    };

    try {
      const { data: novoPedido, error } = await supabase
        .from('pedidos')
        .insert(pedidoObj)
        .select()
        .single();

      console.log("Resposta do Supabase:", { error, novoPedido });

      if (error) {
        console.error("Erro ao salvar pedido:", error);
        await mostrarAviso("Erro ao salvar pedido: " + error.message, "Erro", "❌");
        _submittingPedido = false;
        if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = '✓ Salvar Pedido'; }
      } else {
        // Regista/atualiza o cliente na tabela clientes_financas (evitando conflito de NIF 999999990)
        const nifParaFicha = (nif_cliente && nif_cliente !== '999999990') ? nif_cliente : '';
        const { data: resCliRpc } = await supabase.rpc('registar_cliente_financas', {
            p_nome: nome,
            p_email: email_cliente || '',
            p_nif: nifParaFicha
        });

        if (telefone_cliente) {
            if (resCliRpc && resCliRpc.id) {
                await supabase.from('clientes_financas').update({ telefone: telefone_cliente }).eq('id', resCliRpc.id);
            } else {
                await supabase.from('clientes_financas').update({ telefone: telefone_cliente }).ilike('nome', nome);
            }
        }

        // Tenta enviar o email de confirmação se não for pronto-a-vestir
        if (!isProntoAVestir) {
          const NOVO_TEMPLATE_ID = "template_0uin60y"; // Confirme se este ID está certo no EmailJS
          await enviarEmailConfirmacao(novoPedido, NOVO_TEMPLATE_ID);
        }

        // Se há cupão selecionado, marca como utilizado
        const cupaoIdEl = document.getElementById('cupao-id-selecionado');
        if (cupaoIdEl && cupaoIdEl.value) {
          await supabase
            .from('vouchers')
            .update({ estado: 'utilizado', data_estado_muda: new Date().toISOString() })
            .eq('id', cupaoIdEl.value);
        }

        await mostrarAviso("Pedido salvado com sucesso!", "Sucesso", "✅");
        location.reload();
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      await mostrarAviso("Erro inesperado: " + err.message, "Erro", "❌");
      _submittingPedido = false;
      if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = '✓ Salvar Pedido'; }
    }
  });
}

// --- Funções Auxiliares de Agendamento ---

function ajustarParaSegunda(data) {
  const d = new Date(data);
  const day = d.getDay();
  // Se for Domingo (0), recua 6 dias para a Segunda. Caso contrário, recua (day - 1) dias.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0); // Zera as horas para comparação de datas limpa
  return d;
}

// Função para formatar data YYYY-MM-DD para DD/MM/YYYY sem fuso horário
function formatarDataParaExibir(dataISO) {
  if (!dataISO) return '-';
  const partes = dataISO.split('T')[0].split('-');
  if (partes.length !== 3) return dataISO;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// Função para formatar objeto Date para YYYY-MM-DD sem fuso horário
function formatarParaISO(date) {
  const d = new Date(date);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function calcularDataEntrega(inicio, dias) {
  let entrega = new Date(inicio);
  let adicionados = 0;

  // Adiciona dias úteis (pula domingos)
  while (adicionados < dias) {
    entrega.setDate(entrega.getDate() + 1);
    const diaSemana = entrega.getDay();
    if (diaSemana !== 0) {
      adicionados++;
    }
  }

  // Verifica se a data calculada já passou (segurança)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (entrega < hoje) {
    entrega = new Date(hoje);
    adicionados = 0;
    while (adicionados < dias) {
      entrega.setDate(entrega.getDate() + 1);
      const diaSemana = entrega.getDay();
      if (diaSemana !== 0) {
        adicionados++;
      }
    }
  }

  // Garantia extra: Nunca entrega ao Domingo
  while (entrega.getDay() === 0) {
    entrega.setDate(entrega.getDate() + 1);
  }

  return entrega;
}

async function semanaTemEspaco(segunda, novosItens, excluirPedidoId = null) {
  const domingo = new Date(segunda);
  domingo.setDate(domingo.getDate() + 6);

  let query = supabase
    .from('pedidos')
    .select('itens, data_pedido, data_entrega') // Buscamos a entrega também para ver o intervalo
    .eq('status', 'pendente') // Apenas pedidos pendentes ocupam capacidade de produção
    .lte('data_pedido', formatarParaISO(domingo)) // O pedido começou antes de o domingo acabar
    .gte('data_entrega', formatarParaISO(segunda)); // O pedido acaba depois de a segunda começar

  if (excluirPedidoId) {
    query = query.neq('id', excluirPedidoId);
  }

  const { data: pedidos, error } = await query;

  if (error) {
    console.error("Erro ao buscar pedidos da semana:", error);
  }

  let pecasNormais = 0;
  let concertos = 0;
  let temVestidoFesta = false;

  // Conta o que já existe no banco de dados para esta semana (se houver)
  if (pedidos) {
    for (const pedido of pedidos) {
      const itensSalvos = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : pedido.itens;
      for (const item of itensSalvos) {
        if (item.concluido) continue; // Itens individualmente concluídos já não ocupam capacidade
        const qtd = parseInt(item.quantidade) || 1;
        if (item.subtipo === 'vestido de festa') temVestidoFesta = true;
        else if (item.tipo === 'criacao') pecasNormais += qtd;
        else if (item.tipo === 'concerto' || item.tipo === 'modificacao') concertos += qtd;
      }
    }
  }

  // Verifica se o conjunto de novos itens cabe nesta semana
  for (const item of novosItens) {
    const qtd = parseInt(item.quantidade) || 1;

    // REGRA DE OURO: Se já houver um vestido de festa, a semana está FECHADA para tudo.
    if (temVestidoFesta) return false;

    if (item.subtipo === 'vestido de festa') {
      // "Um vestido de festa fecha a semana" -> Não pode haver NADA antes.
      if (pecasNormais > 0 || concertos > 0 || qtd > 1) return false;
      temVestidoFesta = true;
    }
    else if (item.tipo === 'criacao') {
      // Bloqueia se ultrapassar o limite de 3 criações
      if ((pecasNormais + qtd) > 3) return false;
      pecasNormais += qtd;
    }
    else if (item.tipo === 'concerto' || item.tipo === 'modificacao') {
      // Bloqueia se ultrapassar o limite de 15 concertos/modificações
      if ((concertos + qtd) > 15) return false;
      concertos += qtd;
    }
  }
  return true;
}

// --- Funções do Formulário ---

function coletarItens() {
  const itens = [];
  document.querySelectorAll('#itens .item').forEach(div => {
    const sel = div.querySelector('select');
    const desc = div.querySelector('textarea').value.trim();

    const selectedOpt = sel && sel.selectedOptions && sel.selectedOptions[0];
    let dias = 3;
    let subtipo = "";

    if (selectedOpt) {
      const val = parseInt(selectedOpt.dataset.dias);
      dias = isNaN(val) ? 3 : val;
      subtipo = sel.value;

      // Verificação extra: se o texto visível não bater com o select, tenta sincronizar
      const filtroInput = div.querySelector('.filtro-tipo-item');
      if (filtroInput) {
        const textoVisivel = filtroInput.value.toLowerCase().trim();
        if (textoVisivel && textoVisivel !== selectedOpt.textContent.toLowerCase().trim()) {
          const matchTexto = window.tiposItensCarregados.find(item =>
            item.label.toLowerCase() === textoVisivel || item.nome.toLowerCase() === textoVisivel
          );
          if (matchTexto) {
            subtipo = matchTexto.nome;
            dias = matchTexto.dias;
          }
        }
      }
    } else {
      // Se o select não tiver opções (ex: falha ao ler do banco), tenta usar o input de texto do filtro
      const filtroInput = div.querySelector('.filtro-tipo-item');
      subtipo = filtroInput ? filtroInput.value.toLowerCase().trim() : 'vestido normal';
      dias = 3;
    }

    const preco = parseFloat(div.querySelector('.preco-item').value) || 0;
    const quantidade = parseInt(div.querySelector('.quantidade-item').value) || 1;
    const preco_total_item = preco * quantidade;

    let tipo;
    if (subtipo === 'concerto') tipo = 'concerto';
    else if (subtipo === 'modificacao') tipo = 'modificacao';
    else tipo = 'criacao';

    itens.push({
      tipo,
      subtipo,
      dias,
      descricao: desc,
      preco,
      quantidade,
      preco_total_item
    });
  });
  return itens;
}

function atualizarPrecoTotal() {
  let total = 0;
  document.querySelectorAll('#itens .item').forEach(div => {
    const preco = parseFloat(div.querySelector('.preco-item').value) || 0;
    const quantidade = parseInt(div.querySelector('.quantidade-item').value) || 1;
    total += preco * quantidade;
  });

  const inputDesconto = document.getElementById('cupao-desconto');
  let precoFinal = total;
  if (inputDesconto && inputDesconto.value) {
    precoFinal = total - (total * parseInt(inputDesconto.value) / 100);
  }

  const inputTotal = document.getElementById('preco_total');
  if (inputTotal) inputTotal.value = precoFinal.toFixed(2);

  const displayTotal = document.getElementById("final_total_display");
  if (displayTotal) displayTotal.innerText = precoFinal.toFixed(2);

  const adiantamentoEl = document.getElementById("valor_adiantado");
  const valor_adiantado = adiantamentoEl && adiantamentoEl.value ? parseFloat(adiantamentoEl.value) : 0;

  const lblPago = document.getElementById("final_pago_display");
  if (lblPago) lblPago.innerText = valor_adiantado.toFixed(2);

  const lblFalta = document.getElementById("final_falta_display");
  if (lblFalta) lblFalta.innerText = Math.max(0, precoFinal - valor_adiantado).toFixed(2);
}

function adicionarItem() {
  const container = document.getElementById('itens');
  const div = document.createElement('div');
  div.className = 'item';
  div.innerHTML = `
        <div class="combobox-container">
            <label style="margin-top:0;">Selecionar Tipo do Item:</label>
            <div class="combobox-wrapper">
                <input type="text" class="filtro-tipo-item" placeholder="Pesquise ou digite o tipo..." autocomplete="off">
                <button type="button" class="btn-combobox-add" style="display:none;" title="Adicionar novo tipo">+</button>
            </div>
            
            <select class="tipo-item" style="display:none;">
                <!-- Dinamicamente preenchido -->
            </select>
            
            <div class="sugestoes-tipo-item" style="display:none;"></div>
            
            <div class="novo-item-tempo-box" style="display:none;">
                <p>✨ Adicionar Novo Tipo de Item: "<span class="novo-item-nome-lbl"></span>"</p>
                <div class="form-inline">
                    <label>Tempo (dias):</label>
                    <input type="number" class="novo-item-dias-input" value="3">
                    <button type="button" class="btn-confirmar-novo-item">Confirmar</button>
                    <button type="button" class="btn-cancelar-novo-item">Cancelar</button>
                </div>
            </div>
        </div>
        
        <textarea placeholder="Descrição do item..." class="descricao-item" style="margin-top:10px;"></textarea>
        
        <label style="margin-top:10px;">Preço (€):</label>
        <input type="number" class="preco-item" step="0.01" min="0" placeholder="Ex: 25.00">
        
        <label>Quantidade:</label>
        <input type="number" class="quantidade-item" min="1" value="1">
    `;
  container.appendChild(div);

  // Seletores dos elementos recém-criados
  const selectEl = div.querySelector('.tipo-item');
  const inputFiltro = div.querySelector('.filtro-tipo-item');
  const btnAdd = div.querySelector('.btn-combobox-add');
  const sugestoesDiv = div.querySelector('.sugestoes-tipo-item');
  const novoBox = div.querySelector('.novo-item-tempo-box');
  const novoNomeLbl = div.querySelector('.novo-item-nome-lbl');
  const novoDiasInput = div.querySelector('.novo-item-dias-input');
  const btnConfirmar = div.querySelector('.btn-confirmar-novo-item');
  const btnCancelar = div.querySelector('.btn-cancelar-novo-item');

  const repopularSelect = (valorSelecionar = "") => {
    selectEl.innerHTML = "";
    window.tiposItensCarregados.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.nome;
      opt.dataset.dias = item.dias;
      opt.textContent = item.label;
      selectEl.appendChild(opt);
    });
    if (valorSelecionar) {
      selectEl.value = valorSelecionar;
    } else if (window.tiposItensCarregados.length > 0) {
      selectEl.value = window.tiposItensCarregados[0].nome;
    }
  };

  // Inicializa o select oculto
  repopularSelect();

  // Define o valor inicial do campo de busca com base na primeira opção padrão selecionada
  if (selectEl.selectedOptions && selectEl.selectedOptions[0]) {
    inputFiltro.value = selectEl.selectedOptions[0].textContent;
  }

  // Renderiza a lista de sugestões
  const renderSugestoes = (filtro = "") => {
    sugestoesDiv.innerHTML = "";
    const termo = filtro.toLowerCase().trim();

    const filtrados = window.tiposItensCarregados.filter(item =>
      item.label.toLowerCase().includes(termo) ||
      item.nome.toLowerCase().includes(termo)
    );

    if (filtrados.length === 0) {
      sugestoesDiv.innerHTML = `
                <div class="sugestao-item sugestao-item-add" style="color:#2e7d32; font-weight:bold; cursor:pointer;">
                    <span>➕ Adicionar "${filtro}"...</span>
                </div>
            `;
    } else {
      filtrados.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'sugestao-item';
        if (selectEl.value === item.nome) {
          itemDiv.classList.add('selected');
        }
        itemDiv.innerHTML = `
                    <span>${item.label}</span>
                    <span class="sugestao-dias">${item.dias} dias</span>
                `;
        itemDiv.addEventListener('click', () => {
          selectEl.value = item.nome;
          inputFiltro.value = item.label;
          sugestoesDiv.style.display = 'none';
          btnAdd.style.display = 'none';
          atualizarPrecoTotal();
        });
        sugestoesDiv.appendChild(itemDiv);
      });

      // Se o que o usuário escreveu não for uma correspondência exata, sugere adicionar
      const correspondenciaExata = filtrados.some(item => item.label.toLowerCase() === termo || item.nome.toLowerCase() === termo);
      if (termo && !correspondenciaExata) {
        const addDiv = document.createElement('div');
        addDiv.className = 'sugestao-item sugestao-item-add';
        addDiv.innerHTML = `<span>➕ Adicionar "${filtro}"...</span>`;
        sugestoesDiv.appendChild(addDiv);
      }
    }

    sugestoesDiv.style.display = 'block';
  };

  // Foco e escrita no campo de texto de busca
  inputFiltro.addEventListener('focus', () => {
    renderSugestoes(inputFiltro.value);
  });

  inputFiltro.addEventListener('input', () => {
    const termo = inputFiltro.value.trim();
    renderSugestoes(termo);

    // Verifica se o texto coincide exatamente com algum item cadastrado
    const existeItem = window.tiposItensCarregados.some(item =>
      item.label.toLowerCase() === termo.toLowerCase() ||
      item.nome.toLowerCase() === termo.toLowerCase()
    );

    if (termo && !existeItem) {
      btnAdd.style.display = 'flex';
    } else {
      btnAdd.style.display = 'none';
    }
  });

  // Fecha a lista de sugestões ao clicar fora e sincroniza o select oculto
  document.addEventListener('click', (e) => {
    if (!div.contains(e.target)) {
      sugestoesDiv.style.display = 'none';

      // Tenta encontrar correspondência pelo texto escrito
      const termo = inputFiltro.value.toLowerCase().trim();
      const match = window.tiposItensCarregados.find(item =>
        item.label.toLowerCase() === termo || item.nome.toLowerCase() === termo
      );
      if (match) {
        // Actualiza o select oculto com o tipo encontrado
        selectEl.value = match.nome;
        inputFiltro.value = match.label; // normaliza o texto
      } else if (termo === '') {
        // Campo vazio: reverte para o valor actual do select
        const sel = selectEl.selectedOptions && selectEl.selectedOptions[0];
        if (sel) inputFiltro.value = sel.textContent;
      }
      // Se não há correspondência e o campo não está vazio, mantém o texto
      // mas deixa o select como está (será detectado em coletarItens como macacão)
    }
  });

  // Aciona a exibição da caixinha de cadastro inline
  const abrirCadastroNovoItem = (nome) => {
    if (!nome) return;
    novoNomeLbl.textContent = nome;
    novoDiasInput.value = "3";
    sugestoesDiv.style.display = 'none';
    btnAdd.style.display = 'none';
    novoBox.style.display = 'block';
    novoDiasInput.focus();
  };

  btnAdd.addEventListener('click', (e) => {
    e.stopPropagation();
    abrirCadastroNovoItem(inputFiltro.value.trim());
  });

  sugestoesDiv.addEventListener('click', (e) => {
    const addEl = e.target.closest('.sugestao-item-add');
    if (addEl) {
      abrirCadastroNovoItem(inputFiltro.value.trim());
    }
  });

  // Confirmação do cadastro inline
  btnConfirmar.addEventListener('click', async (e) => {
    e.stopPropagation();
    const novoNome = inputFiltro.value.trim();
    const val = parseInt(novoDiasInput.value);
    const novoDias = isNaN(val) ? 3 : val;

    if (!novoNome) return;

    // Exibe feedback visual
    btnConfirmar.textContent = "Salvando...";
    btnConfirmar.disabled = true;

    await salvarNovoTipoItem(novoNome, novoDias);

    // Atualiza todos os selects ativos na página para que o novo item fique selecionável
    document.querySelectorAll('#itens .item').forEach(itemDiv => {
      const outroSelect = itemDiv.querySelector('.tipo-item');
      const outroFiltro = itemDiv.querySelector('.filtro-tipo-item');

      // Só atualiza os selects que NÃO estão atualmente no meio de um cadastro
      if (outroSelect && outroSelect !== selectEl) {
        const valorAtual = outroSelect.value;
        outroSelect.innerHTML = "";
        window.tiposItensCarregados.forEach(it => {
          const opt = document.createElement('option');
          opt.value = it.nome;
          opt.dataset.dias = it.dias;
          opt.textContent = it.label;
          outroSelect.appendChild(opt);
        });
        outroSelect.value = valorAtual;
      }
    });

    // Repopula o select deste item e seleciona o recém-criado
    repopularSelect(novoNome.toLowerCase().trim());
    inputFiltro.value = novoNome.charAt(0).toUpperCase() + novoNome.slice(1);

    novoBox.style.display = 'none';
    btnConfirmar.textContent = "Confirmar";
    btnConfirmar.disabled = false;

    atualizarPrecoTotal();
  });

  // Cancelamento do cadastro inline
  btnCancelar.addEventListener('click', (e) => {
    e.stopPropagation();
    novoBox.style.display = 'none';
    // Restaura o campo de texto para a opção que estava anteriormente selecionada
    if (selectEl.selectedOptions && selectEl.selectedOptions[0]) {
      inputFiltro.value = selectEl.selectedOptions[0].textContent;
    }
  });

  const atualizarTotal = () => atualizarPrecoTotal();
  div.querySelector('.preco-item').addEventListener('input', atualizarTotal);
  div.querySelector('.quantidade-item').addEventListener('input', atualizarTotal);

  // Atualiza o preço total do pedido caso o select oculto mude (ex: via cliques na sugestão)
  selectEl.addEventListener('change', atualizarTotal);
}


// ==========================================
// 3. LISTAGEM E GERENCIAMENTO DE PEDIDOS
// ==========================================

async function corrigirAgendamentosRetroativos(pedidosPendentes) {
  // Exibe um aviso visual para o usuário
  await mostrarAviso(
    "Detetámos que existem pedidos agendados incorretamente para o próximo ano devido a um conflito de capacidade. Vamos recalcular os agendamentos automaticamente agora. Por favor, aguarde...",
    "Correção Automática",
    "⚙️"
  );

  // 1. Temporariamente define a data_entrega de todos os pedidos pendentes para a sua data_pedido
  // para evitar que um bloqueie o outro durante o recálculo
  for (const p of pedidosPendentes) {
    await supabase
      .from('pedidos')
      .update({ data_entrega: p.data_pedido })
      .eq('id', p.id);
  }

  // 2. Ordena os pedidos por data_pedido original de forma cronológica
  const ordenados = [...pedidosPendentes].sort((a, b) => a.data_pedido.localeCompare(b.data_pedido));

  // 3. Recalcula as datas de agendamento de cada um e atualiza no banco
  for (const p of ordenados) {
    let itens = [];
    try {
      itens = typeof p.itens === 'string' ? JSON.parse(p.itens) : p.itens;
    } catch (e) {
      console.error("Erro ao fazer parse dos itens do pedido no recálculo:", e);
      continue;
    }

    if (!itens || itens.length === 0) continue;

    let semanaData = ajustarParaSegunda(new Date(p.data_pedido + 'T12:00:00'));
    let diasTotais = itens.reduce((acc, i) => acc + (i.dias * i.quantidade), 0);

    // Encontra a primeira semana com espaço
    let limiteSeguranca = 0;
    while (!(await semanaTemEspaco(semanaData, [itens[0]], p.id)) && limiteSeguranca < 52) {
      semanaData.setDate(semanaData.getDate() + 7);
      limiteSeguranca++;
    }

    let dataInicioReal = new Date(p.data_pedido + 'T12:00:00');
    if (dataInicioReal < semanaData) dataInicioReal = new Date(semanaData);

    const dataEntrega = calcularDataEntrega(dataInicioReal, diasTotais);

    // Salva no banco com as datas corrigidas
    await supabase
      .from('pedidos')
      .update({
        data_pedido: formatarParaISO(dataInicioReal),
        data_entrega: formatarParaISO(dataEntrega)
      })
      .eq('id', p.id);
  }

  await mostrarAviso("Todos os agendamentos foram recalculados e corrigidos com sucesso!", "Sucesso", "✅");
  location.reload();
}

// Função para exibir as informações do cliente (Email e NIF)
window.verInformacoesCliente = async function(nome, emailClienteStr) {
    let nif = 'Não registado / 999999990';
    let email = emailClienteStr && emailClienteStr.trim() !== '' ? emailClienteStr : 'Não fornecido';
    let debugMsg = '';
    
    // Tentar obter o NIF do cliente
    if (nome) {
        try {
            const nomeLimpo = nome.trim();
            const { data: cliData, error } = await window.supabaseClient.from('clientes_financas')
                .select('nif')
                .ilike('nome', `%${nomeLimpo}%`)
                .limit(1);
            
            if (error) {
                debugMsg = `(Erro Supabase: ${error.message})`;
                console.error("Erro Supabase:", error);
            } else if (cliData && cliData.length > 0) {
                if (cliData[0].nif && String(cliData[0].nif).trim() !== '') {
                    nif = String(cliData[0].nif);
                } else {
                    debugMsg = `(Encontrado na BD, mas NIF está vazio)`;
                }
            } else {
                debugMsg = `(Nome '${nomeLimpo}' não encontrado na tabela clientes_financas)`;
            }
        } catch (err) {
            debugMsg = `(Exceção: ${err.message})`;
            console.error("Exceção ao buscar NIF:", err);
        }
    }
    
    // Mostra as info
    if (window.mostrarAviso) {
        window.mostrarAviso(`
            <div style="text-align:left; margin-top:15px; font-size:1.05rem; line-height:1.6; background:#f9f9f9; padding:15px; border-radius:8px; border:1px solid #eee;">
                <p style="margin:5px 0;"><strong>👤 Nome:</strong> ${nome}</p>
                <p style="margin:5px 0;"><strong>✉️ Email:</strong> ${email}</p>
                <p style="margin:5px 0;"><strong>🏢 NIF:</strong> ${nif} <span style="font-size:0.8rem; color:#888;">${debugMsg}</span></p>
            </div>
        `, "Informações do Cliente", "ℹ️");
    } else {
        alert(`Nome: ${nome}\nEmail: ${email}\nNIF: ${nif} ${debugMsg}`);
    }
}

// =====================================================
// AÇÕES CIRCULARES MINIMALISTAS & MENU (••) DOS CARDS DE PEDIDO
// =====================================================
const CARD_ACTION_ICONS = {
  check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  checkCircle: '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
  package: '<svg viewBox="0 0 24 24"><path d="M16.5 9.4l-9-5.19"></path><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
  euro: '<svg viewBox="0 0 24 24"><path d="M4 10h12"></path><path d="M4 14h9"></path><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"></path></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
  trash: '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>',
  undo: '<svg viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
  dots2: '<svg viewBox="0 0 24 24"><circle cx="8.5" cy="12" r="1.65" fill="currentColor" stroke="none"></circle><circle cx="15.5" cy="12" r="1.65" fill="currentColor" stroke="none"></circle></svg>'
};

function escaparAttrHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escaparJsEmHtmlAttr(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r?\n/g, ' ');
}

function criarBotaoIconeCard({ classeExtra = '', onclick, title, icone }) {
  const label = escaparAttrHtml(title);
  return `<button type="button" class="admin-only card-ico-btn ${classeExtra}" onclick="${onclick}" title="${label}" aria-label="${label}">${CARD_ACTION_ICONS[icone] || ''}</button>`;
}

function criarItemMenuCard({ classeExtra = '', onclick, icone, texto, dot = false }) {
  return `<button type="button" class="card-more-item ${classeExtra}" onclick="fecharTodosMenusCards(); ${onclick}">${CARD_ACTION_ICONS[icone] || ''}<span>${texto}</span>${dot ? '<span class="card-more-dot" title="Fatura anexada"></span>' : ''}</button>`;
}

window.fecharTodosMenusCards = function() {
  document.querySelectorAll('.card-more-menu.aberto').forEach(m => m.classList.remove('aberto'));
  document.querySelectorAll('.card-more-wrap.aberto').forEach(w => w.classList.remove('aberto'));
  document.querySelectorAll('.btn-ico-more.aberto').forEach(b => b.classList.remove('aberto'));
  document.querySelectorAll('.pedido.menu-aberto').forEach(c => c.classList.remove('menu-aberto'));
};

window.toggleMenuAcoesCard = function(event, btn) {
  if (event) event.stopPropagation();
  if (!btn) return;
  const wrap = btn.closest('.card-more-wrap');
  const menu = wrap && wrap.querySelector('.card-more-menu');
  const card = btn.closest('.pedido');
  const jaAberto = menu && menu.classList.contains('aberto');

  window.fecharTodosMenusCards();

  if (!jaAberto && menu) {
    menu.classList.add('aberto');
    btn.classList.add('aberto');
    if (wrap) wrap.classList.add('aberto');
    if (card) card.classList.add('menu-aberto');
  }
};

if (!window.__cardMenuListenersRegistrados) {
  window.__cardMenuListenersRegistrados = true;
  document.addEventListener('click', (e) => {
    if (!e.target || !e.target.closest || !e.target.closest('.card-more-wrap')) {
      window.fecharTodosMenusCards();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.fecharTodosMenusCards();
    }
  });
}

function construirAcoesPedido({ p, filtro, botaoAcao, novoStatus, estaPago, finalValueRendered, temFatura }) {
  const nomeJs = escaparJsEmHtmlAttr(p.nome);
  const emailJs = escaparJsEmHtmlAttr(p.email_cliente);
  const valorTotal = Number(p.preco_final || p.preco_total || 0);
  const textoFatura = temFatura ? 'Ver Fatura' : 'Anexar Fatura';
  const titleFatura = temFatura ? 'Ver ou atualizar link da fatura completa' : 'Anexar o link da fatura completa';

  const principais = [];
  const extras = [];

  if (filtro === 'pendente') {
    if (botaoAcao) {
      principais.push(criarBotaoIconeCard({
        classeExtra: 'btn-ico-primary',
        onclick: `mudarStatus('${p.id}', '${novoStatus}')`,
        title: botaoAcao,
        icone: 'check'
      }));
    }
    principais.push(
      criarBotaoIconeCard({
        onclick: `abrirEditorPedido('${p.id}')`,
        title: 'Editar',
        icone: 'edit'
      }),
      criarBotaoIconeCard({
        classeExtra: 'btn-ico-danger',
        onclick: `excluirPedido('${p.id}')`,
        title: 'Excluir',
        icone: 'trash'
      }),
      criarBotaoIconeCard({
        onclick: `verInformacoesCliente('${nomeJs}', '${emailJs}')`,
        title: 'Ver Informações',
        icone: 'info'
      })
    );

    extras.push(
      criarItemMenuCard({
        classeExtra: 'is-success',
        onclick: `concluirEPago('${p.id}', ${valorTotal})`,
        icone: 'checkCircle',
        texto: 'Concluído & Pago'
      }),
      criarItemMenuCard({
        classeExtra: 'is-info',
        onclick: `concluirPagoEEntregue('${p.id}', ${valorTotal})`,
        icone: 'package',
        texto: 'Concluído, Pago & Entregue'
      }),
      '<div class="card-more-sep"></div>',
      criarItemMenuCard({
        classeExtra: temFatura ? 'tem-fatura' : '',
        onclick: `abrirModalFatura('${p.id}')`,
        icone: 'file',
        texto: textoFatura,
        dot: temFatura
      })
    );
  } else if (filtro === 'concluido') {
    if (botaoAcao === 'Entregar') {
      if (estaPago) {
        principais.push(criarBotaoIconeCard({
          classeExtra: 'btn-ico-primary',
          onclick: `mudarStatus('${p.id}', '${novoStatus}')`,
          title: 'Entregar',
          icone: 'package'
        }));
      } else {
        principais.push(
          criarBotaoIconeCard({
            classeExtra: 'btn-ico-pay',
            onclick: `marcarComoPago('${p.id}', ${finalValueRendered})`,
            title: 'Marcar como Pago para libertar a entrega',
            icone: 'euro'
          }),
          criarBotaoIconeCard({
            classeExtra: 'btn-ico-locked',
            onclick: `alert('Não é possível entregar este pedido porque ainda não foi totalmente pago!')`,
            title: 'Entrega bloqueada: aguarda pagamento',
            icone: 'lock'
          })
        );
      }
    }
    principais.push(criarBotaoIconeCard({
      onclick: `verInformacoesCliente('${nomeJs}', '${emailJs}')`,
      title: 'Ver Informações',
      icone: 'info'
    }));

    extras.push(
      criarItemMenuCard({
        classeExtra: 'is-warn',
        onclick: `mudarStatus('${p.id}', 'pendente')`,
        icone: 'undo',
        texto: 'Reabrir Pedido'
      }),
      '<div class="card-more-sep"></div>',
      criarItemMenuCard({
        classeExtra: temFatura ? 'tem-fatura' : '',
        onclick: `abrirModalFatura('${p.id}')`,
        icone: 'file',
        texto: textoFatura,
        dot: temFatura
      })
    );
  } else if (filtro === 'entregue') {
    principais.push(
      criarBotaoIconeCard({
        onclick: `verInformacoesCliente('${nomeJs}', '${emailJs}')`,
        title: 'Ver Informações',
        icone: 'info'
      }),
      criarBotaoIconeCard({
        classeExtra: `btn-ico-fatura${temFatura ? ' tem-fatura' : ''}`,
        onclick: `abrirModalFatura('${p.id}')`,
        title: titleFatura,
        icone: 'file'
      })
    );

    extras.push(
      criarItemMenuCard({
        classeExtra: 'is-warn',
        onclick: `mudarStatus('${p.id}', 'concluido', false)`,
        icone: 'undo',
        texto: 'Desfazer Entrega'
      }),
      '<div class="card-more-sep"></div>',
      criarItemMenuCard({
        classeExtra: 'is-danger',
        onclick: `removerDoHistorico('${p.id}', '${nomeJs}', this)`,
        icone: 'trash',
        texto: 'Remover do Histórico'
      })
    );
  }

  return `
    <div class="acoes-pedido admin-only">
      <div class="acoes-principais">
        ${principais.join('')}
      </div>
      ${extras.length > 0 ? `
        <div class="card-more-wrap admin-only">
          <button type="button" class="admin-only card-ico-btn btn-ico-more" onclick="toggleMenuAcoesCard(event, this)" title="Mais opções" aria-label="Mais opções">
            ${CARD_ACTION_ICONS.dots2}
          </button>
          <div class="card-more-menu" onclick="event.stopPropagation()">
            ${extras.join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Substitua a função carregarPedidos no seu script.js por esta:

const HISTORICO_OCULTO_MARKER = '__oculto_historico__';

function estaOcultoNoHistorico(pedido, idsOcultosLocal = []) {
  if (!pedido) return false;
  if (pedido.status === 'arquivado' || pedido.oculto_historico === true) return true;
  if (String(pedido.fatura_status_envio || '').includes(HISTORICO_OCULTO_MARKER)) return true;
  return Array.isArray(idsOcultosLocal) && idsOcultosLocal.includes(String(pedido.id));
}

function registarOcultoHistoricoLocal(id) {
  try {
    const arr = JSON.parse(localStorage.getItem('pedidos_ocultos_historico') || '[]').map(String);
    if (!arr.includes(String(id))) {
      arr.push(String(id));
      localStorage.setItem('pedidos_ocultos_historico', JSON.stringify(arr));
    }
  } catch (e) {}
}

async function arquivarPedidoSemErroStatus(client, id, pedidoAtual = null) {
  // 1. Tenta coluna booleana dedicada (não altera status nem viola pedidos_status_check)
  const { error: errCol } = await client
    .from('pedidos')
    .update({ oculto_historico: true })
    .eq('id', id);
  if (!errCol) {
    registarOcultoHistoricoLocal(id);
    return { ok: true, via: 'oculto_historico' };
  }

  // 2. Fallback: status = 'arquivado' caso o banco permita na constraint
  const { error: errStatus } = await client
    .from('pedidos')
    .update({ status: 'arquivado' })
    .eq('id', id);
  if (!errStatus) {
    registarOcultoHistoricoLocal(id);
    return { ok: true, via: 'status' };
  }

  // 3. Fallback universal compatível com bancos sem oculto_historico e com pedidos_status_check restrito
  const statusEnvioAtual = String(pedidoAtual?.fatura_status_envio || '').trim();
  const novoStatusEnvio = statusEnvioAtual.includes(HISTORICO_OCULTO_MARKER)
    ? statusEnvioAtual
    : (statusEnvioAtual ? `${statusEnvioAtual}|${HISTORICO_OCULTO_MARKER}` : HISTORICO_OCULTO_MARKER);

  const { error: errMarker } = await client
    .from('pedidos')
    .update({ fatura_status_envio: novoStatusEnvio })
    .eq('id', id);
  if (!errMarker) {
    registarOcultoHistoricoLocal(id);
    return { ok: true, via: 'fatura_status_envio' };
  }

  throw errMarker;
}

async function carregarPedidos(filtro, destino, botaoAcao, novoStatus) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('status', filtro)
    .order('data_pedido');

  const container = document.getElementById(destino);
  container.innerHTML = ''; // 1. APAGA O "A CARREGAR..."

  // --- SE DER ERRO ---
  if (error) {
    container.innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar: ${error.message}</p>`;
    return;
  }

  // --- TRIGGER DE CORREÇÃO RETROATIVA AUTOMÁTICA ---
  if (filtro === 'pendente' && data && data.length > 0) {
    const temPedidoBugado = data.some(p => {
      if (!p.data_pedido || !p.data_entrega) return false;
      const diffTime = Math.abs(new Date(p.data_entrega) - new Date(p.data_pedido));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 90;
    });

    if (temPedidoBugado) {
      await corrigirAgendamentosRetroativos(data);
      return;
    }
  }

  let idsOcultosLocal = [];
  try {
    idsOcultosLocal = JSON.parse(localStorage.getItem('pedidos_ocultos_historico') || '[]').map(String);
  } catch (e) {}

  let pedidosVisiveis = Array.isArray(data) ? data : [];
  if (filtro === 'entregue') {
    pedidosVisiveis = pedidosVisiveis.filter(p => !estaOcultoNoHistorico(p, idsOcultosLocal));
  }

  // --- SE A LISTA ESTIVER VAZIA (O SEU CASO) ---
  if (pedidosVisiveis.length === 0) {
    container.innerHTML = `
        <div style="text-align: center; color: #777; margin-top: 30px;">
            <p style="font-size: 2rem;">📭</p>
            <p>Não há pedidos nesta lista no momento.</p>
        </div>
    `;
    return; // Para a função aqui, não faz mais nada
  }

  // --- ANEXAR AS FATURAS AOS PEDIDOS ---
  const pedidoIds = pedidosVisiveis.map(p => p.id);
  const { data: faturas } = await supabase.from('faturas').select('pedido_id, simples_link, final_link').in('pedido_id', pedidoIds);

  pedidosVisiveis.forEach(p => {
    // Liga a fatura ao pedido para o botão de faturar saber o estado
    if (faturas) {
        const fatura = faturas.find(f => f.pedido_id === p.id);
        if (fatura) {
            p.fatura_simples_link = fatura.simples_link;
            p.fatura_final_link = fatura.final_link;
        }
    }

    // --- CORREÇÃO PARA O TIPO JSONB ---
    let itensList = [];
    try {
      if (typeof p.itens === 'object' && p.itens !== null) {
        // Se já vier como objeto (o que acontece com jsonb), usa direto
        itensList = p.itens;
      } else if (typeof p.itens === 'string') {
        // Se vier como texto, converte
        itensList = JSON.parse(p.itens);
      }
    } catch (e) {
      console.error("Erro ao ler itens do pedido:", p.nome, e);
      itensList = []; // Evita quebrar a página se o JSON estiver ruim
    }
    // ----------------------------------

    const div = document.createElement('div');
    div.className = 'pedido';
    div.setAttribute('data-nome', p.nome ? p.nome.toLowerCase() : "");
    div.setAttribute('data-data', p.data_pedido || '');

    // Formata datas para o padrão PT (Dia/Mês/Ano) - Protegido contra fuso horário
    const dataPedidoF = formatarDataParaExibir(p.data_real || p.data_pedido);
    const dataEntregaF = formatarDataParaExibir(p.data_entrega);

    const temFatura = Boolean(p.fatura_final_link || p.fatura_simples_link);
    const indicadorFaturaHtml = temFatura
      ? '<span class="fatura-valor-dot" title="Fatura anexada"></span>'
      : '';

    const precoOriginal = p.preco_total ? Number(p.preco_total).toFixed(2) : '0.00';
    let precoDisplay = `<p class="pedido-total-linha"><strong>Total:</strong> €${precoOriginal}${indicadorFaturaHtml}</p>`;

    let finalValueRendered = p.preco_total ? Number(p.preco_total) : 0;

    if (p.cupao_codigo && p.desconto_percentagem) {
      finalValueRendered = p.preco_final || p.preco_total;
      precoDisplay = `
       <div style="background:#fff8e1; border:1px solid #ffe082; padding:10px; border-radius:6px; margin-bottom:10px;">
         <p style="margin:0 0 5px 0; text-decoration:line-through; color:#777; font-size:0.9rem;">Subtotal: €${precoOriginal}</p>
         <p style="margin:0 0 5px 0; font-size:0.95rem;">🎟️ Cupão <strong>${p.cupao_codigo}</strong> (-${p.desconto_percentagem}%)</p>
         <p class="pedido-total-linha" style="margin:0; font-size:1.1rem; color:#d4af37;"><strong>Total a Pagar: €${Number(finalValueRendered).toFixed(2)}</strong>${indicadorFaturaHtml}</p>
       </div>
       `;
    }

    // Caixa de pagamento: aparece SEMPRE em todos os pedidos
    {
      const adiantado = p.valor_adiantado ? Number(p.valor_adiantado) : 0;
      if (!p.cupao_codigo) {
        finalValueRendered = p.preco_total ? Number(p.preco_total) : 0;
      } else {
        finalValueRendered = p.preco_final ? Number(p.preco_final) : (p.preco_total ? Number(p.preco_total) : 0);
      }
      const falta = Math.max(0, finalValueRendered - adiantado);
      const pct = finalValueRendered > 0 ? Math.min(100, Math.round((adiantado / finalValueRendered) * 100)) : 0;
      const corGrafico = pct === 100 ? '#4caf50' : (pct > 50 ? '#ff9800' : '#f44336');

      precoDisplay += `
       <div style="background:#f4f9f4; border:1px solid #c8e6c9; padding:10px; border-radius:6px; margin-bottom:10px; display:flex; align-items:center; gap:15px;">
         <div style="position:relative; width:54px; height:54px; border-radius:50%; background: conic-gradient(${corGrafico} ${pct * 3.6}deg, #e0e0e0 0deg); display:flex; justify-content:center; align-items:center; flex-shrink:0;">
            <div style="width:42px; height:42px; background:#f4f9f4; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:0.8rem; font-weight:bold; color:#2e7d32;">${pct}%</div>
         </div>
         <div style="flex:1; min-width:0;">
            <p style="margin:0 0 3px 0; font-size:0.85rem; color:#2e7d32;"><strong>Pago:</strong> €${adiantado.toFixed(2)} / €${finalValueRendered.toFixed(2)}</p>
            <p style="margin:0; font-size:1rem; color:#c62828;"><strong>Falta:</strong> €${falta.toFixed(2)}</p>
         </div>
       </div>
       `;
    }

    const adiantadoVal = p.valor_adiantado ? Number(p.valor_adiantado) : 0;
    const estaPago = (finalValueRendered - adiantadoVal) <= 0.01;
    div.setAttribute('data-pago', estaPago ? 'sim' : 'nao');
    const isProntoAVestir = Array.isArray(itensList) && itensList.length > 0 && itensList.every(i => parseInt(i.dias) === 0);

    div.innerHTML = `
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;">
        <strong>${p.nome} ${isProntoAVestir ? '<span style="background:#e8f5e9; color:#2e7d32; font-size:0.7rem; font-weight:bold; padding:3px 8px; border-radius:12px; margin-left:5px; white-space:nowrap; border: 1px solid #c8e6c9;">🛍️ Pronto a Vestir</span>' : ''}</strong>
        ${(filtro === 'pendente' || filtro === 'concluido') ? `
          <label class="admin-only" title="Selecionar" style="display:flex; align-items:center; gap:5px; cursor:pointer; font-size:0.8rem; color:#888; white-space:nowrap; margin-top:2px;">
            <input type="checkbox" class="check-selecionar" data-id="${p.id}" 
              onchange="atualizarBarraSel()" 
              style="width:16px; height:16px; cursor:pointer; accent-color:#2e7d32;">
            Selecionar
          </label>` : ''}
      </div>
      <ul>
        ${Array.isArray(itensList) ? itensList.map(i => `
          <li style="${i.concluido ? 'opacity:0.55;' : ''}">
            ${i.concluido ? '<span style="color:#4caf50; font-weight:bold; margin-right:4px;">✓</span>' : ''}
            <strong style="${i.concluido ? 'text-decoration:line-through;' : ''}">${i.subtipo || 'Item'}</strong> (${i.quantidade || 1}x)
            ${i.concluido ? '<span style="background:#e8f5e9; color:#2e7d32; font-size:0.7rem; font-weight:bold; padding:2px 6px; border-radius:10px; margin-left:4px; border:1px solid #c8e6c9;">Concluído</span>' : ''}
            ${!i.concluido && parseInt(i.dias) === 0 ? `<span style="background:#e8f5e9; color:#2e7d32; font-size:0.7rem; font-weight:bold; padding:2px 6px; border-radius:10px; margin-left:5px; border: 1px solid #c8e6c9;">🛍️ Pronto a Vestir</span>` : ''}
            ${i.descricao ? `<br><em style="${i.concluido ? 'text-decoration:line-through;' : ''}">${i.descricao}</em>` : ''}
          </li>
        `).join('') : '<li>Erro nos itens</li>'}
      </ul>
      <p style="font-size: 0.9rem; color: #555;">
         Pedido: ${dataPedidoF} | 
         Entrega: <strong>${dataEntregaF}</strong>
      </p>
      
      ${precoDisplay}
      
      ${construirAcoesPedido({ p, filtro, botaoAcao, novoStatus, estaPago, finalValueRendered, temFatura })}
    `;
    container.appendChild(div);
  });

  esconderBotoesSeCliente();

  // Applica Masonry effect após os itens estarem no DOM
  setTimeout(() => {
    aplicarMasonryUI(filtro);
  }, 50);
}

async function mudarStatus(id, novoStatus, enviarEmail = true) {
  if (novoStatus === 'concluido' && enviarEmail) {
    try {
      await enviarEmailConclusao(id, supabase);
    } catch (err) {
      console.error("❌ ERRO AO TENTAR ENVIAR EMAIL:", err);
      await mostrarAviso("O pedido foi marcado como concluído, mas falhou o envio do email de notificação. Verifique a consola.", "Aviso", "⚠️");
    }
  }

  await supabase.from('pedidos').update({ status: novoStatus }).eq('id', id);
  location.reload();
}

// Lê os pagamentos já registados e calcula quanto falta pagar para atingir precoFinal
async function buscarPagamentosERestante(id, precoFinal) {
  const { data: p } = await supabase.from('pedidos').select('pagamentos').eq('id', id).single();
  let pgmts = [];
  try { pgmts = p && p.pagamentos ? (typeof p.pagamentos === 'string' ? JSON.parse(p.pagamentos) : p.pagamentos) : []; } catch(e) {}
  const jaAdiantado = pgmts.reduce((s, x) => s + (parseFloat(x.valor) || 0), 0);
  return { pgmts, restante: Number(precoFinal) - jaAdiantado };
}

// Overlay de confirmação partilhado pelas ações rápidas de pagamento. Quando há um valor
// por registar (valorAPagar > 0), obriga a escolher o método de pagamento antes de confirmar.
function confirmarPagamento({ icone, titulo, mensagem, valorAPagar, corBtn = '#2e7d32' }) {
  return new Promise(resolve => {
    const precisaMetodo = Number(valorAPagar) > 0.01;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:28px 30px;max-width:360px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,.2);text-align:center;">
        <div style="font-size:2.5rem;margin-bottom:10px;">${icone}</div>
        <h3 style="margin:0 0 8px;font-size:1.1rem;">${titulo}</h3>
        <p style="color:#666;font-size:0.9rem;margin-bottom:${precisaMetodo ? '14px' : '20px'};">${mensagem}</p>
        ${precisaMetodo ? `
        <div style="text-align:left;margin-bottom:16px;">
          <label style="display:block;font-size:0.82rem;color:#555;margin-bottom:4px;">Método de pagamento:</label>
          <select id="conf-metodo-pagamento" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:8px;font-size:0.92rem;background:#fff;box-sizing:border-box;">
            ${opcoesMetodoPagamento('')}
          </select>
          <p id="conf-metodo-erro" style="display:none;color:#c62828;font-size:0.78rem;margin:6px 0 0;">Escolhe o método de pagamento.</p>
        </div>` : ''}
        <div style="display:flex;gap:10px;">
          <button id="btn-conf-ok" style="flex:1;background:${corBtn};color:#fff;border:none;border-radius:8px;padding:11px;font-size:1rem;cursor:pointer;margin:0;">✅ Confirmar</button>
          <button id="btn-conf-cancel" style="flex:1;background:#f5f5f5;color:#555;border:1px solid #ddd;border-radius:8px;padding:11px;font-size:1rem;cursor:pointer;margin:0;">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#btn-conf-ok').onclick = () => {
      const selMetodo = overlay.querySelector('#conf-metodo-pagamento');
      const metodo = selMetodo ? selMetodo.value : '';
      if (precisaMetodo && !metodo) {
        overlay.querySelector('#conf-metodo-erro').style.display = 'block';
        selMetodo.style.borderColor = '#c62828';
        return;
      }
      document.body.removeChild(overlay);
      resolve({ confirmado: true, metodo });
    };
    overlay.querySelector('#btn-conf-cancel').onclick = () => { document.body.removeChild(overlay); resolve({ confirmado: false, metodo: '' }); };
  });
}

// =====================================================
// CONCLUIR & PAGO — individual
// =====================================================
async function concluirEPago(id, precoFinal) {
  const { pgmts, restante } = await buscarPagamentosERestante(id, precoFinal);
  const { confirmado, metodo } = await confirmarPagamento({
    icone: '✅',
    titulo: 'Concluir e Marcar como Pago?',
    mensagem: `Este pedido será marcado como <strong>Concluído</strong> e o valor de <strong style="color:#2e7d32;">€${Number(precoFinal).toFixed(2)}</strong> ficará registado como 100% pago.`,
    valorAPagar: restante
  });

  if (!confirmado) return;

  try { await enviarEmailConclusao(id, supabase); } catch (e) { console.warn('Email falhou:', e); }

  await registarPagamentoFinal(id, precoFinal, 'concluido', metodo, pgmts);
  location.reload();
}

// =====================================================
// CONCLUIR, PAGO & ENTREGUE — individual
// =====================================================
window.concluirPagoEEntregue = async function (id, precoFinal) {
  const { pgmts, restante } = await buscarPagamentosERestante(id, precoFinal);
  const { confirmado, metodo } = await confirmarPagamento({
    icone: '📦',
    titulo: 'Concluir, Pagar & Entregar?',
    mensagem: `Este pedido será marcado como <strong>Entregue</strong> e o valor de <strong style="color:#2e7d32;">€${Number(precoFinal).toFixed(2)}</strong> ficará registado como 100% pago.`,
    valorAPagar: restante
  });

  if (!confirmado) return;

  try { await enviarEmailConclusao(id, supabase); } catch (e) { console.warn('Email falhou:', e); }

  await registarPagamentoFinal(id, precoFinal, 'entregue', metodo, pgmts);
  location.reload();
};

// Regista o pagamento final (100%) preservando histórico de pagamentos anteriores
async function registarPagamentoFinal(id, precoFinal, novoStatus, metodo = '', pgmtsExistentes = null) {
  let pgmts = pgmtsExistentes;
  if (!pgmts) ({ pgmts } = await buscarPagamentosERestante(id, precoFinal));
  pgmts = [...pgmts];
  const jaAdiantado = pgmts.reduce((s, x) => s + (parseFloat(x.valor) || 0), 0);
  const restante = Number(precoFinal) - jaAdiantado;
  if (restante > 0.01) {
    pgmts.push({ valor: restante, data: formatarParaISO(new Date()), nota: 'Pagamento final', metodo });
  }
  await supabase.from('pedidos').update({
    status: novoStatus,
    valor_adiantado: precoFinal,
    pagamentos: JSON.stringify(pgmts)
  }).eq('id', id);
}

// Opções reutilizadas nos selects de método de pagamento (MB Way / Dinheiro / Multibanco)
function opcoesMetodoPagamento(selecionado = '') {
  const metodos = [['', 'Método...'], ['mbway', 'MB Way'], ['dinheiro', 'Dinheiro'], ['multibanco', 'Multibanco']];
  return metodos.map(([valor, label]) =>
    `<option value="${valor}"${valor === (selecionado || '') ? ' selected' : ''}>${label}</option>`
  ).join('');
}

// Funções UI de pagamentos no modal de edição
window.adicionarLinhaPagamento = function(valor = '', data = '', nota = '', metodo = '') {
  const lista = document.getElementById('editor-pagamentos-lista');
  if (!lista) return;
  const hoje = formatarParaISO(new Date());
  const div = document.createElement('div');
  div.className = 'pgmt-linha';
  div.style.cssText = 'display:flex; gap:6px; align-items:center; flex-wrap:wrap;';
  div.innerHTML = `
    <input type="number" class="pgmt-valor" placeholder="€ Valor" value="${valor}" min="0" step="0.01"
      style="flex:1; padding:7px; border:1px solid #a5d6a7; border-radius:5px; font-size:0.9rem;"
      oninput="atualizarTotalPago()">
    <input type="date" class="pgmt-data" value="${data || hoje}"
      style="flex:1; padding:7px; border:1px solid #a5d6a7; border-radius:5px; font-size:0.9rem;">
    <select class="pgmt-metodo"
      style="flex:1; padding:7px; border:1px solid #a5d6a7; border-radius:5px; font-size:0.9rem; background:#fff;">
      ${opcoesMetodoPagamento(metodo)}
    </select>
    <input type="text" class="pgmt-nota" placeholder="Nota (opcional)" value="${nota}"
      style="flex:1.5; padding:7px; border:1px solid #ddd; border-radius:5px; font-size:0.9rem;">
    <button type="button" onclick="this.closest('.pgmt-linha').remove(); atualizarTotalPago();"
      style="background:none; border:none; cursor:pointer; color:#ccc; font-size:1.2rem; padding:0 4px; line-height:1;">×</button>`;
  lista.appendChild(div);
  atualizarTotalPago();
};

window.atualizarTotalPago = function() {
  const linhas = document.querySelectorAll('#editor-pagamentos-lista .pgmt-linha');
  let total = 0;
  linhas.forEach(l => total += parseFloat(l.querySelector('.pgmt-valor').value) || 0);
  const el = document.getElementById('editor-total-pago');
  if (el) el.textContent = '€ ' + total.toFixed(2);
  const hidden = document.getElementById('editor-valor-adiantado');
  if (hidden) hidden.value = total;
};

window.marcarComoPago = async function (id, total) {
  const { pgmts, restante } = await buscarPagamentosERestante(id, total);
  const { confirmado, metodo } = await confirmarPagamento({
    icone: '💶',
    titulo: 'Marcar como Pago?',
    mensagem: `Deseja marcar este pedido como totalmente pago (€${Number(total).toFixed(2)})?`,
    valorAPagar: restante
  });
  if (!confirmado) return;

  const novosPgmts = [...pgmts];
  if (restante > 0.01) {
    novosPgmts.push({ valor: restante, data: formatarParaISO(new Date()), nota: 'Marcado como pago', metodo });
  }

  try {
    const { error } = await supabase
      .from('pedidos')
      .update({ valor_adiantado: total, pagamentos: JSON.stringify(novosPgmts) })
      .eq('id', id);

    if (error) {
      await mostrarAviso("Erro ao marcar como pago: " + error.message, "Erro", "❌");
    } else {
      await mostrarAviso("Pedido marcado como pago com sucesso!", "Sucesso", "✅");
      location.reload();
    }
  } catch (err) {
    await mostrarAviso("Erro ao marcar como pago: " + err.message, "Erro", "❌");
  }
};

// =====================================================
// SELEÇÃO MÚLTIPLA — barra flutuante
// =====================================================
function atualizarBarraSel() {
  const checks = Array.from(document.querySelectorAll('.check-selecionar:checked'));
  let barra = document.getElementById('barra-sel-multipla');

  if (checks.length === 0) {
    if (barra) barra.style.display = 'none';
    return;
  }

  if (!barra) {
    barra = document.createElement('div');
    barra.id = 'barra-sel-multipla';
    barra.style.cssText = `
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      background:#1a1a2e; color:#fff; border-radius:40px;
      padding:12px 22px; display:flex; align-items:center; gap:14px;
      box-shadow:0 8px 30px rgba(0,0,0,.35); z-index:5000;
      font-family:sans-serif; font-size:0.9rem; animation:slideUp .25s ease-out;
    `;
    document.body.appendChild(barra);

    const style = document.createElement('style');
    style.textContent = `@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
    document.head.appendChild(style);
  }

  barra.style.display = 'flex';

  const isConcluidoPage = window.location.pathname.includes('concluidos');
  if (isConcluidoPage) {
    barra.innerHTML = `
      <span id="barra-sel-count" style="font-weight:bold;">${checks.length} selecionado(s)</span>
      <button onclick="entregarMultiplo()" style="background:#2e7d32;color:#fff;border:none;border-radius:20px;padding:8px 18px;font-size:0.88rem;font-weight:bold;cursor:pointer;margin:0;">📦 Entregar todos</button>
      <button onclick="desmarcarTodos()" style="background:transparent;color:#aaa;border:1px solid #444;border-radius:20px;padding:7px 14px;font-size:0.85rem;cursor:pointer;margin:0;">✕ Cancelar</button>
    `;
  } else {
    barra.innerHTML = `
      <span id="barra-sel-count" style="font-weight:bold;">${checks.length} selecionado(s)</span>
      <button onclick="concluirEPagoMultiplo()" style="background:#2e7d32;color:#fff;border:none;border-radius:20px;padding:8px 18px;font-size:0.88rem;font-weight:bold;cursor:pointer;margin:0;">✅ Concluir todos & Pago</button>
      <button onclick="desmarcarTodos()" style="background:transparent;color:#aaa;border:1px solid #444;border-radius:20px;padding:7px 14px;font-size:0.85rem;cursor:pointer;margin:0;">✕ Cancelar</button>
    `;
  }
}

function desmarcarTodos() {
  document.querySelectorAll('.check-selecionar').forEach(c => c.checked = false);
  const barra = document.getElementById('barra-sel-multipla');
  if (barra) barra.style.display = 'none';
}

async function concluirEPagoMultiplo() {
  const checks = Array.from(document.querySelectorAll('.check-selecionar:checked'));
  if (checks.length === 0) return;

  const ids = checks.map(c => c.dataset.id);

  const confirmado = await new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:28px 30px;max-width:380px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,.2);text-align:center;">
        <div style="font-size:2.5rem;margin-bottom:10px;">🎉</div>
        <h3 style="margin:0 0 8px;font-size:1.1rem;">Concluir ${ids.length} pedido(s)?</h3>
        <p style="color:#666;font-size:0.9rem;margin-bottom:20px;">Todos os pedidos selecionados serão marcados como <strong>Concluídos</strong> com pagamento a <strong style="color:#2e7d32;">100%</strong>.</p>
        <div style="display:flex;gap:10px;">
          <button id="btn-m-ok" style="flex:1;background:#2e7d32;color:#fff;border:none;border-radius:8px;padding:11px;font-size:1rem;cursor:pointer;margin:0;">✅ Confirmar tudo</button>
          <button id="btn-m-cancel" style="flex:1;background:#f5f5f5;color:#555;border:1px solid #ddd;border-radius:8px;padding:11px;font-size:1rem;cursor:pointer;margin:0;">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#btn-m-ok').onclick = () => { document.body.removeChild(overlay); resolve(true); };
    overlay.querySelector('#btn-m-cancel').onclick = () => { document.body.removeChild(overlay); resolve(false); };
  });

  if (!confirmado) return;

  // Busca os preços dos pedidos selecionados para definir o pago a 100%
  const { data: pedidosSel } = await supabase
    .from('pedidos')
    .select('id, preco_final, preco_total')
    .in('id', ids);

  const updates = (pedidosSel || []).map(p =>
    supabase.from('pedidos').update({
      status: 'concluido',
      valor_adiantado: Number(p.preco_final || p.preco_total || 0)
    }).eq('id', p.id)
  );

  await Promise.all(updates);

  // Tenta enviar emails (sem bloquear)
  for (const id of ids) {
    try { await enviarEmailConclusao(id, supabase); } catch (e) { console.warn('Email falhou para', id); }
  }

  location.reload();
}

async function entregarMultiplo() {
  const checks = Array.from(document.querySelectorAll('.check-selecionar:checked'));
  if (checks.length === 0) return;

  const ids = checks.map(c => c.dataset.id);

  // Busca os pedidos selecionados para verificar se estão pagos
  const { data: pedidosSel, error } = await supabase
    .from('pedidos')
    .select('id, nome, preco_final, preco_total, valor_adiantado')
    .in('id', ids);

  if (error || !pedidosSel) {
    await mostrarAviso("Erro ao buscar dados dos pedidos.", "Erro", "❌");
    return;
  }

  // Verifica se há algum pedido não pago
  const naoPagos = pedidosSel.filter(p => {
    const finalValue = p.preco_final !== null ? Number(p.preco_final) : Number(p.preco_total || 0);
    const adiantado = Number(p.valor_adiantado || 0);
    return (finalValue - adiantado) > 0.01;
  });

  if (naoPagos.length > 0) {
    const nomesNaoPagos = naoPagos.map(p => p.nome).join(', ');
    await mostrarAviso(`Não é possível entregar todos os pedidos porque alguns ainda não foram totalmente pagos: ${nomesNaoPagos}. Por favor, marque-os como pagos primeiro.`, "Pagamento em Falta", "⚠️");
    return;
  }

  const confirmado = await mostrarConfirmacao(`Deseja marcar ${ids.length} pedido(s) como Entregues?`, "Confirmar Entrega Múltipla", "📦");
  if (!confirmado) return;

  const updates = ids.map(id =>
    supabase.from('pedidos').update({ status: 'entregue' }).eq('id', id)
  );

  await Promise.all(updates);

  await mostrarAviso("Pedidos entregues com sucesso!", "Sucesso", "✅");
  location.reload();
}

window.entregarMultiplo = entregarMultiplo;

async function excluirPedido(id) {
  const confirmado = await mostrarConfirmacao("Tem a certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.", "Excluir Pedido", "🗑️");
  if (!confirmado) {
    return;
  }
  try {
    const { error } = await supabase.from('pedidos').delete().eq('id', id);
    if (error) {
      console.error("Erro ao excluir pedido:", error);
      await mostrarAviso("Não foi possível excluir o pedido: " + error.message, "Erro", "❌");
    } else {
      await mostrarAviso("Pedido excluído com sucesso!", "Sucesso", "✅");
      location.reload();
    }
  } catch (err) {
    console.error("Erro inesperado:", err);
    await mostrarAviso("Ocorreu um erro inesperado: " + err.message, "Erro", "❌");
  }
}

// Remove o pedido da visualização do Histórico mas salvaguarda faturação, NIF e Ficha do Cliente
async function removerDoHistorico(id, nomeCliente, btnEl) {
  const nomeExibir = nomeCliente ? ` de "${nomeCliente}"` : '';
  const confirmado = window.mostrarConfirmacao
    ? await window.mostrarConfirmacao(
        `Tem a certeza que deseja remover o pedido${nomeExibir} do mural de Histórico?<br><br><small style="color:#666;">Os dados de faturação, NIF e o registo na Central de Clientes continuarão guardados no sistema.</small>`,
        "Remover do Histórico",
        "alert",
        "Sim, Remover",
        "Cancelar"
      )
    : confirm(`Remover o pedido${nomeExibir} do histórico? Os registos de faturação e NIF serão mantidos no sistema.`);

  if (!confirmado) return;

  if (btnEl) {
    btnEl.disabled = true;
    btnEl.style.opacity = '0.6';
  }

  try {
    const client = window.supabaseClient || supabase;

    // 1. Busca os dados atuais do pedido
    const { data: p, error: errBusca } = await client
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single();

    if (!errBusca && p) {
      let nifCliente = '999999990';
      const nomeLimpo = (p.nome || '').trim();

      // 2. Garante que o cliente está registado em clientes_financas (sem conflito de UNIQUE no NIF 999999990)
      if (nomeLimpo) {
        try {
          const { data: cliExistente } = await client
            .from('clientes_financas')
            .select('id, nif, email')
            .ilike('nome', nomeLimpo)
            .limit(1);

          if (cliExistente && cliExistente.length > 0) {
            if (cliExistente[0].nif && cliExistente[0].nif.trim() !== '') {
              nifCliente = cliExistente[0].nif.trim();
            }
            if (!cliExistente[0].email && p.email_cliente) {
              await client.from('clientes_financas').update({ email: p.email_cliente }).eq('id', cliExistente[0].id);
            }
          } else {
            await client.from('clientes_financas').insert([{
              nome: nomeLimpo,
              email: p.email_cliente || null,
              nif: null,
              telefone: p.fatura_contato_envio || null
            }]);
          }
        } catch (eCli) {
          console.warn("Aviso ao salvaguardar em clientes_financas:", eCli);
        }
      }

      // 3. Garante que os dados fiscais/faturação deste pedido ficam registados na tabela 'faturas'
      try {
        const { data: faturaExistente } = await client
          .from('faturas')
          .select('id, nif, valor_total')
          .eq('pedido_id', id)
          .limit(1);

        const valorPedido = p.fatura_valor_total !== null && p.fatura_valor_total !== undefined
          ? Number(p.fatura_valor_total)
          : Number(p.preco_final || p.preco_total || 0);

        if (!faturaExistente || faturaExistente.length === 0) {
          if (valorPedido > 0 || p.fatura_final_link || p.fatura_simples_link) {
            await client.from('faturas').insert([{
              pedido_id: p.id,
              nome_cliente: nomeLimpo || p.nome,
              nif: nifCliente,
              data_emissao: p.fatura_data_emissao || (p.data_real ? new Date(p.data_real).toISOString() : new Date().toISOString()),
              valor_total: valorPedido,
              fatura_codigo: p.fatura_codigo || null,
              simples_link: p.fatura_simples_link || null,
              final_link: p.fatura_final_link || null,
              status_envio: (p.fatura_final_link || p.fatura_simples_link) ? 'enviado' : 'pendente'
            }]);
          }
        }
      } catch (eFat) {
        console.warn("Aviso ao salvaguardar em faturas:", eFat);
      }
    }

    // 4. Arquiva/oculta o pedido para que não apareça mais na página de Histórico (entregues.html),
    // mantendo-o na base de dados para Finanças, Dashboard e Central de Clientes
    await arquivarPedidoSemErroStatus(client, id, p);

    // Remove o cartão imediatamente da interface sem precisar esperar recarregar tudo
    const cardEl = btnEl ? btnEl.closest('.pedido') : null;
    if (cardEl) {
      cardEl.style.transition = 'opacity 0.2s, transform 0.2s';
      cardEl.style.opacity = '0';
      cardEl.style.transform = 'scale(0.96)';
      setTimeout(() => cardEl.remove(), 200);
    } else {
      location.reload();
    }
  } catch (err) {
    console.error("Erro ao remover pedido do histórico:", err);
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.style.opacity = '1';
    }
    if (window.mostrarAviso) {
      await window.mostrarAviso("Ocorreu um erro ao remover: " + err.message, "Erro", "error");
    } else {
      alert("Erro ao remover: " + err.message);
    }
  }
}
window.removerDoHistorico = removerDoHistorico;

// --- FUNÇÃO DE PESQUISA (ESTAVA FALTANDO) ---
let _filtroPagamento = 'todos'; // 'todos' | 'sim' | 'nao'

window.toggleFiltroPopover = function(event) {
  if (event) event.stopPropagation();
  const pop = document.getElementById('filter-popover-box');
  const btn = document.getElementById('btn-filter-toggle');
  if (!pop) return;
  const aberto = pop.classList.toggle('aberto');
  if (btn) btn.classList.toggle('ativo', aberto);
};

document.addEventListener('click', (e) => {
  const pop = document.getElementById('filter-popover-box');
  const btn = document.getElementById('btn-filter-toggle');
  if (pop && pop.classList.contains('aberto')) {
    if (!pop.contains(e.target) && (!btn || !btn.contains(e.target))) {
      pop.classList.remove('aberto');
      if (btn) btn.classList.remove('ativo');
    }
  }
});

function definirFiltroPagamento(estado) {
  _filtroPagamento = estado;

  // Atualiza visual dos botões
  ['todos', 'sim', 'nao'].forEach(s => {
    const btn = document.getElementById('filtro-btn-' + s);
    if (!btn) return;
    if (s === estado) {
      btn.style.background = '#1a1a1a';
      btn.style.color = '#fff';
      btn.style.borderColor = '#1a1a1a';
    } else {
      btn.style.background = '#fff';
      btn.style.color = '#555';
      btn.style.borderColor = '#ddd';
    }
  });

  filtrarPedidos();
}

function filtrarPedidos() {
  const input = document.getElementById('pesquisa');
  const termo = input ? input.value.toLowerCase() : '';
  const ordem = document.getElementById('ordem-pedidos')?.value || 'data-desc';

  // Atualiza indicador de filtro ativo no botão de ícone
  const btnIcon = document.getElementById('btn-filter-toggle');
  if (btnIcon) {
    const temFiltroAtivo = _filtroPagamento !== 'todos' || ordem !== 'data-desc';
    btnIcon.classList.toggle('tem-filtro', temFiltroAtivo);
  }

  // Determina o container correto
  let containerId = 'lista-espera';
  if (window.location.pathname.includes('concluidos')) containerId = 'lista-concluidos';
  if (window.location.pathname.includes('entregues')) containerId = 'lista-entregues';
  const container = document.getElementById(containerId);

  const pedidos = container ? Array.from(container.querySelectorAll('.pedido')) : [];

  pedidos.forEach(pedido => {
    const nomeOk = pedido.getAttribute('data-nome').includes(termo);
    const pagoAttr = pedido.getAttribute('data-pago');
    const pagoOk = _filtroPagamento === 'todos' || pagoAttr === _filtroPagamento || !pagoAttr;
    pedido.style.display = (nomeOk && pagoOk) ? 'flex' : 'none';
  });

  // Ordenação: move elementos no DOM conforme a opção escolhida
  if (container && ordem) {
    const visiveis = pedidos.filter(p => p.style.display !== 'none');
    visiveis.sort((a, b) => {
      if (ordem === 'nome-az') return (a.getAttribute('data-nome') || '').localeCompare(b.getAttribute('data-nome') || '', 'pt');
      if (ordem === 'nome-za') return (b.getAttribute('data-nome') || '').localeCompare(a.getAttribute('data-nome') || '', 'pt');
      const dA = a.getAttribute('data-data') || '';
      const dB = b.getAttribute('data-data') || '';
      if (ordem === 'data-asc') return dA.localeCompare(dB);
      return dB.localeCompare(dA); // data-desc (default)
    });
    visiveis.forEach(p => container.appendChild(p));
  }

  setTimeout(() => aplicarMasonryUI(containerId === 'lista-espera' ? 'pendente' : containerId === 'lista-concluidos' ? 'concluido' : 'entregue'), 20);
}

// ==========================================
// 4. ROTEAMENTO E PERMISSÕES
// ==========================================

// Roteamento simples baseado na URL
if (window.location.pathname.includes('lista-espera')) {
  carregarPedidos('pendente', 'lista-espera', 'Concluir', 'concluido');
}
if (window.location.pathname.includes('concluidos')) {
  carregarPedidos('concluido', 'lista-concluidos', 'Entregar', 'entregue');
}
if (window.location.pathname.includes('entregues')) {
  carregarPedidos('entregue', 'lista-entregues');

  limparPedidosAntigos();
}

// Funções de Login/Logout
function entrarComoCliente() {
  localStorage.setItem("tipoUsuario", "cliente");
  window.location.href = "lista-espera.html";
}

function sair() {
  localStorage.removeItem("tipoUsuario");
  window.location.href = "index.html";
}

function esconderBotoesSeCliente() {
  if (localStorage.getItem("tipoUsuario") === "cliente") {
    const adminElements = document.querySelectorAll(".admin-only");
    adminElements.forEach(el => el.style.display = "none");
  }
}

// ==========================================
// FUNÇÃO DO MODAL DE EDIÇÃO (COM REENVIO DE EMAIL)
// ==========================================

async function abrirEditorPedido(id) {
  // 1. Busca os dados do pedido no Supabase
  const { data: pedido, error } = await supabase.from("pedidos").select("*").eq("id", id).single();

  if (error || !pedido) {
    alert("Erro ao carregar pedido!");
    return;
  }

  // 2. Abre o Modal
  const modal = document.getElementById("modal-editar");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden"; // Trava a rolagem da página

  // 3. Prepara os dados
  const itens = typeof pedido.itens === "string" ? JSON.parse(pedido.itens) : pedido.itens;
  let itensEditados = [...itens]; // Cópia para edição
  let precoOriginal = pedido.preco_final || pedido.preco_total || 0;

  // Elementos do DOM
  const container = document.getElementById("itens-editar");
  const precoAntigo = document.getElementById("preco-antigo");
  const precoNovo = document.getElementById("preco-novo");
  const diferenca = document.getElementById("diferenca");

  // Cupão
  const cupaoIdHidden = document.getElementById("editor-cupao-id");
  const cupaoCodigoHidden = document.getElementById("editor-cupao-codigo");
  const cupaoDescontoHidden = document.getElementById("editor-cupao-desconto");
  const cupaoResultado = document.getElementById("editor-cupao-resultado");
  const cupaoBusca = document.getElementById("editor-cupao-busca");

  if (cupaoBusca) cupaoBusca.value = '';
  if (pedido.cupao_codigo && pedido.desconto_percentagem) {
    if (cupaoIdHidden) cupaoIdHidden.value = "manter";
    if (cupaoCodigoHidden) cupaoCodigoHidden.value = pedido.cupao_codigo;
    if (cupaoDescontoHidden) cupaoDescontoHidden.value = pedido.desconto_percentagem;
    if (cupaoResultado) {
      cupaoResultado.style.display = "block";
      cupaoResultado.innerHTML = `
          <div style="background:#e8f5e9; border:1px solid #a5d6a7; border-radius:6px; padding:10px; display:flex; align-items:center; flex-wrap:wrap; gap:10px;">
            <span>🎟️ Cupão <strong>${pedido.cupao_codigo}</strong> <span style="color:#7a5c00; font-weight:bold;">(${pedido.desconto_percentagem}% OFF)</span> ativo neste pedido.</span>
            <button type="button" onclick="removerCupaoEditor()" style="margin-top:0; background:transparent; color:#c62828; border:none; cursor:pointer; font-size:0.85rem; padding:0; text-decoration:underline;">✖ Remover</button>
          </div>`;
    }
  } else {
    if (cupaoIdHidden) cupaoIdHidden.value = "";
    if (cupaoCodigoHidden) cupaoCodigoHidden.value = "";
    if (cupaoDescontoHidden) cupaoDescontoHidden.value = "";
    if (cupaoResultado) cupaoResultado.style.display = "none";
  }

  // Preenche os preços iniciais
  precoAntigo.textContent = precoOriginal.toFixed(2);
  precoNovo.textContent = precoOriginal.toFixed(2);
  diferenca.textContent = "0.00";

  // Preenche a lista de pagamentos existentes
  const listaPgmt = document.getElementById("editor-pagamentos-lista");
  if (listaPgmt) {
    listaPgmt.innerHTML = '';
    let pgmtsExistentes = [];
    try {
      pgmtsExistentes = pedido.pagamentos
        ? (typeof pedido.pagamentos === 'string' ? JSON.parse(pedido.pagamentos) : pedido.pagamentos)
        : [];
    } catch(e) { pgmtsExistentes = []; }

    // Se não há array mas há valor_adiantado, migra para o novo formato na UI
    if (pgmtsExistentes.length === 0 && pedido.valor_adiantado && Number(pedido.valor_adiantado) > 0) {
      pgmtsExistentes = [{
        valor: Number(pedido.valor_adiantado).toFixed(2),
        data: pedido.data_real || pedido.data_pedido || '',
        nota: 'Pagamento inicial'
      }];
    }

    pgmtsExistentes.forEach(p => adicionarLinhaPagamento(p.valor, p.data, p.nota, p.metodo || ''));
    atualizarTotalPago();
  }

  // --- NOVA ÁREA: EDIÇÃO DE EMAIL ---
  // Vamos criar um container para o email antes da lista de itens
  const divEmail = document.createElement("div");
  divEmail.style.marginBottom = "20px";
  divEmail.style.padding = "15px";
  divEmail.style.backgroundColor = "#e3f2fd"; // Azul clarinho para destacar
  divEmail.style.borderRadius = "8px";
  divEmail.style.border = "1px solid #90caf9";

  divEmail.innerHTML = `
    <label style="display:block; font-weight:bold; margin-bottom:5px; color:#1565c0;">📧 Editar Email do Cliente:</label>
    <div style="display:flex; gap:10px;">
        <input type="email" id="editor-email-cliente" value="${pedido.email_cliente || ''}" 
               placeholder="cliente@email.com" 
               style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;">
        
        <button id="btn-reenviar-email" 
                style="background:#1976d2; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; font-weight:bold;">
          Salvar e Reenviar 📨
        </button>
    </div>
    <small style="color:#555;">Clique no botão ao lado para corrigir o email e enviar a confirmação novamente.</small>
  `;

  // Limpa o container e adiciona a área de email primeiro
  container.innerHTML = "";
  container.parentElement.insertBefore(divEmail, container); // Insere ANTES da lista de itens

  // LÓGICA DO BOTÃO REENVIAR
  document.getElementById("btn-reenviar-email").onclick = async () => {
    const novoEmail = document.getElementById("editor-email-cliente").value;
    const btn = document.getElementById("btn-reenviar-email");

    if (!novoEmail || !novoEmail.includes("@")) {
      alert("Por favor, insira um email válido.");
      return;
    }

    // Muda texto do botão para dar feedback
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = "Enviando...";
    btn.disabled = true;

    try {
      // 1. Atualiza no Supabase
      const { error: erroUpdate } = await supabase
        .from('pedidos')
        .update({ email_cliente: novoEmail })
        .eq('id', id);

      if (erroUpdate) throw erroUpdate;

      // 2. Atualiza o objeto local para o email correto ser usado no envio
      pedido.email_cliente = novoEmail;

      // 3. Reenvia o Email (Usa o mesmo template de confirmação de pedido novo)
      const TEMPLATE_CONFIRMACAO = "template_0uin60y"; // O ID do seu template
      await enviarEmailConfirmacao(pedido, TEMPLATE_CONFIRMACAO);

      alert(`Email atualizado para "${novoEmail}" e reenviado com sucesso!`);

    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar ou reenviar: " + err.message);
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  // --- FIM DA ÁREA DE EMAIL ---

  // Função interna para renderizar a lista de itens (igual à anterior)
  const renderItensModal = () => {
    window.renderItensModal = renderItensModal;
    container.innerHTML = ""; // Limpa a lista visual, mas mantemos o divEmail acima pois ele está fora do container

    // Função para recalcular e guardar nova data de entrega após conclusão de item
    const autoSalvarConclusao = async () => {
      const itensPendentes = itensEditados.filter(i => !i.concluido);
      const diasTotais = itensPendentes.reduce((acc, i) => acc + ((i.dias || 0) * (i.quantidade || 1)), 0);

      let novaDataEntrega;
      if (diasTotais <= 0) {
        novaDataEntrega = formatarParaISO(new Date());
      } else {
        const dataInicio = new Date((pedido.data_pedido || pedido.data_real) + 'T12:00:00');
        novaDataEntrega = formatarParaISO(calcularDataEntrega(dataInicio, diasTotais));
      }

      await supabase.from("pedidos").update({
        itens: JSON.stringify(itensEditados),
        data_entrega: novaDataEntrega,
      }).eq("id", id);
    };

    // Lista itens existentes
    itensEditados.forEach((item, index) => {
      const concluido = item.concluido || false;
      const div = document.createElement("div");
      div.style.marginBottom = "10px";
      div.style.borderBottom = "1px solid #eee";
      div.style.paddingBottom = "10px";
      div.style.background = concluido ? "#f9fdf9" : "";
      div.style.borderRadius = "6px";
      div.style.padding = concluido ? "8px" : "0 0 10px 0";

      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:6px;">
            <span style="${concluido ? 'text-decoration:line-through; color:#999;' : ''}">
              ${concluido ? '<span style="color:#4caf50; font-weight:bold;">✓</span> ' : ''}
              <strong>${item.quantidade}x ${item.subtipo}</strong>
              <span style="color:#777;"> — €${item.preco_total_item.toFixed(2)}</span>
              ${concluido ? '<span style="background:#e8f5e9; color:#2e7d32; font-size:0.7rem; font-weight:bold; padding:2px 7px; border-radius:10px; margin-left:6px; border:1px solid #c8e6c9;">Concluído</span>' : ''}
            </span>
            <div style="display:flex; gap:5px; flex-shrink:0;">
              ${!concluido
                ? `<button data-index="${index}" class="btn-concluir-item"
                     style="background:#4CAF50; color:white; border:none; padding:3px 10px; cursor:pointer; border-radius:4px; font-size:0.8rem; white-space:nowrap;">
                     ✓ Concluir item
                   </button>`
                : `<button data-index="${index}" class="btn-reabrir-item"
                     style="background:#ff9800; color:white; border:none; padding:3px 10px; cursor:pointer; border-radius:4px; font-size:0.8rem; white-space:nowrap;">
                     ↩ Reabrir
                   </button>`
              }
              <button data-index="${index}" class="remover-item"
                style="background:red; color:white; border:none; padding:3px 7px; cursor:pointer; border-radius:4px; font-size:0.85rem;">✕</button>
            </div>
        </div>
        <textarea data-index="${index}" class="editar-descricao"
          placeholder="Descrição do item..."
          style="width:100%; padding:8px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box; min-height:55px; font-family:inherit; resize:vertical; ${concluido ? 'opacity:0.45;' : ''}"
        >${item.descricao || ''}</textarea>
      `;
      container.appendChild(div);
    });

    // Área de Adicionar Novo Item no Modal
    const divAdd = document.createElement("div");
    divAdd.style.marginTop = "15px";
    divAdd.style.background = "#f9f9f9";
    divAdd.style.padding = "10px";
    divAdd.style.borderRadius = "5px";
    divAdd.innerHTML = `
      <h4>Adicionar Novo Item</h4>
      <div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom: 8px;">
          <select id="novo-subtipo" style="padding:5px; border-radius:3px; border:1px solid #ccc;">
            ${window.tiposItensCarregados.map(item => `
              <option value="${item.nome}" data-dias="${item.dias}">${item.label}</option>
            `).join('')}
          </select>
          <input type="number" id="novo-preco" placeholder="€" step="0.01" min="0" style="width:70px; padding:5px; border-radius:3px; border:1px solid #ccc;">
          <input type="number" id="novo-quantidade" placeholder="Qtd" min="1" value="1" style="width:50px; padding:5px; border-radius:3px; border:1px solid #ccc;">
      </div>
      <textarea id="novo-descricao" placeholder="Descrição do novo item..." style="width:100%; padding:8px; border-radius:3px; border:1px solid #ccc; box-sizing:border-box; margin-bottom: 8px; min-height:60px; font-family:inherit; resize:vertical;"></textarea>
      <button id="btn-add-item" style="width:100%; background:#4CAF50; color:white; padding:8px; border:none; border-radius:3px; cursor:pointer;">+ Adicionar Item</button>
    `;
    container.appendChild(divAdd);

    // Atualiza Totais
    const novoSubtotal = itensEditados.reduce((acc, i) => acc + i.preco_total_item, 0);
    const inputDesconto = document.getElementById("editor-cupao-desconto");
    const desconto = (inputDesconto && inputDesconto.value) ? parseInt(inputDesconto.value) : 0;

    let novoPrecoFinal = novoSubtotal;
    if (desconto > 0) {
      novoPrecoFinal = novoSubtotal - (novoSubtotal * desconto / 100);
    }

    precoNovo.textContent = novoPrecoFinal.toFixed(2);

    const dif = (novoPrecoFinal - precoOriginal).toFixed(2);
    diferenca.textContent = (dif >= 0 ? "+" : "") + dif;
    diferenca.style.color = dif > 0 ? "green" : (dif < 0 ? "red" : "black");

    // Evento: Botão Adicionar Item
    document.getElementById("btn-add-item").onclick = async () => {
      const select = divAdd.querySelector("#novo-subtipo");
      const subtipo = select.value;
      const preco = parseFloat(divAdd.querySelector("#novo-preco").value) || 0;
      const quantidade = parseInt(divAdd.querySelector("#novo-quantidade").value) || 1;
      const descricao = divAdd.querySelector("#novo-descricao").value.trim() || "";
      const selectedOpt = select.selectedOptions && select.selectedOptions[0];
      const val = selectedOpt ? parseInt(selectedOpt.dataset.dias) : NaN;
      const dias = isNaN(val) ? 3 : val;

      if (preco <= 0) {
        await mostrarAviso("Insira um preço válido.", "Aviso", "⚠️");
        return;
      }

      const tipo =
        subtipo === "concerto" ? "concerto" :
          subtipo === "modificacao" ? "modificacao" :
            "criacao";

      itensEditados.push({
        tipo,
        subtipo,
        dias,
        descricao: descricao,
        preco,
        quantidade,
        preco_total_item: preco * quantidade
      });
      renderItensModal();
    };
  };

  renderItensModal();

  // Delegação de evento para remover / concluir / reabrir item
  container.onclick = async (e) => {
    if (e.target.classList.contains("remover-item")) {
      const index = parseInt(e.target.dataset.index);
      itensEditados.splice(index, 1);
      renderItensModal();
    }

    if (e.target.classList.contains("btn-concluir-item")) {
      const index = parseInt(e.target.dataset.index);
      e.target.textContent = "A guardar...";
      e.target.disabled = true;
      itensEditados[index].concluido = true;
      await autoSalvarConclusao();
      renderItensModal();
    }

    if (e.target.classList.contains("btn-reabrir-item")) {
      const index = parseInt(e.target.dataset.index);
      e.target.textContent = "A guardar...";
      e.target.disabled = true;
      itensEditados[index].concluido = false;
      await autoSalvarConclusao();
      renderItensModal();
    }
  };

  // Delegação de evento para atualizar a descrição
  container.addEventListener("input", (e) => {
    if (e.target.classList.contains("editar-descricao")) {
      const index = parseInt(e.target.dataset.index);
      itensEditados[index].descricao = e.target.value;
    }
  });

  // Botão Salvar Geral (Itens e Preço)
  // NOTA: Também salvamos o email aqui caso a pessoa tenha editado mas esquecido de clicar em "Reenviar"
  document.getElementById("salvar-edicao").onclick = async () => {
    const inputDesconto = document.getElementById("editor-cupao-desconto");
    const desconto = (inputDesconto && inputDesconto.value) ? parseInt(inputDesconto.value) : 0;
    const inputCodigo = document.getElementById("editor-cupao-codigo");
    const codigo = (inputCodigo && inputCodigo.value) ? inputCodigo.value : null;
    const cupaoIdHidden = document.getElementById("editor-cupao-id");
    const cupaoId = (cupaoIdHidden && cupaoIdHidden.value) ? cupaoIdHidden.value : null;

    const novoSubtotal = itensEditados.reduce((acc, i) => acc + i.preco_total_item, 0);
    let novoPrecoFinal = novoSubtotal;
    if (desconto > 0) {
      novoPrecoFinal = novoSubtotal - (novoSubtotal * desconto / 100);
    }
    const emailFinal = document.getElementById("editor-email-cliente").value;

    // Recolhe lista de pagamentos da UI
    const linhas = document.querySelectorAll('#editor-pagamentos-lista .pgmt-linha');
    const novosPagamentos = [];
    let novoAdiantado = 0;
    let faltaMetodo = false;
    linhas.forEach(linha => {
      const v = parseFloat(linha.querySelector('.pgmt-valor').value) || 0;
      const d = linha.querySelector('.pgmt-data').value || '';
      const n = linha.querySelector('.pgmt-nota').value || '';
      const metodoSel = linha.querySelector('.pgmt-metodo');
      const m = metodoSel ? metodoSel.value : '';
      if (v > 0) {
        if (!m) faltaMetodo = true;
        novosPagamentos.push({ valor: v, data: d, nota: n, metodo: m });
        novoAdiantado += v;
      }
    });

    if (faltaMetodo) {
      await mostrarAviso("Escolha o método de pagamento (MB Way, Dinheiro ou Multibanco) em todas as linhas com valor.", "Campo Obrigatório", "⚠️");
      return;
    }

    // Se a edição deixou o pedido só com itens "pronto a vestir" (0 dias) e ele
    // ainda está pendente, conclui-o automaticamente para não ocupar vaga na fila.
    let novoStatus = pedido.status;
    if (pedido.status === 'pendente') {
      const isProntoAVestirAgora = itensEditados.length > 0 && itensEditados.every(i => parseInt(i.dias) === 0);
      if (isProntoAVestirAgora) {
        const estaPagoTotalAgora = novoPrecoFinal > 0 && novoAdiantado >= novoPrecoFinal;
        novoStatus = estaPagoTotalAgora ? 'entregue' : 'concluido';
      }
    }

    const { error: updateError } = await supabase
      .from("pedidos")
      .update({
        itens: JSON.stringify(itensEditados),
        preco_total: novoSubtotal,
        preco_final: novoPrecoFinal,
        cupao_codigo: codigo,
        desconto_percentagem: desconto > 0 ? desconto : null,
        valor_adiantado: novoAdiantado,
        pagamentos: JSON.stringify(novosPagamentos),
        email_cliente: emailFinal,
        status: novoStatus
      })
      .eq("id", id);

    // Marca o voucher como utilizado se for novo
    if (cupaoId && cupaoId !== "manter") {
      await supabase.from("vouchers").update({ estado: 'utilizado', data_estado_mudado: new Date().toISOString() }).eq('id', cupaoId);
    }

    if (updateError) {
      await mostrarAviso("Erro ao salvar alterações.", "Erro", "❌");
    } else {
      await mostrarAviso("Pedido atualizado com sucesso!", "Sucesso", "✅");
      divEmail.remove(); // Limpeza do DOM
      modal.style.display = "none";
      location.reload();
    }
  };

  // Botão Cancelar
  document.getElementById("fechar-edicao").onclick = () => {
    divEmail.remove(); // Remove o campo de email para não duplicar se abrir de novo
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  };
}

// ==========================================
// 6. ARQUIVAMENTO AUTOMÁTICO (EM VEZ DE APAGAR)
// ==========================================

async function limparPedidosAntigos() {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - 30);
  const dataString = formatarParaISO(dataLimite);

  console.log(`🧹 Verificando pedidos entregues/arquivados muito antigos...`);

  try {
    const { data: antigos, error: errBusca } = await window.supabaseClient
      .from('pedidos')
      .select('id, preco_final, valor_adiantado, status, oculto_historico, fatura_status_envio')
      .in('status', ['entregue', 'arquivado'])
      .lt('data_entrega', dataString);

    if (errBusca || !antigos) throw errBusca;

    const idsParaApagar = [];
    const pedidosParaArquivar = [];

    antigos.forEach(p => {
      const precoFinal = Number(p.preco_final || 0);
      const valorAdiantado = Number(p.valor_adiantado || 0);
      if (precoFinal > 0 && valorAdiantado >= precoFinal) {
        idsParaApagar.push(p.id);
      } else if (!estaOcultoNoHistorico(p)) {
        pedidosParaArquivar.push(p);
      }
    });

    let fezAlgo = false;
    if (idsParaApagar.length > 0) {
      const { error: errDel } = await window.supabaseClient.from('pedidos').delete().in('id', idsParaApagar);
      if (errDel) {
        console.error("Erro ao apagar pedidos antigos:", errDel);
      } else {
        fezAlgo = true;
      }
    }
    for (const pAnt of pedidosParaArquivar) {
      try {
        await arquivarPedidoSemErroStatus(window.supabaseClient, pAnt.id, pAnt);
        fezAlgo = true;
      } catch (errUpdate) {
        console.error("Erro ao arquivar pedido:", errUpdate);
      }
    }

    if (fezAlgo) {
      console.log(`✅ Limpeza: ${idsParaApagar.length} apagados, ${pedidosParaArquivar.length} arquivados.`);
      setTimeout(() => location.reload(), 1000);
    } else {
      console.log("👍 Nada para limpar hoje.");
    }
  } catch (err) {
    console.error("Erro inesperado na limpeza:", err);
  }
}

// =========================================
// LÓGICA DE CUPÃO NO EDITOR DE PEDIDOS
// =========================================
window.verificarCupaoEditor = async function () {
  const termo = document.getElementById('editor-cupao-busca').value.trim();
  const resultadoDiv = document.getElementById('editor-cupao-resultado');

  if (!termo) {
    await mostrarAviso('Insira o código do cupão ou o nome da cliente.', 'Aviso', '⚠️');
    return;
  }

  resultadoDiv.style.display = 'block';
  resultadoDiv.innerHTML = '<span style="color:#888;">A verificar...</span>';

  const voucher = await buscarVoucher(termo);
  if (!voucher) {
    resultadoDiv.innerHTML = `<span style="color:#c62828;">❌ Cupão não encontrado ou já utilizado/expirado.</span>`;
    return;
  }

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  if (!voucher.vitalicio && voucher.data_validade) {
    const val = new Date(voucher.data_validade + 'T00:00:00');
    if (val < hoje) {
      resultadoDiv.innerHTML = `<span style="color:#c62828;">⌛ Cupão expirado.</span>`;
      return;
    }
  }

  const nomeStr = voucher.nome_cliente || 'Sem cliente associado';
  const desconto = voucher.desconto_percentagem || 0;

  resultadoDiv.innerHTML = `
    <div style="background:#e8f5e9; border:1px solid #a5d6a7; border-radius:6px; padding:10px;">
      <strong>✅ Cupão encontrado!</strong><br>
      <span>👤 ${nomeStr}</span>&nbsp;&nbsp;
      <span style="font-family:monospace; font-weight:bold;">${voucher.codigo}</span>&nbsp;&nbsp;
      <strong style="color:#7a5c00;">(${desconto}% OFF)</strong>
      <div style="margin-top:6px;">
        <button type="button" onclick="selecionarCupaoEditor('${voucher.id}', '${voucher.codigo}', ${desconto})" 
          style="margin-top:4px; background:#2e7d32; color:#fff; border:none; padding:6px 14px; border-radius:4px; cursor:pointer; font-size:0.85rem;">
          ✔️ Aplicar
        </button>
      </div>
    </div>`;
}

window.selecionarCupaoEditor = function (id, codigo, desconto) {
  document.getElementById('editor-cupao-id').value = id;
  document.getElementById('editor-cupao-codigo').value = codigo;
  document.getElementById('editor-cupao-desconto').value = desconto;

  const resultadoDiv = document.getElementById('editor-cupao-resultado');
  resultadoDiv.innerHTML = `
    <div style="background:#e8f5e9; border:1px solid #a5d6a7; border-radius:6px; padding:10px; display:flex; align-items:center; flex-wrap:wrap; gap:10px;">
      <span>🎟️ Cupão <strong>${codigo}</strong> <span style="color:#7a5c00; font-weight:bold;">(${desconto}% OFF)</span> será aplicado.</span>
      <button type="button" onclick="removerCupaoEditor()" style="margin-top:0; background:transparent; color:#c62828; border:none; cursor:pointer; font-size:0.85rem; padding:0; text-decoration:underline;">✖ Remover</button>
    </div>`;

  if (typeof window.renderItensModal === 'function') window.renderItensModal();
}

window.removerCupaoEditor = function () {
  document.getElementById('editor-cupao-id').value = '';
  document.getElementById('editor-cupao-codigo').value = '';
  document.getElementById('editor-cupao-desconto').value = '';
  document.getElementById('editor-cupao-resultado').style.display = 'none';
  document.getElementById('editor-cupao-busca').value = '';
}

// =========================================
// MASONRY / PINTEREST LAYOUT PERFEITO (Puro JS)
// =========================================
function aplicarMasonryUI(filtroAtivo = null) {
  let containerId = 'lista-espera';
  if (filtroAtivo === 'concluido') containerId = 'lista-concluidos';
  if (filtroAtivo === 'entregue') containerId = 'lista-entregues';

  const container = document.getElementById(containerId);
  if (!container) return;

  const allItems = Array.from(container.querySelectorAll('.pedido'));
  const items = allItems.filter(item => item.style.display !== 'none');

  if (items.length === 0) {
    container.style.height = 'auto';
    return;
  }

  // Garantir que todas as imagens e estilos estão prontos para altura correta
  const gap = 20;
  const minWidth = 320;
  const containerWidth = container.getBoundingClientRect().width || container.offsetWidth;

  // Define colunas com base no espaço, max 10
  let cols = Math.floor(containerWidth / minWidth);
  if (cols < 1) cols = 1;
  // Não cria espaço vazio inútil na direita se houver menos cartões visíveis que o espaço permite:
  if (items.length < cols) cols = items.length;

  // Se for apenas 1 coluna, volta para modo block normal ocupando tudo
  if (cols === 1) {
    items.forEach(item => {
      item.style.position = 'static';
      item.style.width = '100%';
      item.style.marginBottom = gap + 'px';
    });
    container.style.height = 'auto';
    return;
  }

  const itemWidth = (containerWidth - (gap * (cols - 1)) - 20) / cols; // -20 por causa do padding do container
  let colHeights = Array(cols).fill(0);

  items.forEach(item => {
    item.style.position = 'absolute';
    item.style.width = itemWidth + 'px';
    item.style.marginBottom = '0px'; // Reseta

    // Descobre a coluna mais baixa
    let minCol = 0;
    let minH = colHeights[0];
    for (let i = 1; i < cols; i++) {
      if (colHeights[i] < minH) {
        minH = colHeights[i];
        minCol = i;
      }
    }

    // Posiciona o card
    const leftOffset = 10 + (minCol * (itemWidth + gap)); // 10px offset for container padding
    const topOffset = 10 + minH;

    item.style.left = leftOffset + 'px';
    item.style.top = topOffset + 'px';

    colHeights[minCol] += item.offsetHeight + gap;
  });

  // Container ganha altura exata para não sobrepor outras coisas
  container.style.height = (Math.max(...colHeights) + 20) + 'px';
}

window.addEventListener('resize', () => {
  aplicarMasonryUI('pendente');
  aplicarMasonryUI('concluido');
  aplicarMasonryUI('entregue');
});
