// A linha de inicialização fica igual
emailjs.init("qyaKeJYFg3T07XDv3");

/**
 * Envia um email de conclusão de pedido.
 * @param {string} pedidoId - O ID do pedido
 * @param {object} supabase - O cliente Supabase inicializado (passado do script.js)
 */
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
    
    // --- [NOVO CÓDIGO AQUI] ---
    
    // 1. Formatar a data do pedido (de "AAAA-MM-DD" para "DD/MM/AAAA")
    const dataFormatada = new Date(pedido.data_pedido).toLocaleDateString('pt-PT');
    
    // 2. Formatar a lista de itens (de JSON para uma lista HTML)
    const itensArray = JSON.parse(pedido.itens);
    const listaItensHtml = `
      <ul>
        ${itensArray.map(item => `<li>${item.quantidade}x ${item.subtipo}</li>`).join('')}
      </ul>
    `;
    // --- [FIM DO NOVO CÓDIGO] ---

    const templateParams = {
      // Os que já tinhas
      cliente_nome: pedido.nome,
      pedido_id: pedido.id,
      mensagem: "O seu pedido está concluído e pronto para levantamento!",
      data_real: new Date().toLocaleDateString(),
      email_cliente: pedido.email_cliente,
      
      // 👇👇 [AS 2 NOVAS LINHAS] 👇👇
      data_pedido: dataFormatada,
      lista_itens: listaItensHtml
    };
    
    // Faz o envio
    await emailjs.send(
      "service_h149o17", 
      "template_9tj6dch", 
      templateParams
    );
    
    console.log("✅ Email enviado com sucesso!");

  } else {
    console.log("Pedido não tem email de cliente. Email não enviado.");
  }
}
