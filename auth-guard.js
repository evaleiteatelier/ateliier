// Acesso direto ativo para a equipa do Atelier (sem bloqueio de login/sessão)
(function () {
  const SUPABASE_URL = "https://cixjmwfkfmeedajpmzmp.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeGptd2ZrZm1lZWRhanBtem1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzM5ODIsImV4cCI6MjA2OTEwOTk4Mn0.vFvgRMK_oabG19FNauNaBu_CoQTL8QRSXcptyfY6rbM";

  try {
    if (!window.supabaseClient && window.supabase && typeof window.supabase.createClient === 'function') {
      window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    // Garante que todas as páginas reconhecem permissões totais de administração
    localStorage.setItem('tipoUsuario', 'maximo');
    localStorage.setItem('adminToken', 'evaleiteatelier@gmail.com');
    localStorage.setItem('adminNome', 'Eva Leite Atelier');
    localStorage.removeItem('sessaoExpira');

    document.documentElement.style.visibility = '';
  } catch (e) {
    console.error('Erro ao inicializar contexto:', e);
    document.documentElement.style.visibility = '';
  }
})();
