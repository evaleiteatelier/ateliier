document.addEventListener("DOMContentLoaded", () => {
  const nav = document.createElement("nav");
  nav.innerHTML = `
    <nav>
      <a href="index.html">Adicionar Pedido</a> |
      <a href="lista-espera.html">Lista de Espera</a> |
      <a href="concluidos.html">Pedidos Concluídos</a> |
      <a href="entregues.html">Pedidos Entregues</a>
    </nav>
    <hr>
  `;
  document.body.insertBefore(nav, document.body.firstChild);
});
