document.addEventListener("DOMContentLoaded", () => {
  const nav = document.createElement("nav");
  nav.innerHTML = `
    <nav>
      <a href="adicionar-pedido.html" class="admin-only">Adicionar Pedido</a> |
      <a href="lista-espera.html">Lista de Espera</a> |
      <a href="concluidos.html">Pedidos Concluídos</a> |
      <a href="entregues.html" class="admin-only">Pedidos Entregues</a>
    </nav>
    <hr>
  `;
  document.body.insertBefore(nav, document.body.firstChild);

  // Esconde links de admin para cliente
  if (localStorage.getItem("tipoUsuario") === "cliente") {
    const adminElements = document.querySelectorAll(".admin-only");
    adminElements.forEach(el => el.style.display = "none");
  }
});
