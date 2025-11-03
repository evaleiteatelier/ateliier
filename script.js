const _supabase = window.supabase;
const supabase = _supabase.createClient(
  "https://cixjmwfkfmeedajpmzmp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeGptd2ZrZm1lZWRhanBtem1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzM5ODIsImV4cCI6MjA2OTEwOTk4Mn0.vFvgRMK_oabG19FNauNaBu_CoQTL8QRSXcptyfY6rbM"
);

// Adicionar pedido
if (document.getElementById('form-pedido')) {
  document.getElementById('form-pedido').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value;
    const hoje = new Date();
    const dataInput = document.getElementById('data').value;
    const dataEscolhida = new Date(dataInput);
    const itens = coletarItens();
    const preco_total = itens.reduce((acc, i) => acc + i.preco_total_item, 0);

    // 👇 LINHA ADICIONADA 👇
    const email_cliente = document.getElementById('email_cliente').value;

    if (itens.length === 0) {
      alert("Adicione ao menos um item ao pedido.");
      return;
    }

    let semanaData = ajustarParaSegunda(dataEscolhida);
let diasTotais = 0;

// verifica e acumula as semanas necessárias conforme os itens
for (const item of itens) {
  while (!(await semanaTemEspaco(semanaData, [item]))) {
    semanaData.setDate(semanaData.getDate() + 7);
  }
  diasTotais += item.dias;
}

// Agora sim calcula a data final com base em todos os dias acumulados
const dataEntrega = calcularDataEntrega(semanaData, diasTotais);


    const pedidoObj = {
  nome,
  data_pedido: dataEscolhida.toISOString().split('T')[0],
  data_real: hoje.toISOString().split('T')[0],
  itens: JSON.stringify(itens),
  data_entrega: dataEntrega.toISOString().split('T')[0],
  status: 'pendente',
  preco_total: preco_total,
  email_cliente: email_cliente //  <- LINHA ADICIONADA
};




    try {
      const { error, data } = await supabase.from('pedidos').insert(pedidoObj);
      console.log("Resposta do Supabase:", { error, data });
      if (error) {
        console.error("Erro ao salvar pedido:", error);
        alert("Erro ao salvar pedido: " + error.message);
      } else {
        alert("Pedido salvo com sucesso!");
        location.reload();
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      alert("Erro inesperado: " + err.message);
    }
  });
}

function ajustarParaSegunda(data) {
  const dia = data.getDay();
  
  // Se cair no domingo, joga para segunda
  if (dia === 0) {
    data.setDate(data.getDate() + 1);
  }
  
  // Sábado e dias da semana mantêm a data original
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}


function calcularDataEntrega(inicio, dias) {
  // Começa na data inicial escolhida
  let entrega = new Date(inicio);
  let adicionados = 0;

  while (adicionados < dias) {
    entrega.setDate(entrega.getDate() + 1);
    const diaSemana = entrega.getDay();

    // Pula apenas domingos (0)
    if (diaSemana !== 0) {
      adicionados++;
    }
  }

  // Se a data calculada cair no passado, move para hoje + dias úteis (domingo excluído)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // zera horas
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

  return entrega;
}


async function semanaTemEspaco(segunda, novosItens) {
  const domingo = new Date(segunda);
  domingo.setDate(domingo.getDate() + 6);

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('itens, data_pedido')
    .gte('data_pedido', segunda.toISOString().split('T')[0])
    .lte('data_pedido', domingo.toISOString().split('T')[0]);

  let pecasNormais = 0;       // peças de criação normais (máx 3/semana)
  let concertos = 0;          // consertos (máx 15/semana)
  let temVestidoFesta = false; // só pode 1 por semana e sem outras peças normais

  // Contar pedidos já existentes nessa semana
  for (const pedido of pedidos) {
    const itensSalvos = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : pedido.itens;
    for (const item of itensSalvos) {
      if (item.subtipo === 'vestido de festa') temVestidoFesta = true;
      else if (item.tipo === 'criacao') pecasNormais++;
      else if (item.tipo === 'concerto') concertos++;
    }
  }

  // Validar novos itens
  for (const item of novosItens) {
    if (item.subtipo === 'vestido de festa') {
      // Vestido de festa só entra se não houver outro e não houver peças normais
      if (temVestidoFesta || pecasNormais > 0) return false;
      temVestidoFesta = true;
    } 
    else if (item.tipo === 'criacao') {
      // Peças normais só se não houver vestido de festa e limite < 3
      if (temVestidoFesta || pecasNormais >= 3) return false;
      pecasNormais++;
    } 
    else if (item.tipo === 'concerto') {
      // Consertos só se limite < 15
      if (concertos >= 15) return false;
      concertos++;
    }
  }

  return true;
}


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

    // Atualiza subtotal e total geral
    const atualizarTotal = () => atualizarPrecoTotal();
div.querySelector('.preco-item').addEventListener('input', atualizarTotal);
div.querySelector('.quantidade-item').addEventListener('input', atualizarTotal);
div.querySelector('.tipo-item').addEventListener('change', atualizarTotal);

}




async function carregarPedidos(filtro, destino, botaoAcao, novoStatus) {
  const { data } = await supabase.from('pedidos').select('*').eq('status', filtro).order('data_pedido');
  const container = document.getElementById(destino);
  container.innerHTML = '';

  data.forEach(p => {
    const itensList = typeof p.itens === 'string' ? JSON.parse(p.itens) : p.itens;
    const div = document.createElement('div');
    div.className = 'pedido';  // adiciona a classe

    div.innerHTML = `
      <strong>${p.nome}</strong> - Pedido:
      <ul>
        ${itensList.map(i => `
          <li>
            <strong>${i.subtipo}</strong>
            ${i.descricao ? `<br><em>${i.descricao}</em>` : ''}
          </li>
        `).join('')}
      </ul>
      <br>Pedido feito: ${p.data_pedido} | Adicionado: ${p.data_real} | Entrega: ${p.data_entrega}
<br><strong>Preço total:</strong> €${p.preco_total?.toFixed(2) || '0.00'}
${botaoAcao ? `<button class="admin-only" data-pedido-id="${p.id}" onclick="mudarStatus('${p.id}', '${novoStatus}')">${botaoAcao}</button>` : ''}
${filtro === 'pendente' ? `
  <button class="admin-only" onclick="abrirEditorPedido('${p.id}')">Editar</button>
  <button class="admin-only" onclick="excluirPedido('${p.id}')">Excluir</button>
` : ''}
<hr>

    `;

    container.appendChild(div);
  });

  // Chama a função para esconder botões para clientes
  esconderBotoesSeCliente();
}


async function mudarStatus(id, novoStatus) {
  
  // A variável 'supabase' deve estar definida algures acima neste ficheiro
  
  if (novoStatus === 'concluido') {
    try {
      // 1. Chamamos a função com 's' (enviarEmailConclusao)
      // 2. Passamos a nossa variável 'supabase' para ela
      await enviarEmailConclusao(id, supabase); 
      
    } catch (err) {
      // Se o envio do email falhar, vemos o erro na consola
      console.error("❌ ERRO AO TENTAR ENVIAR EMAIL:", err);
      // Opcional: Podes alertar o utilizador
      alert("O pedido foi marcado como concluído, mas falhou o envio do email de notificação. Verifique a consola.");
    }
  }
  
  // Esta parte agora é executada mesmo que o email falhe
  await supabase.from('pedidos').update({ status: novoStatus }).eq('id', id);
  location.reload();
}

if (window.location.pathname.includes('lista-espera')) {
  carregarPedidos('pendente', 'lista-espera', 'Concluir', 'concluido');
}
if (window.location.pathname.includes('concluidos')) {
  carregarPedidos('concluido', 'lista-concluidos', 'Entregar', 'entregue');
}
if (window.location.pathname.includes('entregues')) {
  carregarPedidos('entregue', 'lista-entregues');
}
function entrarComoCliente() {
    window.location.href = "lista-espera.html";
}

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

// === Função para abrir o modal de edição ===
async function abrirEditorPedido(id) {
  const { data: pedido, error } = await supabase.from("pedidos").select("*").eq("id", id).single();
  if (error || !pedido) {
    alert("Erro ao carregar pedido!");
    return;
  }

  const modal = document.getElementById("modal-editar");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden"; // impede scroll no fundo


  const itens = typeof pedido.itens === "string" ? JSON.parse(pedido.itens) : pedido.itens;
  let itensEditados = [...itens];
  let precoOriginal = pedido.preco_total || 0;

  const container = document.getElementById("itens-editar");
  const precoAntigo = document.getElementById("preco-antigo");
  const precoNovo = document.getElementById("preco-novo");
  const diferenca = document.getElementById("diferenca");

  precoAntigo.textContent = precoOriginal.toFixed(2);
  precoNovo.textContent = precoOriginal.toFixed(2);
  diferenca.textContent = "0.00";

  // Renderizar itens
  // Renderizar itens (com opção de adicionar)
const renderItens = () => {
  container.innerHTML = "";

  itensEditados.forEach((item, index) => {
    const div = document.createElement("div");
    div.style.marginBottom = "8px";
    div.innerHTML = `
      <p>
        <strong>${item.subtipo}</strong> - €${item.preco_total_item.toFixed(2)}
        <button data-index="${index}" class="remover-item">Remover</button>
      </p>
    `;
    container.appendChild(div);
  });

  // --- Adicionar item novo ---
  const divAdd = document.createElement("div");
  divAdd.style.marginTop = "10px";
  divAdd.innerHTML = `
    <hr>
    <h4>Adicionar Novo Item</h4>
    <select id="novo-subtipo">
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
    <input type="number" id="novo-preco" placeholder="Preço (€)" step="0.01" min="0">
    <input type="number" id="novo-quantidade" placeholder="Qtd" min="1" value="1">
    <button id="btn-add-item">Adicionar Item</button>
  `;
  container.appendChild(divAdd);

  // --- Atualiza preços ---
  const novoTotal = itensEditados.reduce((acc, i) => acc + i.preco_total_item, 0);
  precoNovo.textContent = novoTotal.toFixed(2);
  const dif = (novoTotal - precoOriginal).toFixed(2);
  diferenca.textContent = (dif >= 0 ? "+" : "") + dif;

  // --- Adicionar novo item ---
  document.getElementById("btn-add-item").onclick = () => {
    const subtipo = document.getElementById("novo-subtipo").value;
    const preco = parseFloat(document.getElementById("novo-preco").value) || 0;
    const quantidade = parseInt(document.getElementById("novo-quantidade").value) || 1;
    const dias = parseInt(document.getElementById("novo-subtipo").selectedOptions[0].dataset.dias);

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
      descricao: "",
      preco,
      quantidade,
      preco_total_item: preco * quantidade
    });

    renderItens();
  };
};


  renderItens();

  // Delegar evento de remoção
  container.onclick = (e) => {
    if (e.target.classList.contains("remover-item")) {
      const index = parseInt(e.target.dataset.index);
      itensEditados.splice(index, 1);
      renderItens();
    }
  };

  // Salvar alterações no Supabase
  document.getElementById("salvar-edicao").onclick = async () => {
    const novoTotal = parseFloat(precoNovo.textContent);

    const { error: updateError } = await supabase
      .from("pedidos")
      .update({
        itens: JSON.stringify(itensEditados),
        preco_total: novoTotal
      })
      .eq("id", id);

    if (updateError) {
      alert("Erro ao salvar alterações.");
    } else {
      alert("Pedido atualizado com sucesso!");
      modal.style.display = "none";
      location.reload();
    }
  };

  // Cancelar
  document.getElementById("fechar-edicao").onclick = () => {
  modal.style.display = "none";
  // Restaura a barra de rolagem do corpo ao fechar o modal
  document.body.style.overflow = "auto";
};

}
