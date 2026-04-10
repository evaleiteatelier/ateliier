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
// 2. LÓGICA DE ADICIONAR PEDIDO (NOVA LÓGICA DE AGENDAMENTO)
// ==========================================

if (document.getElementById('form-pedido')) {
  document.getElementById('form-pedido').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value;
    const hoje = new Date();
    const dataInput = document.getElementById('data').value;
    const dataEscolhida = new Date(dataInput);
    const itens = coletarItens();
    const preco_total = itens.reduce((acc, i) => acc + i.preco_total_item, 0);
    const email_cliente = document.getElementById('email_cliente').value;

    if (itens.length === 0) {
      alert("Adicione ao menos um item ao pedido.");
      return;
    }

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

    const pedidoObj = {
      nome,
      data_pedido: dataEscolhida.toISOString().split('T')[0],
      data_real: new Date().toISOString().split('T')[0],
      itens: JSON.stringify(itens),
      data_entrega: dataEntrega.toISOString().split('T')[0],
      status: 'pendente',
      preco_total: preco_total,
      preco_final: preco_final,
      cupao_codigo: cupao_codigo,
      desconto_percentagem: desconto_percentagem,
      valor_adiantado: valor_adiantado,
      email_cliente: email_cliente
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
        alert("Erro ao salvar pedido: " + error.message);
      } else {
        // Tenta enviar o email de confirmação
        const NOVO_TEMPLATE_ID = "template_0uin60y"; // Confirme se este ID está certo no EmailJS
        await enviarEmailConfirmacao(novoPedido, NOVO_TEMPLATE_ID);

        // Se há cupão selecionado, marca como utilizado
        const cupaoIdEl = document.getElementById('cupao-id-selecionado');
        if (cupaoIdEl && cupaoIdEl.value) {
          await supabase
            .from('vouchers')
            .update({ estado: 'utilizado', data_estado_mudado: new Date().toISOString() })
            .eq('id', cupaoIdEl.value);
        }
        
        alert("Pedido salvo com sucesso!");
        location.reload();
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      alert("Erro inesperado: " + err.message);
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

async function semanaTemEspaco(segunda, novosItens) {
  const domingo = new Date(segunda);
  domingo.setDate(domingo.getDate() + 6);

  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('itens, data_pedido, data_entrega') // Buscamos a entrega também para ver o intervalo
    .eq('status', 'pendente') // APENAS AS ENCOMENDAS AINDA NÃO CONCLUÍDAS OCUPAM LUGAR
    .lte('data_pedido', formatarParaISO(domingo)) // O pedido começou antes de o domingo acabar
    .gte('data_entrega', formatarParaISO(segunda)); // O pedido acaba depois de a segunda começar

  if (error) {
    console.error("Erro ao buscar pedidos da semana:", error);
  }

  let pecasNormais = 0;
  let concertos = 0;
  let temVestidoFesta = false;

  // Conta o que já existe no banco de dados para esta semana (se houver)
  if (pedidos) {
    for (const pedido of pedidos) {
      const d1 = new Date(pedido.data_pedido);
      const d2 = new Date(pedido.data_entrega);
      let spanDias = (d2 - d1) / (1000 * 60 * 60 * 24);
      if (spanDias < 1) spanDias = 1;
      const spansSemanas = Math.ceil(spanDias / 7) || 1;

      const itensSalvos = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : pedido.itens;
      for (const item of itensSalvos) {
        if (item.status_item === 'concluido') continue; // ✅ ITENS CONCLUÍDOS NÃO PESAM NA AGENDA
        
        let qtd = parseInt(item.quantidade) || 1;
        // Amortiza a carga do pedido pelas semanas em que ele vai ocorrer
        let cargaSemanal = Math.ceil(qtd / spansSemanas);
        if (cargaSemanal === 0) cargaSemanal = 1;

        if (item.subtipo === 'vestido de festa') temVestidoFesta = true;
        else if (item.tipo === 'criacao') pecasNormais += cargaSemanal;
        else if (item.tipo === 'concerto' || item.tipo === 'modificacao') concertos += cargaSemanal;
      }
    }
  }

  // Verifica se o conjunto de novos itens cabe nesta semana
  for (const item of novosItens) {
    const qtd = parseInt(item.quantidade) || 1;
    // O mesmo item novo também amortece para sabermos se o "arranque" dele cabe
    const spanDiasItem = (item.dias * qtd);
    const spanSemanalDesteItem = Math.ceil(spanDiasItem / 5) || 1; // 5 dias uteis
    const cargaSemanalNovo = Math.ceil(qtd / spanSemanalDesteItem);
    
    // REGRA DE OURO: Se já houver um vestido de festa, a semana está FECHADA para tudo.
    if (temVestidoFesta) return false;

    if (item.subtipo === 'vestido de festa') {
      // "Um vestido de festa fecha a semana" -> Não pode haver NADA antes.
      if (pecasNormais > 0 || concertos > 0 || cargaSemanalNovo > 1) return false;
      temVestidoFesta = true;
    } 
    else if (item.tipo === 'criacao') {
      // Bloqueia se ultrapassar o limite de 3 criações
      if ((pecasNormais + cargaSemanalNovo) > 3) return false;
      pecasNormais += cargaSemanalNovo;
    } 
    else if (item.tipo === 'concerto' || item.tipo === 'modificacao') {
      // Bloqueia se ultrapassar o limite de 15 concertos/modificações
      if ((concertos + cargaSemanalNovo) > 15) return false;
      concertos += cargaSemanalNovo;
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
        const dias = parseInt(sel.selectedOptions[0].dataset.dias);
        const subtipo = sel.value;
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
            preco_total_item,
            status_item: 'pendente'
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
        <select class="tipo-item">
            <option value="macacão" data-dias="3">Macacão</option>
            <option value="vestido normal" data-dias="3">Vestido Normal</option>
            <option value="vestido de festa" data-dias="7">Vestido de Festa</option>
            <option value="pantalona" data-dias="3">Pantalona</option>
            <option value="saia" data-dias="3">Saia</option>
            <option value="kimono" data-dias="3">Kimono</option>
            <option value="fato" data-dias="3">Fato</option>
            <option value="concerto" data-dias="3">Concerto</option>
            <option value="modificacao" data-dias="3">Modificação</option>
        </select>
        <textarea placeholder="Descrição do item..." class="descricao-item"></textarea>
        
        <label>Preço (€):</label>
        <input type="number" class="preco-item" step="0.01" min="0" placeholder="Ex: 25.00">
        
        <label>Quantidade:</label>
        <input type="number" class="quantidade-item" min="1" value="1">
    `;
    container.appendChild(div);

    const atualizarTotal = () => atualizarPrecoTotal();
    div.querySelector('.preco-item').addEventListener('input', atualizarTotal);
    div.querySelector('.quantidade-item').addEventListener('input', atualizarTotal);
    div.querySelector('.tipo-item').addEventListener('change', atualizarTotal);
}

// ==========================================
// 3. LISTAGEM E GERENCIAMENTO DE PEDIDOS
// ==========================================

// Substitua a função carregarPedidos no seu script.js por esta:

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

  // --- SE A LISTA ESTIVER VAZIA (O SEU CASO) ---
  if (!data || data.length === 0) {
    container.innerHTML = `
        <div style="text-align: center; color: #777; margin-top: 30px;">
            <p style="font-size: 2rem;">📭</p>
            <p>Não há pedidos nesta lista no momento.</p>
        </div>
    `;
    return; // Para a função aqui, não faz mais nada
  }

  data.forEach(p => {
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
    div.setAttribute('data-nome', p.nome ? p.nome.toLowerCase() : ""); // Proteção contra nome vazio
    
    // Formata datas para o padrão PT (Dia/Mês/Ano) - Protegido contra fuso horário
    const dataPedidoF = formatarDataParaExibir(p.data_pedido);
    const dataEntregaF = formatarDataParaExibir(p.data_entrega);

    const precoOriginal = p.preco_total ? Number(p.preco_total).toFixed(2) : '0.00';
    let precoDisplay = `<p><strong>Total:</strong> €${precoOriginal}</p>`;
    
    let finalValueRendered = p.preco_total ? Number(p.preco_total) : 0;
    
    if (p.cupao_codigo && p.desconto_percentagem) {
       finalValueRendered = p.preco_final || p.preco_total;
       precoDisplay = `
       <div style="background:#fff8e1; border:1px solid #ffe082; padding:10px; border-radius:6px; margin-bottom:10px;">
         <p style="margin:0 0 5px 0; text-decoration:line-through; color:#777; font-size:0.9rem;">Subtotal: €${precoOriginal}</p>
         <p style="margin:0 0 5px 0; font-size:0.95rem;">🎟️ Cupão <strong>${p.cupao_codigo}</strong> (-${p.desconto_percentagem}%)</p>
         <p style="margin:0; font-size:1.1rem; color:#d4af37;"><strong>Total a Pagar: €${Number(finalValueRendered).toFixed(2)}</strong></p>
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

    div.innerHTML = `
      <strong>${p.nome}</strong>
      <ul>
        ${Array.isArray(itensList) ? itensList.map((i, idx) => `
          <li style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed #eee;">
            <div style="flex: 1; margin-right: 10px;">
              <strong>${i.subtipo || 'Item'}</strong> (${i.quantidade || 1}x)
              ${i.status_item === 'concluido' ? '<span style="color: #4caf50; font-size: 0.85em; font-weight: bold; margin-left: 5px;">[✓ Concluído]</span>' : ''}
              ${i.descricao ? `<br><em style="font-size: 0.9em; color:#555;">${i.descricao}</em>` : ''}
            </div>
            ${filtro === 'pendente' ? `
              <button class="admin-only" onclick="alternarStatusItem('${p.id}', ${idx})" style="padding: 4px 8px; font-size: 0.75rem; background: ${i.status_item === 'concluido' ? '#f44336' : '#4caf50'}; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap; margin-top:2px;">
                 ${i.status_item === 'concluido' ? 'Desfazer' : '✓ Concluir Item'}
              </button>
            ` : ''}
          </li>
        `).join('') : '<li>Erro nos itens</li>'}
      </ul>
      <p style="font-size: 0.9rem; color: #555;">
         Pedido: ${dataPedidoF} | 
         Entrega: <strong>${dataEntregaF}</strong>
      </p>
      
      ${precoDisplay}
      
      <div class="acoes-pedido">
          ${botaoAcao ? `<button class="admin-only" onclick="mudarStatus('${p.id}', '${novoStatus}')">${botaoAcao}</button>` : ''}
          
          ${filtro === 'pendente' ? `
            <button class="admin-only" onclick="abrirEditorPedido('${p.id}')">Editar</button>
            <button class="admin-only" style="background-color: #d32f2f;" onclick="excluirPedido('${p.id}')">Excluir</button>
          ` : ''}
      </div>
      <hr>
    `;
    container.appendChild(div);
  });
  
  esconderBotoesSeCliente();
  
  // Applica Masonry effect após os itens estarem no DOM
  setTimeout(() => {
    aplicarMasonryUI(filtro);
  }, 50);
}

async function mudarStatus(id, novoStatus) {
  if (novoStatus === 'concluido') {
    try {
      await enviarEmailConclusao(id, supabase); 
    } catch (err) {
      console.error("❌ ERRO AO TENTAR ENVIAR EMAIL:", err);
      alert("O pedido foi marcado como concluído, mas falhou o envio do email de notificação. Verifique a consola.");
    }
  }
  
  await supabase.from('pedidos').update({ status: novoStatus }).eq('id', id);
  location.reload();
}

async function excluirPedido(id) {
  if (!confirm("Tem a certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.")) {
    return;
  }
  try {
    const { error } = await supabase.from('pedidos').delete().eq('id', id);
    if (error) {
      console.error("Erro ao excluir pedido:", error);
      alert("Não foi possível excluir o pedido: " + error.message);
    } else {
      alert("Pedido excluído com sucesso!");
      location.reload();
    }
  } catch (err) {
    console.error("Erro inesperado:", err);
    alert("Ocorreu um erro inesperado: " + err.message);
  }
}

// --- NOVA FUNÇÃO: ALTERNAR STATUS DO ITEM INDIVIDUAL ---
async function alternarStatusItem(pedidoId, itemIndex) {
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select('itens')
    .eq('id', pedidoId)
    .single();

  if (error || !pedido) {
    alert("Erro ao buscar pedido para alternar item.");
    return;
  }

  let itensList = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : pedido.itens;
  
  if (itensList[itemIndex].status_item === 'concluido') {
    itensList[itemIndex].status_item = 'pendente';
  } else {
    itensList[itemIndex].status_item = 'concluido';
  }

  const todosConcluidos = itensList.every(i => i.status_item === 'concluido');

  const { error: errorUpdate } = await supabase
    .from('pedidos')
    .update({ itens: JSON.stringify(itensList) })
    .eq('id', pedidoId);

  if (errorUpdate) {
    alert("Erro ao salvar mudança de status do item.");
    return;
  }
  
  if (todosConcluidos) {
    if(confirm("Todos os itens estão concluídos! Deseja passar o pedido para a aba de Concluídos?")) {
      await mudarStatus(pedidoId, 'concluido');
      return;
    }
  }

  location.reload();
}

// --- FUNÇÃO DE PESQUISA (ESTAVA FALTANDO) ---
function filtrarPedidos() {
    const input = document.getElementById('pesquisa');
    const termo = input.value.toLowerCase();
    const pedidos = document.querySelectorAll('.pedido');

    pedidos.forEach(pedido => {
        const nomeCliente = pedido.getAttribute('data-nome');
        if (nomeCliente.includes(termo)) {
            pedido.style.display = "flex"; // Volta o display original para os pedidos
        } else {
            pedido.style.display = "none";
        }
    });
    
    // Reconstrói o mosaico para preencher os buracos das pesquisas
    let filtroPagina = 'pendente';
    if (window.location.pathname.includes('concluidos')) filtroPagina = 'concluido';
    if (window.location.pathname.includes('entregues')) filtroPagina = 'entregue';
    setTimeout(() => aplicarMasonryUI(filtroPagina), 20);
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

  // Preenche o adiantamento existente
  const editorAdiantamento = document.getElementById("editor-valor-adiantado");
  if (editorAdiantamento) {
    editorAdiantamento.value = pedido.valor_adiantado ? Number(pedido.valor_adiantado).toFixed(2) : '';
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
    
    // Lista itens existentes
    itensEditados.forEach((item, index) => {
      const div = document.createElement("div");
      div.style.marginBottom = "10px";
      div.style.borderBottom = "1px solid #eee";
      div.style.paddingBottom = "10px";
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
            <span><strong>${item.quantidade}x ${item.subtipo}</strong> - €${item.preco_total_item.toFixed(2)}</span>
            <button data-index="${index}" class="remover-item" style="background:red; color:white; border:none; padding:2px 5px; cursor:pointer; border-radius:3px;">X</button>
        </div>
        <textarea data-index="${index}" class="editar-descricao" placeholder="Descrição do item..." style="width:100%; padding:8px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box; min-height:60px; font-family:inherit; resize:vertical;">${item.descricao || ''}</textarea>
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
            <option value="macacão" data-dias="3">Macacão</option>
            <option value="vestido normal" data-dias="3">Vestido Normal</option>
            <option value="vestido de festa" data-dias="7">Vestido de Festa</option>
            <option value="pantalona" data-dias="3">Pantalona</option>
            <option value="saia" data-dias="3">Saia</option>
            <option value="kimono" data-dias="3">Kimono</option>
            <option value="fato" data-dias="3">Fato</option>
            <option value="concerto" data-dias="3">Concerto</option>
            <option value="modificacao" data-dias="3">Modificação</option>
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
    document.getElementById("btn-add-item").onclick = () => {
      const select = document.getElementById("novo-subtipo");
      const subtipo = select.value;
      const preco = parseFloat(document.getElementById("novo-preco").value) || 0;
      const quantidade = parseInt(document.getElementById("novo-quantidade").value) || 1;
      const descricao = document.getElementById("novo-descricao").value.trim() || "";
      const dias = parseInt(select.selectedOptions[0].dataset.dias);

      if (preco <= 0) {
        alert("Insira um preço válido.");
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
        preco_total_item: preco * quantidade,
        status_item: 'pendente'
      });
      renderItensModal();
    };
  };

  renderItensModal();

  // Delegação de evento para remover item
  container.onclick = (e) => {
    if (e.target.classList.contains("remover-item")) {
      const index = parseInt(e.target.dataset.index);
      itensEditados.splice(index, 1);
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
    const adiantadoInput = document.getElementById("editor-valor-adiantado");
    const novoAdiantado = (adiantadoInput && adiantadoInput.value) ? parseFloat(adiantadoInput.value) : 0;
    
    const { error: updateError } = await supabase
      .from("pedidos")
      .update({
        itens: JSON.stringify(itensEditados),
        preco_total: novoSubtotal,
        preco_final: novoPrecoFinal,
        cupao_codigo: codigo,
        desconto_percentagem: desconto > 0 ? desconto : null,
        valor_adiantado: novoAdiantado,
        email_cliente: emailFinal
      })
      .eq("id", id);
      
    // Marca o voucher como utilizado se for novo
    if (cupaoId && cupaoId !== "manter") {
      await supabase.from("vouchers").update({ estado: 'utilizado', data_estado_mudado: new Date().toISOString() }).eq('id', cupaoId);
    }

    if (updateError) {
      alert("Erro ao salvar alterações.");
    } else {
      alert("Pedido atualizado com sucesso!");
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
// 6. LIMPEZA AUTOMÁTICA (AUTO-DELETE)
// ==========================================

async function limparPedidosAntigos() {
  // 1. Calcula a data de 30 dias atrás
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - 30); // Subtrai 30 dias de hoje
  
  // Formata para o padrão do banco YYYY-MM-DD
  const dataString = dataLimite.toISOString().split('T')[0];

  console.log(`🧹 Verificando pedidos entregues antes de: ${dataString}...`);

  try {
    // 2. Manda o Supabase apagar tudo que for 'entregue' E data < 30 dias atrás
    const { error, count } = await supabase
      .from('pedidos')
      .delete({ count: 'exact' }) // Pede para contar quantos apagou
      .eq('status', 'entregue')       // Apenas os entregues
      .lt('data_entrega', dataString); // 'lt' significa "Less Than" (menor que / antes de)

    if (error) {
      console.error("Erro na limpeza automática:", error);
    } else if (count > 0) {
      console.log(`✅ Limpeza concluída: ${count} pedidos antigos foram excluídos permanentemente.`);
      // Opcional: Se quiser avisar na tela, descomente a linha abaixo
      // alert(`${count} pedidos muito antigos foram removidos do histórico.`);
      
      // Recarrega a lista para sumir com os apagados
      location.reload();
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
window.verificarCupaoEditor = async function() {
  const termo = document.getElementById('editor-cupao-busca').value.trim();
  const resultadoDiv = document.getElementById('editor-cupao-resultado');
  
  if (!termo) {
    if (typeof alertaModal !== "undefined") { alertaModal('Aviso', 'Insira o código do cupão ou o nome da cliente.', '⚠️'); }
    else { alert('Insira o código do cupão ou o nome da cliente.'); }
    return;
  }
  
  resultadoDiv.style.display = 'block';
  resultadoDiv.innerHTML = '<span style="color:#888;">A verificar...</span>';
  
  const voucher = await buscarVoucher(termo);
  if (!voucher) {
    resultadoDiv.innerHTML = `<span style="color:#c62828;">❌ Cupão não encontrado ou já utilizado/expirado.</span>`;
    return;
  }
  
  const hoje = new Date(); hoje.setHours(0,0,0,0);
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

window.selecionarCupaoEditor = function(id, codigo, desconto) {
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

window.removerCupaoEditor = function() {
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
    for(let i=1; i<cols; i++) {
        if(colHeights[i] < minH) {
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
