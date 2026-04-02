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

    const pedidoObj = {
      nome,
      data_pedido: dataEscolhida.toISOString().split('T')[0],
      data_real: new Date().toISOString().split('T')[0],
      itens: JSON.stringify(itens),
      data_entrega: dataEntrega.toISOString().split('T')[0],
      status: 'pendente',
      preco_total: preco_total,
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
      const itensSalvos = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : pedido.itens;
      for (const item of itensSalvos) {
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
    const inputTotal = document.getElementById('preco_total');
    if (inputTotal) inputTotal.value = total.toFixed(2);
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

    div.innerHTML = `
      <strong>${p.nome}</strong>
      <ul>
        ${Array.isArray(itensList) ? itensList.map(i => `
          <li>
            <strong>${i.subtipo || 'Item'}</strong> (${i.quantidade || 1}x)
            ${i.descricao ? `<br><em>${i.descricao}</em>` : ''}
          </li>
        `).join('') : '<li>Erro nos itens</li>'}
      </ul>
      <p style="font-size: 0.9rem; color: #555;">
         Pedido: ${dataPedidoF} | 
         Entrega: <strong>${dataEntregaF}</strong>
      </p>
      <p><strong>Total:</strong> €${p.preco_total ? Number(p.preco_total).toFixed(2) : '0.00'}</p>
      
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

// --- FUNÇÃO DE PESQUISA (ESTAVA FALTANDO) ---
function filtrarPedidos() {
    const input = document.getElementById('pesquisa');
    const termo = input.value.toLowerCase();
    const pedidos = document.querySelectorAll('.pedido');

    pedidos.forEach(pedido => {
        const nomeCliente = pedido.getAttribute('data-nome');
        if (nomeCliente.includes(termo)) {
            pedido.style.display = "block";
        } else {
            pedido.style.display = "none";
        }
    });
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
  let precoOriginal = pedido.preco_total || 0;

  // Elementos do DOM
  const container = document.getElementById("itens-editar");
  const precoAntigo = document.getElementById("preco-antigo");
  const precoNovo = document.getElementById("preco-novo");
  const diferenca = document.getElementById("diferenca");

  // Preenche os preços iniciais
  precoAntigo.textContent = precoOriginal.toFixed(2);
  precoNovo.textContent = precoOriginal.toFixed(2);
  diferenca.textContent = "0.00";

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
    const novoTotal = itensEditados.reduce((acc, i) => acc + i.preco_total_item, 0);
    precoNovo.textContent = novoTotal.toFixed(2);
    
    const dif = (novoTotal - precoOriginal).toFixed(2);
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
        preco_total_item: preco * quantidade
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
    const novoTotal = parseFloat(precoNovo.textContent);
    const emailFinal = document.getElementById("editor-email-cliente").value; // Pega o valor do campo de email
    
    const { error: updateError } = await supabase
      .from("pedidos")
      .update({
        itens: JSON.stringify(itensEditados),
        preco_total: novoTotal,
        email_cliente: emailFinal // Garante que o email é salvo mesmo sem reenviar
      })
      .eq("id", id);

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
