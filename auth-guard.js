// Esconde a página imediatamente para evitar flash de conteúdo não autorizado
document.documentElement.style.visibility = 'hidden';

(async function () {
  const SUPABASE_URL = "https://cixjmwfkfmeedajpmzmp.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeGptd2ZrZm1lZWRhanBtem1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzM5ODIsImV4cCI6MjA2OTEwOTk4Mn0.vFvgRMK_oabG19FNauNaBu_CoQTL8QRSXcptyfY6rbM";

  try {
    if (!window.supabaseClient && window.supabase) {
      window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    const db = window.supabaseClient;
    if (!db) {
      // Supabase não carregou — mostra a página sem bloquear (fallback)
      document.documentElement.style.visibility = '';
      return;
    }

    const hasToken = !!localStorage.getItem('adminToken');

    if (!hasToken) {
      window.location.href = 'index.html';
    } else {
      document.documentElement.style.visibility = '';
    }
  } catch (e) {
    console.error('auth-guard erro:', e);
    document.documentElement.style.visibility = '';
  }
})();
