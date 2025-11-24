document.addEventListener("DOMContentLoaded", () => {
  // Se estivermos na página de login (index.html), não carrega o menu
  if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
      return; 
  }

  // Cria o elemento Header para conter o menu
  const header = document.createElement("header");
  header.style.marginBottom = "20px";
  header.style.borderBottom = "1px solid #ccc";
  header.style.paddingBottom = "10px";

  header.innerHTML = `
    <nav style="display: flex; gap: 15px; align-items: center; justify-content: space-between;">
      <div id="menu-links">
        <a href="lista-espera.html">Lista de Espera</a>
        <a href="concluidos.html">Pedidos Concluídos</a>
        
        <span class="admin-only" style="display:inline;">
           | <a href="adicionar-pedido.html"><strong>+ Novo Pedido</strong></a>
           | <a href="entregues.html">Histórico (Entregues)</a>
        </span>
      </div>

      <div>
        <button id="btn-logout" style="background: #f44336; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-size: 0.8rem;">
          Sair 🚪
        </button>
      </div>
    </nav>
  `;

  // Insere o menu no topo do corpo da página
  document.body.insertBefore(header, document.body.firstChild);

  // Lógica de Segurança (Admin vs Cliente)
  const tipoUsuario = localStorage.getItem("tipoUsuario");

  if (tipoUsuario === "cliente") {
    // Esconde tudo que tem a classe .admin-only
    const adminElements = document.querySelectorAll(".admin-only");
    adminElements.forEach(el => el.style.display = "none");
  }

  // Lógica do botão SAIR
  document.getElementById("btn-logout").addEventListener("click", () => {
    // 1. Limpa a "sessão"
    localStorage.removeItem("tipoUsuario");
    // 2. Redireciona para o login
    window.location.href = "index.html";
  });
});
