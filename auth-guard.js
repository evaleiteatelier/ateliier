// Esconde a página imediatamente para evitar flash de conteúdo não autorizado
document.documentElement.style.visibility = 'hidden';

(function () {
  const SUPABASE_URL = "https://cixjmwfkfmeedajpmzmp.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeGptd2ZrZm1lZWRhanBtem1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzM5ODIsImV4cCI6MjA2OTEwOTk4Mn0.vFvgRMK_oabG19FNauNaBu_CoQTL8QRSXcptyfY6rbM";

  try {
    if (!window.supabaseClient && window.supabase && typeof window.supabase.createClient === 'function') {
      window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    const token = localStorage.getItem('adminToken');
    const tipoUsuario = localStorage.getItem('tipoUsuario');
    const expira = localStorage.getItem('sessaoExpira');

    // Verificar se a sessão expirou
    if (expira && Date.now() >= Number(expira)) {
      localStorage.removeItem('tipoUsuario');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminNome');
      localStorage.removeItem('adminId');
      localStorage.removeItem('sessaoExpira');
      window.location.href = 'index.html';
      return;
    }

    // Se for modo básico antigo sem adminToken mas com tipoUsuario='basico', corrige automaticamente
    if (!token && tipoUsuario === 'basico') {
      localStorage.setItem('adminToken', 'equipa@atelier.local');
      localStorage.setItem('sessaoExpira', String(Date.now() + 24 * 60 * 60 * 1000));
    }

    const hasToken = !!localStorage.getItem('adminToken');

    if (!hasToken) {
      window.location.href = 'index.html';
      return;
    }

    // Restrição de páginas exclusivas de Admin Completo (não permitidas para 'basico' ou 'cliente')
    const paginaAtual = window.location.pathname.split('/').pop() || '';
    const paginasRestritasBasico = ['dashboard.html', 'contas.html'];
    if ((tipoUsuario === 'basico' || tipoUsuario === 'cliente') && paginasRestritasBasico.includes(paginaAtual)) {
      window.location.href = 'lista-espera.html';
      return;
    }

    document.documentElement.style.visibility = '';
  } catch (e) {
    console.error('auth-guard erro:', e);
    document.documentElement.style.visibility = '';
  }
})();
