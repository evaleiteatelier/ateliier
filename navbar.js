document.addEventListener("DOMContentLoaded", () => {
    // Não carrega na página de login
    if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
        return;
    }

    // 1. CARREGA O ARQUIVO HTML DA BARRA
    fetch('barra-superior.html')
        .then(response => response.text())
        .then(data => {
            // Insere o HTML e o CSS no topo do site
            document.body.insertAdjacentHTML('afterbegin', data);
            
            // Depois de inserir, roda a lógica
            configurarBarra();
        })
        .catch(err => console.error("Erro ao carregar a barra:", err));
});

function configurarBarra() {
    // 2. LÓGICA DE LINK ATIVO (Destacar página atual)
    const paginaAtual = window.location.pathname.split("/").pop(); // Pega "lista-espera.html"
    const links = document.querySelectorAll(".nav-links a");
    
    links.forEach(link => {
        if (link.dataset.page === paginaAtual) {
            link.classList.add("active-link");
        }
    });

    // 3. SEGURANÇA (Esconder menu Admin se for Cliente)
    const tipoUsuario = localStorage.getItem("tipoUsuario");
    if (tipoUsuario === "cliente") {
        const adminGroups = document.querySelectorAll(".admin-only-group");
        adminGroups.forEach(grupo => grupo.style.display = "none");
    }
}

// 4. FUNÇÃO DE SAIR
function sair() {
    localStorage.removeItem("tipoUsuario");
    window.location.href = "index.html";
}
