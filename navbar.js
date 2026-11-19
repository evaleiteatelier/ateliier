const LIQUID_NAVBAR_CSS = `
  /* =====================================================
     BARRA SUPERIOR FLUTUANTE LIQUID GLASS (GLOBAL)
     ===================================================== */
  body {
    padding-top: 96px !important;
    margin: 0;
  }

  .liquid-topbar-wrap {
    position: fixed;
    top: 14px;
    left: 20px;
    right: 20px;
    z-index: 1500;
    pointer-events: none;
  }

  .liquid-topbar {
    pointer-events: auto;
    max-width: 1380px;
    margin: 0 auto;
    height: 62px;
    padding: 0 14px;
    border-radius: 20px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    position: relative;
    box-sizing: border-box;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  /* Camada de vidro da barra separada em ::before para permitir que os menus filhos apliquem blur real sobre o fundo da página */
  .liquid-topbar::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(250, 247, 242, 0.52) 100%);
    backdrop-filter: blur(26px) saturate(190%);
    -webkit-backdrop-filter: blur(26px) saturate(190%);
    border: 1px solid rgba(255, 255, 255, 0.88);
    box-shadow:
      0 12px 34px rgba(20, 18, 14, 0.08),
      0 2px 6px rgba(0, 0, 0, 0.03),
      inset 0 1px 0 rgba(255, 255, 255, 0.95),
      inset 0 -1px 0 rgba(220, 212, 198, 0.35);
    z-index: 0;
    pointer-events: none;
  }

  /* ── ZONA ESQUERDA: ÍCONE DE MENU + BUSCA + FILTRO ── */
  .liquid-left {
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 2;
    justify-self: start;
    min-width: 0;
    position: relative;
  }

  .liquid-dynamic-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .liquid-menu-wrap {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
  }

  /* Botão do Ícone/Logo que abre o Context Menu */
  .liquid-brand-btn {
    width: auto !important;
    margin: 0 !important;
    height: 42px !important;
    padding: 0 12px !important;
    border-radius: 13px !important;
    background: rgba(255, 255, 255, 0.65) !important;
    border: 1px solid rgba(226, 220, 208, 0.85) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03), inset 0 1px 0 #fff !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 9px !important;
    cursor: pointer;
    transition: all 0.18s ease;
    color: #1a1a1a !important;
    box-sizing: border-box;
    line-height: 1;
    font-family: inherit;
  }
  .liquid-brand-btn:hover,
  .liquid-brand-btn.aberto {
    background: rgba(255, 255, 255, 0.95) !important;
    border-color: #c8bfb0 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06) !important;
  }
  .liquid-brand-logo {
    height: 28px;
    width: auto;
    display: block;
  }
  .liquid-menu-trigger-ico {
    width: 15px;
    height: 15px;
    stroke: #555;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
    transition: transform 0.2s ease;
  }
  .liquid-brand-btn.aberto .liquid-menu-trigger-ico {
    transform: rotate(90deg);
    stroke: #1a1a1a;
  }

  /* ── CONTEXT MENU (ESTILO CLIQUE DIREITO DO WINDOWS 11) ── */
  .liquid-context-menu {
    display: none;
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    width: 248px;
    padding: 7px;
    border-radius: 16px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.78) 0%, rgba(248, 245, 238, 0.68) 100%);
    backdrop-filter: blur(48px) saturate(210%);
    -webkit-backdrop-filter: blur(48px) saturate(210%);
    border: 1px solid rgba(255, 255, 255, 0.94);
    box-shadow:
      0 20px 50px rgba(15, 14, 12, 0.18),
      0 4px 12px rgba(0, 0, 0, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.98);
    z-index: 3500;
    transform-origin: top left;
    animation: winContextOpen 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: visible !important;
    max-height: none !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
    box-sizing: border-box;
  }
  .liquid-context-menu::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }
  .liquid-context-menu.aberto {
    display: block;
  }
  @keyframes winContextOpen {
    from { opacity: 0; transform: scale(0.95) translateY(-4px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  .ctx-group-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #8a8377;
    padding: 6px 10px 4px;
    user-select: none;
  }

  .ctx-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 11px;
    border-radius: 9px;
    text-decoration: none;
    color: #222;
    font-size: 0.84rem;
    font-weight: 500;
    transition: background 0.12s ease, color 0.12s ease;
    position: relative;
  }
  .ctx-item-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ctx-item svg {
    width: 16px;
    height: 16px;
    stroke: #555;
    stroke-width: 1.75;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
    flex-shrink: 0;
    transition: stroke 0.12s ease;
  }
  .ctx-item:hover {
    background: rgba(26, 26, 26, 0.06);
    color: #000;
  }
  .ctx-item:hover svg {
    stroke: #111;
  }
  .ctx-item.ativo {
    background: rgba(26, 26, 26, 0.08);
    color: #111;
    font-weight: 600;
  }
  .ctx-item.ativo svg {
    stroke: #111;
  }
  .ctx-active-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #1a1a1a;
    flex-shrink: 0;
  }

  .ctx-item.ctx-highlight {
    background: #1a1a1a;
    color: #fff !important;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .ctx-item.ctx-highlight svg {
    stroke: #fff !important;
  }
  .ctx-item.ctx-highlight:hover {
    background: #333;
    color: #fff !important;
  }

  .ctx-sep {
    height: 1px;
    background: rgba(0, 0, 0, 0.07);
    margin: 5px 6px;
  }

  /* ── PASTA / SUBMENU FLUTUANTE (WINDOWS 11 FLYOUT) ── */
  .ctx-has-sub {
    position: relative;
    cursor: pointer;
    user-select: none;
  }
  .ctx-arrow {
    width: 14px !important;
    height: 14px !important;
    stroke: #888 !important;
    stroke-width: 2 !important;
    fill: none;
    transition: transform 0.15s ease, stroke 0.15s ease;
  }
  .ctx-has-sub:hover .ctx-arrow,
  .ctx-has-sub.sub-aberto .ctx-arrow {
    stroke: #111 !important;
    transform: translateX(2px);
  }

  .ctx-submenu {
    display: none;
    position: absolute;
    top: auto;
    bottom: -6px;
    left: calc(100% + 8px);
    width: 224px;
    padding: 7px;
    border-radius: 16px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.84) 0%, rgba(248, 245, 238, 0.74) 100%);
    backdrop-filter: blur(48px) saturate(210%);
    -webkit-backdrop-filter: blur(48px) saturate(210%);
    border: 1px solid rgba(255, 255, 255, 0.94);
    box-shadow:
      0 20px 50px rgba(15, 14, 12, 0.18),
      0 4px 12px rgba(0, 0, 0, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.98);
    z-index: 3600;
    animation: winContextOpen 0.14s cubic-bezier(0.16, 1, 0.3, 1);
    transform-origin: bottom left;
    box-sizing: border-box;
  }
  .ctx-submenu .ctx-item {
    padding: 6.5px 10px;
  }
  @media (max-height: 540px) {
    .ctx-submenu {
      max-height: calc(100vh - 104px);
      overflow-y: auto;
    }
  }
  /* Ponte invisível para o cursor não perder o hover no espaço entre os menus */
  .ctx-submenu::before {
    content: '';
    position: absolute;
    top: 0;
    left: -12px;
    width: 14px;
    height: 100%;
  }
  .ctx-has-sub:hover > .ctx-submenu,
  .ctx-has-sub.sub-aberto > .ctx-submenu {
    display: block;
  }

  /* ── BARRA DE PESQUISA + FILTRO NA ESQUERDA (DENTRO DA BARRA LIQUID) ── */
  .liquid-left .toolbar-search-wrap,
  .liquid-left .liquid-search-wrap {
    position: relative;
    display: flex;
    align-items: center;
    width: 220px;
    max-width: 100%;
  }
  .liquid-left .toolbar-search-wrap svg,
  .liquid-left .liquid-search-wrap svg {
    position: absolute;
    left: 12px;
    width: 15px;
    height: 15px;
    stroke: #777;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
    pointer-events: none;
  }
  .liquid-left .toolbar-search-wrap input,
  .liquid-left .liquid-search-wrap input {
    width: 100% !important;
    height: 40px !important;
    margin: 0 !important;
    padding: 0 14px 0 34px !important;
    border-radius: 12px !important;
    border: 1px solid rgba(215, 208, 196, 0.85) !important;
    background: rgba(255, 255, 255, 0.65) !important;
    color: #1a1a1a !important;
    font-size: 0.85rem !important;
    outline: none;
    transition: all 0.18s ease;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.02) !important;
    box-sizing: border-box;
  }
  .liquid-left .toolbar-search-wrap input:focus,
  .liquid-left .liquid-search-wrap input:focus {
    background: rgba(255, 255, 255, 0.95) !important;
    border-color: #1a1a1a !important;
    width: 250px !important;
  }

  .liquid-left .filter-dropdown-wrap {
    flex-shrink: 0;
  }
  .liquid-left .btn-filter-icon {
    border-radius: 12px !important;
    background: rgba(255, 255, 255, 0.65) !important;
    border: 1px solid rgba(215, 208, 196, 0.85) !important;
  }
  .liquid-left .btn-filter-icon:hover,
  .liquid-left .btn-filter-icon.ativo {
    background: #1a1a1a !important;
    border-color: #1a1a1a !important;
    color: #fff !important;
  }
  .liquid-left .filter-popover {
    left: 0 !important;
    right: auto !important;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.82) 0%, rgba(248, 245, 238, 0.72) 100%) !important;
    backdrop-filter: blur(48px) saturate(210%) !important;
    -webkit-backdrop-filter: blur(48px) saturate(210%) !important;
    border: 1px solid rgba(255, 255, 255, 0.94) !important;
    border-radius: 14px !important;
    box-shadow: 0 20px 50px rgba(15, 14, 12, 0.18), 0 4px 12px rgba(0, 0, 0, 0.06) !important;
  }

  /* ── ZONA CENTRAL: BOLHA LIQUID GLASS DO TÍTULO ── */
  .liquid-center-bubble {
    justify-self: center;
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 8px 24px;
    border-radius: 999px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(244, 240, 232, 0.52) 100%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.96);
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.06),
      inset 0 1px 1px rgba(255, 255, 255, 1),
      inset 0 -1px 1px rgba(210, 202, 188, 0.35);
    pointer-events: auto;
    white-space: nowrap;
  }
  .liquid-center-bubble h1 {
    margin: 0 !important;
    font-size: 0.96rem !important;
    font-weight: 600 !important;
    letter-spacing: -0.01em;
    color: #1a1a1a !important;
    border: none !important;
    padding: 0 !important;
    line-height: 1.2 !important;
    text-align: center !important;
  }
  .liquid-bubble-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #1a1a1a;
    opacity: 0.75;
    flex-shrink: 0;
  }

  /* ── ZONA DIREITA: AÇÃO RÁPIDA ── */
  .liquid-right {
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 2;
    justify-self: end;
    position: relative;
  }
  .liquid-dynamic-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .liquid-dynamic-right button {
    width: auto !important;
    margin: 0 !important;
    height: 40px !important;
    border-radius: 12px !important;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: inherit;
    box-sizing: border-box;
  }
  .liquid-dynamic-right .ico {
    width: 15px;
    height: 15px;
    stroke: currentColor;
    stroke-width: 1.85;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
    flex-shrink: 0;
  }
  .liquid-action-btn {
    height: 40px;
    padding: 0 16px;
    border-radius: 12px;
    background: #1a1a1a;
    color: #fff !important;
    text-decoration: none;
    font-size: 0.83rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    transition: all 0.18s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    white-space: nowrap;
    box-sizing: border-box;
  }
  .liquid-action-btn:hover {
    background: #333;
    transform: translateY(-1px);
  }
  .liquid-action-btn svg {
    width: 15px;
    height: 15px;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }

  @media (max-width: 1120px) {
    .liquid-left .toolbar-search-wrap,
    .liquid-left .liquid-search-wrap {
      width: 165px;
    }
    .liquid-left .toolbar-search-wrap input:focus,
    .liquid-left .liquid-search-wrap input:focus {
      width: 195px !important;
    }
    .liquid-center-bubble {
      padding: 7px 16px;
    }
  }

  @media (max-width: 960px) {
    .liquid-center-bubble {
      padding: 6px 14px;
    }
    .liquid-left .toolbar-search-wrap,
    .liquid-left .liquid-search-wrap {
      width: 140px;
    }
    .liquid-left .toolbar-search-wrap input:focus,
    .liquid-left .liquid-search-wrap input:focus {
      width: 165px !important;
    }
    .liquid-action-btn span {
      display: none;
    }
    .liquid-action-btn {
      padding: 0 12px;
    }
    .ctx-submenu {
      left: 16px;
      top: calc(100% + 4px);
      bottom: auto;
      transform-origin: top left;
      max-height: clamp(190px, 38vh, 360px);
      overflow-y: auto;
    }
    .ctx-submenu::before {
      top: -8px;
      left: 0;
      width: 100%;
      height: 10px;
    }
  }

  @media (max-width: 720px) {
    .liquid-topbar-wrap {
      left: 10px;
      right: 10px;
    }
    .liquid-topbar {
      display: flex;
      justify-content: space-between;
    }
    .liquid-center-bubble {
      display: none;
    }
  }
`;

const LIQUID_NAVBAR_HTML = `
<!-- BARRA SUPERIOR FLUTUANTE LIQUID GLASS (GLOBAL) -->
<div class="liquid-topbar-wrap" id="liquid-topbar-wrap">
  <header class="liquid-topbar">

    <!-- ESQUERDA: Ícone de Menu (Context Menu) + Busca/Filtro da Página -->
    <div class="liquid-left">

      <!-- Botão Logo/Menu -->
      <div class="liquid-menu-wrap" id="liquid-menu-wrap">
        <button type="button" class="liquid-brand-btn" id="btn-liquid-menu" onclick="toggleLiquidContextMenu(event)" title="Abrir Menu de Navegação">
          <img src="img/logo.png" alt="Eva Leite Atelier" class="liquid-brand-logo">
          <svg class="liquid-menu-trigger-ico" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
            <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
          </svg>
        </button>

        <!-- Context Menu Estilo Windows 11 -->
        <div class="liquid-context-menu" id="liquid-context-menu" role="menu" onclick="event.stopPropagation()">
          <a href="adicionar-pedido.html" data-page="adicionar-pedido.html" class="ctx-item ctx-highlight">
            <span class="ctx-item-left">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Novo Pedido
            </span>
          </a>

          <div class="ctx-sep"></div>
          <div class="ctx-group-label">Pedidos</div>

          <a href="lista-espera.html" data-page="lista-espera.html" class="ctx-item">
            <span class="ctx-item-left">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Lista de Espera
            </span>
          </a>
          <a href="concluidos.html" data-page="concluidos.html" class="ctx-item">
            <span class="ctx-item-left">
              <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Concluídos
            </span>
          </a>
          <a href="entregues.html" data-page="entregues.html" class="ctx-item">
            <span class="ctx-item-left">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              Histórico
            </span>
          </a>

          <div class="ctx-sep"></div>
          <div class="ctx-group-label">Clientes & Benefícios</div>

          <a href="clientes.html" data-page="clientes.html" class="ctx-item">
            <span class="ctx-item-left">
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Central de Clientes
            </span>
          </a>
          <a href="vouchers.html" data-page="vouchers.html" class="ctx-item">
            <span class="ctx-item-left">
              <svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
              Vouchers
            </span>
          </a>

          <div class="ctx-sep"></div>

          <!-- PASTA / SUBMENU ADMINISTRAÇÃO (FLYOUT ESTILO WINDOWS 11) -->
          <div class="ctx-item ctx-has-sub" id="item-sub-admin" onclick="toggleLiquidSubmenu(event, this)">
            <span class="ctx-item-left">
              <svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              Administração
            </span>
            <svg class="ctx-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>

            <!-- SUBMENU FLUTUANTE EM VIDRO -->
            <div class="ctx-submenu" onclick="event.stopPropagation()">
              <a href="dashboard.html" data-page="dashboard.html" class="ctx-item">
                <span class="ctx-item-left">
                  <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
                  Dashboard
                </span>
              </a>
              <a href="financas.html" data-page="financas.html" class="ctx-item">
                <span class="ctx-item-left">
                  <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  Finanças
                </span>
              </a>
              <a href="contas.html" data-page="contas.html" class="ctx-item">
                <span class="ctx-item-left">
                  <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                  Contas
                </span>
              </a>
              <a href="gerir-produtos.html" data-page="gerir-produtos.html" class="ctx-item">
                <span class="ctx-item-left">
                  <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                  Gerir Produtos
                </span>
              </a>
              <a href="gestao-site.html" data-page="gestao-site.html" class="ctx-item">
                <span class="ctx-item-left">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                  Gestão do Site
                </span>
              </a>
              <a href="gestao-tecidos.html" data-page="gestao-tecidos.html" class="ctx-item">
                <span class="ctx-item-left">
                  <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                  Gestão de Tecidos
                </span>
              </a>
              <a href="lista-compras.html" data-page="lista-compras.html" class="ctx-item">
                <span class="ctx-item-left">
                  <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                  Lista de Compras
                </span>
              </a>
              <a href="precificador.html" data-page="precificador.html" class="ctx-item">
                <span class="ctx-item-left">
                  <svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path></svg>
                  Precificador
                </span>
              </a>
              <a href="fidelidade.html" data-page="fidelidade.html" class="ctx-item">
                <span class="ctx-item-left">
                  <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  Fidelidade
                </span>
              </a>
              <a href="tv-atelier.html" data-page="tv-atelier.html" class="ctx-item">
                <span class="ctx-item-left">
                  <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="18" x2="12" y2="21"></line></svg>
                  TV do Atelier
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Contentor dinâmico que recebe a Barra de Pesquisa + Botão de Filtro da página atual -->
      <div class="liquid-dynamic-left" id="liquid-dynamic-left"></div>

    </div>

    <!-- CENTRO: Bolha Liquid Glass com o Título da Página -->
    <div class="liquid-center-bubble" id="liquid-center-bubble">
      <span class="liquid-bubble-dot"></span>
      <h1 id="liquid-page-title">Eva Leite Atelier</h1>
    </div>

    <!-- DIREITA: Ações Rápidas da Página ou "+ Novo Pedido" -->
    <div class="liquid-right" id="liquid-right">
      <div class="liquid-dynamic-right" id="liquid-dynamic-right"></div>
      <a href="adicionar-pedido.html" class="liquid-action-btn" id="liquid-default-action">
        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Novo Pedido</span>
      </a>
    </div>

  </header>
</div>
`;

function inicializarBarraLiquidGlass() {
    // Não carrega na página de redirecionamento inicial
    if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
        return;
    }

    // Evita duplicação caso já esteja montada
    if (document.getElementById("liquid-topbar-wrap")) {
        return;
    }

    // Injeta os estilos no <head> (sem fetch HTML externo para evitar injeção/truncamento do Live Server em </svg>)
    if (!document.getElementById("liquid-navbar-styles") && document.head) {
        const styleEl = document.createElement("style");
        styleEl.id = "liquid-navbar-styles";
        styleEl.textContent = LIQUID_NAVBAR_CSS;
        document.head.appendChild(styleEl);
    }

    const placeholder = document.getElementById("navbar-placeholder");
    if (placeholder) {
        placeholder.innerHTML = LIQUID_NAVBAR_HTML;
    } else if (document.body) {
        document.body.insertAdjacentHTML("afterbegin", LIQUID_NAVBAR_HTML);
    }

    configurarBarra();
}

const MAPA_TITULOS_PAGINA = {
    "lista-espera.html": "Lista de Espera",
    "concluidos.html": "Concluídos",
    "entregues.html": "Histórico",
    "clientes.html": "Central de Clientes",
    "vouchers.html": "Gestão de Vouchers",
    "adicionar-pedido.html": "Novo Pedido",
    "editar-pedido.html": "Editar Pedido",
    "dashboard.html": "Dashboard",
    "financas.html": "Finanças",
    "contas.html": "Contas",
    "gerir-produtos.html": "Gerir Produtos",
    "gestao-site.html": "Gestão do Site",
    "gestao-tecidos.html": "Gestão de Tecidos",
    "lista-compras.html": "Lista de Compras",
    "precificador.html": "Precificador",
    "fidelidade.html": "Fidelidade",
    "tv-atelier.html": "TV do Atelier"
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarBarraLiquidGlass);
} else {
    inicializarBarraLiquidGlass();
}

function obterPaginaAtual() {
    let paginaAtual = window.location.pathname.split("/").pop() || "lista-espera.html";
    if (paginaAtual && !paginaAtual.includes(".")) {
        paginaAtual += ".html";
    }
    return paginaAtual;
}

function configurarBarra() {
    const paginaAtual = obterPaginaAtual();

    // 1. Destacar página ativa no Context Menu
    const links = document.querySelectorAll("#liquid-context-menu a.ctx-item");
    links.forEach(link => {
        if (link.dataset.page === paginaAtual && !link.classList.contains("ctx-highlight")) {
            link.classList.add("ativo");
            if (!link.querySelector(".ctx-active-dot")) {
                const dot = document.createElement("span");
                dot.className = "ctx-active-dot";
                link.appendChild(dot);
            }
            const parentSub = link.closest(".ctx-has-sub");
            if (parentSub) {
                parentSub.classList.add("ativo");
            }
        }
    });

    // 2. Definir Título na Bolha Central Liquid Glass
    const titleEl = document.getElementById("liquid-page-title");
    if (titleEl) {
        if (MAPA_TITULOS_PAGINA[paginaAtual]) {
            titleEl.textContent = MAPA_TITULOS_PAGINA[paginaAtual];
        } else {
            const h1Pagina = document.querySelector("body > h1, .page-toolbar h1, .clientes-header h1, .page-header h1");
            if (h1Pagina) {
                titleEl.textContent = h1Pagina.textContent.trim();
            }
        }
    }

    // 3. Absorver Pesquisa, Filtro e Botões de Ação das páginas para dentro da Barra Liquid Glass
    const dynamicLeft = document.getElementById("liquid-dynamic-left");
    const dynamicRight = document.getElementById("liquid-dynamic-right");
    const defaultAction = document.getElementById("liquid-default-action");

    if (paginaAtual === "adicionar-pedido.html" && defaultAction) {
        defaultAction.style.display = "none";
    }

    const toolbar = document.querySelector(".page-toolbar, .clientes-header");
    if (toolbar && dynamicLeft) {
        const searchWrap = toolbar.querySelector(".toolbar-search-wrap, .liquid-search-wrap");
        const filterWrap = toolbar.querySelector(".filter-dropdown-wrap");

        // Na barra Liquid Glass: Pesquisa primeiro na esquerda, seguida pelo ícone de Filtro
        if (searchWrap) {
            dynamicLeft.appendChild(searchWrap);
        }
        if (filterWrap) {
            dynamicLeft.appendChild(filterWrap);
        }

        // Botões extras de ação na direita (ex: "+ Criar Cupão" em Vouchers ou "+ Novo Cliente" em Clientes)
        const controls = toolbar.querySelector(".page-toolbar-controls");
        if (controls && dynamicRight) {
            const extraButtons = Array.from(controls.children).filter(
                el => !el.classList.contains("toolbar-search-wrap") &&
                      !el.classList.contains("liquid-search-wrap") &&
                      !el.classList.contains("filter-dropdown-wrap")
            );
            if (extraButtons.length > 0) {
                extraButtons.forEach(btn => dynamicRight.appendChild(btn));
                if (defaultAction) defaultAction.style.display = "none";
            }
        }

        // Esconde a barra antiga da página pois já foi integrada na barra flutuante
        toolbar.style.display = "none";
    } else {
        // Nas outras páginas, esconde o H1 redundante do topo para não duplicar com a Bolha Liquid Glass
        const topH1 = document.querySelector("body > h1, .header-banner h1");
        if (topH1) {
            topH1.style.display = "none";
        }
        const pageHeader = document.querySelector(".page-header");
        if (pageHeader && paginaAtual === "gestao-tecidos.html") {
            const btnGold = pageHeader.querySelector("button");
            if (btnGold && dynamicRight) {
                btnGold.style.margin = "0";
                btnGold.style.height = "40px";
                btnGold.style.borderRadius = "12px";
                dynamicRight.appendChild(btnGold);
                if (defaultAction) defaultAction.style.display = "none";
            }
            pageHeader.style.display = "none";
        }
    }

    // 4. Fechar menu ao clicar fora ou pressionar Escape
    document.addEventListener("click", (e) => {
        const wrap = document.getElementById("liquid-menu-wrap");
        const menu = document.getElementById("liquid-context-menu");
        const btn = document.getElementById("btn-liquid-menu");
        if (menu && wrap && !wrap.contains(e.target)) {
            menu.classList.remove("aberto");
            if (btn) btn.classList.remove("aberto");
            document.querySelectorAll(".ctx-has-sub.sub-aberto").forEach(s => s.classList.remove("sub-aberto"));
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const menu = document.getElementById("liquid-context-menu");
            const btn = document.getElementById("btn-liquid-menu");
            if (menu) menu.classList.remove("aberto");
            if (btn) btn.classList.remove("aberto");
            document.querySelectorAll(".ctx-has-sub.sub-aberto").forEach(s => s.classList.remove("sub-aberto"));
        }
    });
}

// ==========================================
// CONTROLO DO CONTEXT MENU LIQUID GLASS
// ==========================================
window.toggleLiquidContextMenu = function(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById("liquid-context-menu");
    const btn = document.getElementById("btn-liquid-menu");
    if (!menu) return;
    const abrir = !menu.classList.contains("aberto");
    menu.classList.toggle("aberto", abrir);
    if (btn) btn.classList.toggle("aberto", abrir);
    if (!abrir) {
        document.querySelectorAll(".ctx-has-sub.sub-aberto").forEach(s => s.classList.remove("sub-aberto"));
    }
};

window.toggleLiquidSubmenu = function(e, el) {
    if (e) e.stopPropagation();
    if (!el) return;
    el.classList.toggle("sub-aberto");
};

// Compatibilidade caso alguma página chame fecharMenuMobile
window.toggleMenuMobile = window.toggleLiquidContextMenu;
window.fecharMenuMobile = function() {
    const menu = document.getElementById("liquid-context-menu");
    const btn = document.getElementById("btn-liquid-menu");
    if (menu) menu.classList.remove("aberto");
    if (btn) btn.classList.remove("aberto");
};

// ==========================================
// SISTEMA DE MODAIS PERSONALIZADOS MINIMALISTAS (PROMISE-BASED)
// ==========================================
function obterSvgModalGlobal(icone) {
    const ic = String(icone || "");
    if (ic.includes("❌") || ic === "error") {
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    }
    if (ic.includes("⚠") || ic.includes("❓") || ic === "alert") {
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    }
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
}

window.mostrarAviso = function(mensagem, titulo = "Aviso", icone = "check") {
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,15,15,.45);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation: fadeIn 0.18s ease-out;';
        overlay.innerHTML = `
          <div style="background:#fff;border-radius:14px;padding:28px 26px;max-width:380px;width:90%;box-shadow:0 20px 50px rgba(0,0,0,.18);border:1px solid #eae6df;text-align:center;animation: slideUp 0.2s ease-out;">
            <div style="width:44px;height:44px;border-radius:50%;background:#f5f3ef;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">${obterSvgModalGlobal(icone)}</div>
            <h3 style="margin:0 0 8px;font-size:1.08rem;font-family:'Inter',sans-serif;color:#1a1a1a;font-weight:600;">${titulo}</h3>
            <p style="color:#666;font-size:0.9rem;line-height:1.5;margin:0 0 22px 0;font-family:'Inter',sans-serif;">${mensagem}</p>
            <button id="btn-aviso-ok" style="width:100%;background:#1a1a1a;color:#fff;border:none;border-radius:8px;padding:11px;font-size:0.9rem;cursor:pointer;font-weight:500;margin:0;transition:background 0.15s;font-family:'Inter',sans-serif;">Entendido</button>
          </div>`;
        document.body.appendChild(overlay);
        
        const btn = overlay.querySelector('#btn-aviso-ok');
        btn.focus();
        btn.onclick = () => {
            document.body.removeChild(overlay);
            resolve();
        };
    });
};

window.mostrarConfirmacao = function(mensagem, titulo = "Confirmação", icone = "alert", textoOk = "Confirmar", textoCancelar = "Cancelar") {
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,15,15,.45);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation: fadeIn 0.18s ease-out;';
        overlay.innerHTML = `
          <div style="background:#fff;border-radius:14px;padding:28px 26px;max-width:380px;width:90%;box-shadow:0 20px 50px rgba(0,0,0,.18);border:1px solid #eae6df;text-align:center;animation: slideUp 0.2s ease-out;">
            <div style="width:44px;height:44px;border-radius:50%;background:#f5f3ef;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">${obterSvgModalGlobal(icone)}</div>
            <h3 style="margin:0 0 8px;font-size:1.08rem;font-family:'Inter',sans-serif;color:#1a1a1a;font-weight:600;">${titulo}</h3>
            <p style="color:#666;font-size:0.9rem;line-height:1.5;margin:0 0 22px 0;font-family:'Inter',sans-serif;">${mensagem}</p>
            <div style="display:flex;gap:10px;">
              <button id="btn-conf-cancel" style="flex:1;background:#fff;color:#555;border:1px solid #dcd6cc;border-radius:8px;padding:10px;font-size:0.88rem;font-weight:500;cursor:pointer;margin:0;font-family:'Inter',sans-serif;">${textoCancelar}</button>
              <button id="btn-conf-ok" style="flex:1;background:#1a1a1a;color:#fff;border:none;border-radius:8px;padding:10px;font-size:0.88rem;font-weight:500;cursor:pointer;margin:0;font-family:'Inter',sans-serif;">${textoOk}</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        
        const okBtn = overlay.querySelector('#btn-conf-ok');
        const cancelBtn = overlay.querySelector('#btn-conf-cancel');
        
        okBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };
        cancelBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };
    });
};
