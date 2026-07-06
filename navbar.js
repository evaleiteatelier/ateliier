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

    // 3. SEGURANÇA — ocultar itens conforme o tipo de utilizador
    const tipoUsuario = localStorage.getItem("tipoUsuario");
    if (tipoUsuario === "cliente") {
        document.querySelectorAll(".admin-only-group").forEach(g => g.style.display = "none");
    } else if (tipoUsuario === "basico") {
        // Acesso sem senha: esconde apenas Dashboard e Contas
        document.querySelectorAll(".full-admin-only").forEach(g => g.style.display = "none");
    }
}

// 4. FUNÇÃO DE SAIR
function sair() {
    localStorage.removeItem("tipoUsuario");
    localStorage.removeItem("adminToken");
    window.location.href = "index.html";
}

// ==========================================
// SISTEMA DE MODAIS PERSONALIZADOS DILIGENTES (PROMISE-BASED)
// ==========================================
window.mostrarAviso = function(mensagem, titulo = "Aviso", icone = "✨") {
    // Garante que os estilos de animação existem
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation: fadeIn 0.2s ease-out;';
        overlay.innerHTML = `
          <div style="background:#fff;border-radius:14px;padding:28px 30px;max-width:380px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,.25);text-align:center;animation: slideUp 0.3s ease-out;">
            <div style="font-size:2.8rem;margin-bottom:12px;">${icone}</div>
            <h3 style="margin:0 0 10px;font-size:1.2rem;font-family:'Inter',sans-serif;color:#1a1a2e;font-weight:700;">${titulo}</h3>
            <p style="color:#555;font-size:0.95rem;line-height:1.5;margin:0 0 24px 0;font-family:'Inter',sans-serif;">${mensagem}</p>
            <button id="btn-aviso-ok" style="width:100%;background:#000;color:#fff;border:none;border-radius:8px;padding:12px;font-size:1rem;cursor:pointer;font-weight:bold;margin:0;transition:background 0.2s;font-family:'Inter',sans-serif;">OK</button>
          </div>`;
        document.body.appendChild(overlay);
        
        const btn = overlay.querySelector('#btn-aviso-ok');
        btn.focus();
        btn.onclick = () => {
            document.body.removeChild(overlay);
            resolve();
        };
        btn.onmouseover = () => { btn.style.background = '#bba68a'; btn.style.color = '#000'; };
        btn.onmouseout = () => { btn.style.background = '#000'; btn.style.color = '#fff'; };
    });
};

window.mostrarConfirmacao = function(mensagem, titulo = "Confirmação", icone = "❓", textoOk = "Confirmar", textoCancelar = "Cancelar") {
    // Garante que os estilos de animação existem
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation: fadeIn 0.2s ease-out;';
        overlay.innerHTML = `
          <div style="background:#fff;border-radius:14px;padding:28px 30px;max-width:380px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,.25);text-align:center;animation: slideUp 0.3s ease-out;">
            <div style="font-size:2.8rem;margin-bottom:12px;">${icone}</div>
            <h3 style="margin:0 0 10px;font-size:1.2rem;font-family:'Inter',sans-serif;color:#1a1a2e;font-weight:700;">${titulo}</h3>
            <p style="color:#555;font-size:0.95rem;line-height:1.5;margin:0 0 24px 0;font-family:'Inter',sans-serif;">${mensagem}</p>
            <div style="display:flex;gap:10px;">
              <button id="btn-conf-ok" style="flex:1;background:#000;color:#fff;border:none;border-radius:8px;padding:12px;font-size:1rem;cursor:pointer;font-weight:bold;margin:0;font-family:'Inter',sans-serif;">${textoOk}</button>
              <button id="btn-conf-cancel" style="flex:1;background:#f5f5f5;color:#555;border:1px solid #ddd;border-radius:8px;padding:12px;font-size:1rem;cursor:pointer;margin:0;font-family:'Inter',sans-serif;">${textoCancelar}</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        
        const okBtn = overlay.querySelector('#btn-conf-ok');
        const cancelBtn = overlay.querySelector('#btn-conf-cancel');
        
        okBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };
        okBtn.onmouseover = () => { okBtn.style.background = '#bba68a'; okBtn.style.color = '#000'; };
        okBtn.onmouseout = () => { okBtn.style.background = '#000'; okBtn.style.color = '#fff'; };

        cancelBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };
    });
};
