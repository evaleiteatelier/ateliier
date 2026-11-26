// Inicialização EmailJS
if (typeof emailjs !== "undefined") {
  emailjs.init("qyaKeJYFg3T07XDv3");
}

// =========================================================================
// MOTOR DE AUTOMAÇÕES DO ATELIER (WHATSAPP MINI-PC & SMS MACRODROID)
// =========================================================================
const ATELIER_SB_URL = "https://cixjmwfkfmeedajpmzmp.supabase.co";
const ATELIER_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeGptd2ZrZm1lZWRhanBtem1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzM5ODIsImV4cCI6MjA2OTEwOTk4Mn0.vFvgRMK_oabG19FNauNaBu_CoQTL8QRSXcptyfY6rbM";
const ATELIER_SYS_ROW_NAME = "__ATELIER_AUTOMACOES_SYS__";

const DEFAULT_ATELIER_AUTOMACOES_CONFIG = {
  id: "default",
  macrodroid_webhook_url: "",
  evolution_instance: "atelier",
  evolution_url: "http://127.0.0.1:8080",
  evolution_apikey: "429683C4C977415CAAFCCE10F7D57E11",
  envio_direto_sms_browser: true,
  auto_novo_pedido: true,
  canal_novo_pedido: "ambos", // 'whatsapp' | 'sms' | 'ambos'
  template_zap_novo_pedido:
    "Olá {primeiro_nome}! ✨\n\nO seu pedido no *Eva Leite Atelier* foi registado com sucesso:\n{itens}\n\n📅 *Previsão de entrega:* {data_entrega}\n💶 *Total:* €{valor_total} (Adiantado: €{valor_pago} | Falta: €{falta_pagar})\n\nQualquer dúvida estamos ao dispor!\nCom carinho,\n*Eva Leite Atelier* 🧵",
  template_sms_novo_pedido:
    "Eva Leite Atelier: Ola {primeiro_nome}, o seu pedido ({itens_resumo}) foi registado! Entrega prevista: {data_entrega}. Total: {valor_total}EUR.",
  auto_pedido_concluido: true,
  canal_pedido_concluido: "ambos", // 'whatsapp' | 'sms' | 'ambos'
  template_zap_concluido:
    "Olá {primeiro_nome}! 🎉✨\n\nTemos boas notícias: o seu pedido no *Eva Leite Atelier* já está *concluído e pronto para levantamento*!\n\n🧵 *Peças:* {itens}\n💶 *Valor a liquidar no levantamento:* €{falta_pagar}\n\nAguardamos a sua visita no nosso horário de funcionamento. Até já! 💛",
  template_sms_concluido:
    "Eva Leite Atelier: Ola {primeiro_nome}! O seu pedido ({itens_resumo}) ja esta CONCLUIDO e pronto para levantamento. Valor a pagar: {falta_pagar}EUR. Ate ja!"
};

function getAtelierSupabaseClient(passedClient) {
  if (passedClient) return passedClient;
  if (window.supabaseClient) return window.supabaseClient;
  if (typeof supabase !== "undefined" && supabase && typeof supabase.from === "function") return supabase;
  if (window.supabase && typeof window.supabase.createClient === "function") {
    window._atelierAutoSb = window._atelierAutoSb || window.supabase.createClient(ATELIER_SB_URL, ATELIER_SB_KEY);
    return window._atelierAutoSb;
  }
  return null;
}

function normalizarTelefoneAtelier(raw, paraWhatsApp = true) {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 9 && (digits.startsWith("9") || digits.startsWith("2") || digits.startsWith("3"))) {
    digits = "351" + digits;
  }
  if (!paraWhatsApp) {
    return digits.startsWith("351") && digits.length === 12 ? "+" + digits : "+" + digits;
  }
  return digits;
}

// Lê ou inicializa o contentor fallback na tabela clientes_financas (caso as tabelas dedicadas ainda não tenham sido criadas no SQL Editor)
async function lerFallbackStoreAtelier(sb) {
  try {
    const { data, error } = await sb
      .from("clientes_financas")
      .select("id, medidas, morada")
      .eq("nome", ATELIER_SYS_ROW_NAME)
      .limit(1);
    if (error) return { rowId: null, store: { config: { ...DEFAULT_ATELIER_AUTOMACOES_CONFIG }, mensagens: [] } };
    if (data && data.length > 0) {
      const rawJson = data[0].medidas || data[0].morada || "{}";
      try {
        const parsed = JSON.parse(rawJson);
        return {
          rowId: data[0].id,
          store: {
            config: { ...DEFAULT_ATELIER_AUTOMACOES_CONFIG, ...(parsed.config || {}) },
            mensagens: Array.isArray(parsed.mensagens) ? parsed.mensagens : []
          }
        };
      } catch (e) {
        return { rowId: data[0].id, store: { config: { ...DEFAULT_ATELIER_AUTOMACOES_CONFIG }, mensagens: [] } };
      }
    }
    return { rowId: null, store: { config: { ...DEFAULT_ATELIER_AUTOMACOES_CONFIG }, mensagens: [] } };
  } catch (e) {
    return { rowId: null, store: { config: { ...DEFAULT_ATELIER_AUTOMACOES_CONFIG }, mensagens: [] } };
  }
}

async function salvarFallbackStoreAtelier(sb, store, existingRowId = null) {
  const jsonStr = JSON.stringify(store);
  let rowId = existingRowId;
  if (!rowId) {
    const cur = await lerFallbackStoreAtelier(sb);
    rowId = cur.rowId;
  }
  if (rowId) {
    await sb.from("clientes_financas").update({ medidas: jsonStr, morada: jsonStr }).eq("id", rowId);
  } else {
    await sb.from("clientes_financas").insert([{
      nome: ATELIER_SYS_ROW_NAME,
      nif: null,
      email: null,
      telefone: null,
      morada: jsonStr,
      medidas: jsonStr
    }]);
  }
}

async function carregarConfigAutomacoesAtelier(sbClient) {
  const sb = getAtelierSupabaseClient(sbClient);
  if (!sb) return { ...DEFAULT_ATELIER_AUTOMACOES_CONFIG, _usingFallback: true };

  try {
    const { data, error } = await sb
      .from("atelier_automacoes_config")
      .select("*")
      .eq("id", "default")
      .limit(1);

    if (!error) {
      if (data && data.length > 0) {
        return { ...DEFAULT_ATELIER_AUTOMACOES_CONFIG, ...data[0], _usingFallback: false };
      }
      // Tabela existe mas ainda sem linha default
      const inicial = { ...DEFAULT_ATELIER_AUTOMACOES_CONFIG };
      delete inicial.envio_direto_sms_browser;
      await sb.from("atelier_automacoes_config").insert([inicial]);
      return { ...DEFAULT_ATELIER_AUTOMACOES_CONFIG, _usingFallback: false };
    }
  } catch (e) {}

  // Fallback transparente via clientes_financas
  const { store } = await lerFallbackStoreAtelier(sb);
  return { ...DEFAULT_ATELIER_AUTOMACOES_CONFIG, ...(store.config || {}), _usingFallback: true };
}

async function guardarConfigAutomacoesAtelier(novaConfig, sbClient) {
  const sb = getAtelierSupabaseClient(sbClient);
  if (!sb) throw new Error("Cliente Supabase indisponível.");

  const merged = {
    ...DEFAULT_ATELIER_AUTOMACOES_CONFIG,
    ...novaConfig,
    id: "default",
    updated_at: new Date().toISOString()
  };

  // Sempre guarda também no fallback store para o Mini-PC ler de qualquer um dos dois
  try {
    const { rowId, store } = await lerFallbackStoreAtelier(sb);
    store.config = { ...merged };
    await salvarFallbackStoreAtelier(sb, store, rowId);
  } catch (e) {}

  try {
    const payload = { ...merged };
    delete payload._usingFallback;
    delete payload.envio_direto_sms_browser;
    const { error } = await sb.from("atelier_automacoes_config").upsert([payload], { onConflict: "id" });
    if (!error) return { ...merged, _usingFallback: false };
  } catch (e) {}

  return { ...merged, _usingFallback: true };
}

async function tentarDisparoDiretoMacroDroidSMS(webhookUrl, telefone, mensagem) {
  const urlBase = String(webhookUrl || "").trim();
  if (!urlBase || !urlBase.startsWith("https://")) return { ok: false, reason: "Webhook MacroDroid não configurado ou não HTTPS" };

  const numFormatado = normalizarTelefoneAtelier(telefone, false);
  const sep = urlBase.includes("?") ? "&" : "?";
  const targetUrl = `${urlBase}${sep}numero=${encodeURIComponent(numFormatado)}&texto=${encodeURIComponent(mensagem)}`;

  try {
    const resp = await fetch(targetUrl, { method: "GET", mode: "no-cors" });
    // Com mode: 'no-cors' o browser envia o GET HTTPS diretamente para trigger.macrodroid.com
    return { ok: true, status: resp.status || 200 };
  } catch (err) {
    return { ok: false, reason: err.message || String(err) };
  }
}

async function enfileirarMensagemAtelier(msgObj, sbClient) {
  const sb = getAtelierSupabaseClient(sbClient);
  if (!sb) throw new Error("Cliente Supabase indisponível.");

  const idGerado = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

  const agoraIso = new Date().toISOString();
  const item = {
    id: msgObj.id || idGerado,
    cliente_nome: (msgObj.cliente_nome || "Cliente").trim(),
    telefone: String(msgObj.telefone || "").trim(),
    canal: msgObj.canal || "whatsapp",
    tipo: msgObj.tipo || "manual",
    pedido_id: msgObj.pedido_id ? String(msgObj.pedido_id) : null,
    mensagem: String(msgObj.mensagem || "").trim(),
    scheduled_at: msgObj.scheduled_at || agoraIso,
    status: msgObj.status || "pending",
    sent_at: msgObj.sent_at || null,
    error_msg: msgObj.error_msg || null,
    created_at: msgObj.created_at || agoraIso
  };

  // Se for SMS imediato (scheduled_at <= agora) e o webhook MacroDroid estiver configurado com disparo direto ativo, dispara já em segundo plano!
  if (item.canal === "sms" && item.status === "pending") {
    const schedTime = new Date(item.scheduled_at).getTime();
    if (schedTime <= Date.now() + 60000) {
      const cfg = await carregarConfigAutomacoesAtelier(sb);
      if (cfg.macrodroid_webhook_url && cfg.envio_direto_sms_browser !== false) {
        const resSms = await tentarDisparoDiretoMacroDroidSMS(cfg.macrodroid_webhook_url, item.telefone, item.mensagem);
        if (resSms.ok) {
          item.status = "sent";
          item.sent_at = new Date().toISOString();
        }
      }
    }
  }

  // Tenta inserir na tabela dedicada atelier_mensagens
  let inseriuTabelaDedicada = false;
  try {
    const { error } = await sb.from("atelier_mensagens").insert([item]);
    if (!error) inseriuTabelaDedicada = true;
  } catch (e) {}

  // Mantém também sincronizado no fallback store caso a tabela dedicada ainda não exista
  if (!inseriuTabelaDedicada) {
    const { rowId, store } = await lerFallbackStoreAtelier(sb);
    store.mensagens.unshift(item);
    if (store.mensagens.length > 500) store.mensagens = store.mensagens.slice(0, 500);
    await salvarFallbackStoreAtelier(sb, store, rowId);
  }

  return item;
}

async function descobrirTelefoneClientePedido(pedido, sbClient) {
  const sb = getAtelierSupabaseClient(sbClient);
  const direto = (pedido.fatura_contato_envio || pedido.telefone_cliente || pedido.telefone || "").trim();
  if (direto && direto.replace(/\D/g, "").length >= 6) {
    return direto;
  }
  if (!sb || !pedido.nome) return "";

  const nomeLimpo = String(pedido.nome).trim();
  try {
    const { data: cli } = await sb
      .from("clientes_financas")
      .select("telefone")
      .ilike("nome", nomeLimpo)
      .limit(1);
    if (cli && cli.length > 0 && cli[0].telefone && cli[0].telefone.replace(/\D/g, "").length >= 6) {
      return cli[0].telefone.trim();
    }
  } catch (e) {}

  try {
    const { data: pAnt } = await sb
      .from("pedidos")
      .select("fatura_contato_envio")
      .ilike("nome", nomeLimpo)
      .not("fatura_contato_envio", "is", null)
      .order("data_pedido", { ascending: false })
      .limit(5);
    if (pAnt && pAnt.length > 0) {
      const comTel = pAnt.find(x => x.fatura_contato_envio && x.fatura_contato_envio.replace(/\D/g, "").length >= 6);
      if (comTel) return comTel.fatura_contato_envio.trim();
    }
  } catch (e) {}

  return "";
}

function compilarTemplateMensagemAtelier(templateStr, pedido) {
  const nomeCompleto = String(pedido.nome || "Cliente").trim();
  const primeiroNome = nomeCompleto.split(/\s+/)[0] || "Cliente";

  let itensArr = [];
  try {
    itensArr = typeof pedido.itens === "string" ? JSON.parse(pedido.itens) : (pedido.itens || []);
  } catch (e) {
    itensArr = [];
  }

  const itensMultilinha = itensArr.length > 0
    ? itensArr.map(i => `• ${i.quantidade || 1}x ${i.subtipo || "Peça"}${i.descricao ? ` (${i.descricao})` : ""}`).join("\n")
    : "• Serviço de Costura / Atelier";

  const itensResumo = itensArr.length > 0
    ? itensArr.map(i => `${i.quantidade || 1}x ${i.subtipo || "Peca"}`).join(", ")
    : "Servico Atelier";

  const dataEntregaF = pedido.data_entrega
    ? new Date(pedido.data_entrega.includes("T") ? pedido.data_entrega : pedido.data_entrega + "T12:00:00").toLocaleDateString("pt-PT")
    : "A definir";

  const valorTotalNum = Number(pedido.preco_final ?? pedido.preco_total ?? 0) || 0;
  let valorPagoNum = Number(pedido.valor_adiantado ?? 0) || 0;
  try {
    const pgmts = typeof pedido.pagamentos === "string" ? JSON.parse(pedido.pagamentos) : pedido.pagamentos;
    if (Array.isArray(pgmts) && pgmts.length > 0) {
      const soma = pgmts.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
      if (soma > valorPagoNum) valorPagoNum = soma;
    }
  } catch (e) {}
  const faltaPagarNum = Math.max(0, valorTotalNum - valorPagoNum);

  return String(templateStr || "")
    .replace(/\{nome\}/gi, nomeCompleto)
    .replace(/\{primeiro_nome\}/gi, primeiroNome)
    .replace(/\{itens\}/gi, itensMultilinha)
    .replace(/\{itens_resumo\}/gi, itensResumo)
    .replace(/\{data_entrega\}/gi, dataEntregaF)
    .replace(/\{valor_total\}/gi, valorTotalNum.toFixed(2))
    .replace(/\{valor_pago\}/gi, valorPagoNum.toFixed(2))
    .replace(/\{falta_pagar\}/gi, faltaPagarNum.toFixed(2));
}

async function dispararAutomacaoPedidoAtelier(tipoEvento, pedido, sbClient) {
  try {
    const sb = getAtelierSupabaseClient(sbClient);
    const cfg = await carregarConfigAutomacoesAtelier(sb);

    const isNovo = tipoEvento === "confirmacao";
    const ativo = isNovo ? cfg.auto_novo_pedido !== false : cfg.auto_pedido_concluido !== false;
    if (!ativo) {
      console.log(`ℹ️ Automação de ${tipoEvento} desativada nas configurações do Atelier.`);
      return;
    }

    const telefone = await descobrirTelefoneClientePedido(pedido, sb);
    if (!telefone) {
      console.log(`ℹ️ Cliente "${pedido.nome}" sem telefone registado — automação WhatsApp/SMS ignorada.`);
      return;
    }

    // Guarda também o telefone na ficha do cliente (clientes_financas) se ainda não estiver lá
    if (sb && pedido.nome) {
      try {
        const nomeLimpo = String(pedido.nome).trim();
        const { data: cliExist } = await sb.from("clientes_financas").select("id, telefone").ilike("nome", nomeLimpo).limit(1);
        if (cliExist && cliExist.length > 0 && !cliExist[0].telefone) {
          await sb.from("clientes_financas").update({ telefone }).eq("id", cliExist[0].id);
        }
      } catch (e) {}
    }

    const canalConfig = isNovo ? (cfg.canal_novo_pedido || "ambos") : (cfg.canal_pedido_concluido || "ambos");
    const canaisParaDisparar = [];
    if (canalConfig === "whatsapp" || canalConfig === "ambos") canaisParaDisparar.push("whatsapp");
    if (canalConfig === "sms" || canalConfig === "ambos") canaisParaDisparar.push("sms");

    for (const canal of canaisParaDisparar) {
      const tpl = isNovo
        ? (canal === "whatsapp" ? cfg.template_zap_novo_pedido : cfg.template_sms_novo_pedido)
        : (canal === "whatsapp" ? cfg.template_zap_concluido : cfg.template_sms_concluido);

      const mensagemFinal = compilarTemplateMensagemAtelier(tpl, pedido);
      await enfileirarMensagemAtelier({
        cliente_nome: pedido.nome || "Cliente",
        telefone: telefone,
        canal: canal,
        tipo: tipoEvento,
        pedido_id: pedido.id ? String(pedido.id) : null,
        mensagem: mensagemFinal
      }, sb);
      console.log(`✅ Automação (${canal.toUpperCase()} - ${tipoEvento}) registada para ${pedido.nome} (${telefone})`);
    }
  } catch (err) {
    console.warn(`⚠️ Aviso ao processar automação WhatsApp/SMS (${tipoEvento}):`, err);
  }
}

window.AtelierAutomacoes = {
  DEFAULT_CONFIG: DEFAULT_ATELIER_AUTOMACOES_CONFIG,
  normalizarTelefone: normalizarTelefoneAtelier,
  carregarConfig: carregarConfigAutomacoesAtelier,
  guardarConfig: guardarConfigAutomacoesAtelier,
  enfileirarMensagem: enfileirarMensagemAtelier,
  dispararAutomacaoPedido: dispararAutomacaoPedidoAtelier,
  tentarDisparoDiretoMacroDroidSMS: tentarDisparoDiretoMacroDroidSMS,
  compilarTemplate: compilarTemplateMensagemAtelier,
  lerFallbackStore: lerFallbackStoreAtelier,
  salvarFallbackStore: salvarFallbackStoreAtelier
};


// --- FUNÇÃO 1: EMAIL + WHATSAPP/SMS DE CONCLUSÃO ---
// Chamada quando marca o pedido como "Concluído"
async function enviarEmailConclusao(pedidoId, supabase) {
  const sb = getAtelierSupabaseClient(supabase);
  const { data: pedido, error } = await sb
    .from('pedidos')
    .select('*')
    .eq('id', pedidoId)
    .single();

  if (error || !pedido) {
    console.error("Pedido não encontrado, impossível enviar notificação.");
    throw new Error("Pedido não encontrado no Supabase.");
  }

  // 1. Dispara Automação de WhatsApp e/ou SMS (mesmo que o cliente não tenha email!)
  await dispararAutomacaoPedidoAtelier("concluido", pedido, sb);

  // 2. Só envia email se tiver email do cliente
  if (pedido.email_cliente && pedido.email_cliente.length > 0 && typeof emailjs !== "undefined") {
    const dataFormatada = new Date(pedido.data_pedido).toLocaleDateString('pt-PT');
    const itensArray = typeof pedido.itens === "string" ? JSON.parse(pedido.itens) : (pedido.itens || []);
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

    await emailjs.send(
      "service_h149o17",
      "template_9tj6dch",
      templateParams
    );

    console.log("✅ Email de CONCLUSÃO enviado com sucesso!");
  } else {
    console.log("Pedido não tem email de cliente. Email de conclusão não enviado (WhatsApp/SMS processados).");
  }
}


// --- FUNÇÃO 2: EMAIL + WHATSAPP/SMS DE CONFIRMAÇÃO ---
// Chamada logo após criar um pedido novo em "adicionar-pedido.html"
async function enviarEmailConfirmacao(pedido, templateId) {
  // 1. Dispara Automação de WhatsApp e/ou SMS (mesmo que o cliente não tenha email!)
  await dispararAutomacaoPedidoAtelier("confirmacao", pedido);

  // 2. Envia Email se o cliente tiver email preenchido
  if (!pedido.email_cliente || pedido.email_cliente.length === 0 || typeof emailjs === "undefined") {
    console.log("Pedido sem email de cliente. Email de confirmação não enviado (WhatsApp/SMS processados).");
    return;
  }

  try {
    const dataPedidoF = new Date(pedido.data_pedido).toLocaleDateString('pt-PT');
    const dataEntregaF = pedido.data_entrega
        ? new Date(pedido.data_entrega).toLocaleDateString('pt-PT')
        : "A definir";

    const itensArray = typeof pedido.itens === "string" ? JSON.parse(pedido.itens) : (pedido.itens || []);

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
      preco_total: parseFloat(pedido.preco_total).toFixed(2)
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
