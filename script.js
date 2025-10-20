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
  // usa a data que o utilizador colocou no campo, não a ajustada
  data_pedido: dataEscolhida.toISOString().split('T')[0],
  // data_real é apenas a data em que foi adicionado ao sistema (mantém como referência interna)
  data_real: hoje.toISOString().split('T')[0],
  itens: JSON.stringify(itens),
  data_entrega: dataEntrega.toISOString().split('T')[0],
  status: 'pendente'
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
        let tipo;
        if (subtipo === 'concerto') tipo = 'concerto';
        else if (subtipo === 'modificacao') tipo = 'modificacao';
        else tipo = 'criacao';
        itens.push({ tipo, subtipo, dias, descricao: desc });
    });
    return itens;
}


function adicionarItem() {
    const container = document.getElementById('itens');
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
        <select>
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
    `;
    container.appendChild(div);
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
      ${botaoAcao ? `<button class="admin-only" onclick="mudarStatus('${p.id}', '${novoStatus}')">${botaoAcao}</button>` : ''}
      ${filtro === 'pendente' ? `<button class="admin-only" onclick="excluirPedido('${p.id}')">Excluir</button>` : ''}
      <hr>
    `;

    container.appendChild(div);
  });

  // Chama a função para esconder botões para clientes
  esconderBotoesSeCliente();
}


async function mudarStatus(id, novoStatus) {
  await supabase.from('pedidos').update({ status: novoStatus }).eq('id', id);
  location.reload();
}

async function excluirPedido(id) {
  if (confirm("Tem certeza que deseja excluir este pedido?")) {
    await supabase.from('pedidos').delete().eq('id', id);
    location.reload();
  }
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




