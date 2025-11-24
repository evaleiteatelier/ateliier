// A linha de inicialização fica igual
emailjs.init("qyaKeJYFg3T07XDv3");

// --- FUNÇÃO 1: EMAIL DE CONCLUSÃO ---
// Chamada quando você marca o pedido como "Concluído"
async function enviarEmailConclusao(pedidoId, supabase) {
  // Pega dados do pedido no Supabase
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('id', pedidoId)
    .single();

  if (error || !pedido) {
    console.error("Pedido não encontrado, impossível enviar email.");
    throw new Error("Pedido não encontrado no Supabase.");
  }

  // Só envia email se tiver email do cliente
  if (pedido.email_cliente && pedido.email_cliente.length > 0) {
    
    // 1. Formatar a data do pedido
    const dataFormatada = new Date(pedido.data_pedido).toLocaleDateString('pt-PT');
    
    // 2. Formatar a lista de itens
    const itensArray = JSON.parse(pedido.itens);
    const listaItensHtml = `
      <ul style="padding-left: 0; list-style-position: inside; text-align: center;">
        ${itensArray.map(item => `<li style="margin-bottom: 5px; text-align: center;">${item.quantidade}x ${item.subtipo}</li>`).join('')}
      </ul>
    `;

    const templateParams = {
      cliente_nome: pedido.nome,
      pedido_id: pedido.id,
      mensagem: "O seu pedido está concluído e pronto para levantamento!",
      data_real: new Date().toLocaleDateString(),
      email_cliente: pedido.email_cliente,
      data_pedido: dataFormatada,
      lista_itens: listaItensHtml
    };
    
    // Faz o envio
    await emailjs.send(
      "service_h149o17", 
      "template_9tj6dch", // ID do template de CONCLUSÃO
      templateParams
    );
    
    console.log("✅ Email de CONCLUSÃO enviado com sucesso!");

  } else {
    console.log("Pedido não tem email de cliente. Email de conclusão não enviado.");
  }
}


// --- FUNÇÃO 2: EMAIL DE CONFIRMAÇÃO ---
// Chamada logo após criar um pedido novo em "adicionar-pedido.html"
/**
 * Envia um email de CONFIRMAÇÃO de novo pedido.
 * @param {object} pedido - O objeto 'novoPedido' completo do Supabase
 * @param {string} templateId - O ID do template de confirmação (ex: template_confirmacao)
 */
async function enviarEmailConfirmacao(pedido, templateId) {
  
  if (!pedido.email_cliente || pedido.email_cliente.length === 0) {
    console.log("Pedido sem email de cliente. Email de confirmação não enviado.");
    return; 
  }

  try {
    const dataPedidoF = new Date(pedido.data_pedido).toLocaleDateString('pt-PT');
    
    // Verifica se data_entrega existe antes de formatar, para evitar erro se estiver vazio
    const dataEntregaF = pedido.data_entrega 
        ? new Date(pedido.data_entrega).toLocaleDateString('pt-PT') 
        : "A definir";

    const itensArray = JSON.parse(pedido.itens);
    
    // Cria a lista HTML com descrição opcional
    const listaItensHtml = `
      <ul style="padding-left: 20px; text-align: left; margin: 10px 0;">
        ${itensArray.map(item => `
          <li style="margin-bottom: 8px; text-align: left;">
            <strong>${item.quantidade}x ${item.subtipo}</strong>
            ${item.descricao ? `<br><em style="font-size: 13px; color: #555;">(${item.descricao})</em>` : ''}
          </li>
        `).join('')}
      </ul>
    `;
    
    const templateParams = {
      cliente_nome: pedido.nome,
      email_cliente: pedido.email_cliente,
      pedido_id: pedido.id,
      data_pedido: dataPedidoF,
      data_entrega: dataEntregaF,
      lista_itens: listaItensHtml,
      preco_total: parseFloat(pedido.preco_total).toFixed(2) // Garante que é número
    };

    await emailjs.send(
      "service_h149o17", 
      templateId,
      templateParams
    );
    
    console.log("✅ Email de CONFIRMAÇÃO enviado com sucesso!");

  } catch (err) {
    console.error("❌ Erro ao enviar email de CONFIRMAÇÃO:", err);
  }
}
