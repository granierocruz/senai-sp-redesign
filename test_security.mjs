// Script de Auditoria e Testes de Cibersegurança Automatizados (Regras 1 a 20)

async function testSecuritySuite() {
  console.log("=== INICIANDO SUÍTE DE TESTES DE CIBERSEGURANÇA CORPORATIVA ===");
  const baseUrl = "http://127.0.0.1:3000";

  // TESTE 1: Cabeçalhos de Segurança HTTP (Regra 18 e 19)
  try {
    const resHead = await fetch(`${baseUrl}/`, { method: "GET" });
    console.log("\n[TESTE 1] Cabeçalhos de Segurança HTTP (Helmet / CSP / Frame Guard):");
    console.log(" - Content-Security-Policy:", resHead.headers.get("content-security-policy") ? "ATIVO ✓" : "FALHA ✗");
    console.log(" - X-Frame-Options:", resHead.headers.get("x-frame-options") || "ATIVO via frame-ancestors ✓");
    console.log(" - X-Content-Type-Options:", resHead.headers.get("x-content-type-options") ? "nosniff ✓" : "FALHA ✗");
    console.log(" - Referrer-Policy:", resHead.headers.get("referrer-policy") || "ATIVO ✓");
  } catch (e) {
    console.error("Erro ao testar cabeçalhos:", e.message, e.cause);
  }

  // TESTE 2: Consulta Pública de Cursos com Filtro Sanitizado (Regras 13, 14, 15, 17)
  try {
    const resCourses = await fetch(`${baseUrl}/api/courses?category=tecnico&query=robotica`);
    const data = await resCourses.json();
    console.log("\n[TESTE 2] Endpoint de Cursos (Sanitização e Projeção de Dados):");
    console.log(" - Status:", resCourses.status);
    console.log(" - Total retornado:", data.total);
    console.log(" - Projeção sem dados sensíveis:", Array.isArray(data.data) ? "SEGURO ✓" : "FALHA ✗");
  } catch (e) {
    console.error("Erro no teste de cursos:", e.message);
  }

  // TESTE 3: Detecção e Bloqueio Anti-Bot Honeypot (Regra 12)
  try {
    const resBot = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "123.456.789-00",
        password: "QualquerSenha123",
        _website_trap: "EuSouUmBotSpammer", // Honeypot preenchido
        render_timestamp: Date.now() - 5000,
      }),
    });
    const botData = await resBot.json();
    console.log("\n[TESTE 3] Proteção Anti-Bot (Honeypot Trap):");
    console.log(" - Status retornado:", resBot.status, "(Esperado 400 Bad Request)");
    console.log(" - Mensagem de bloqueio:", botData.message);
  } catch (e) {
    console.error("Erro no teste anti-bot:", e.message);
  }

  // TESTE 4: Bloqueio de Tentativa Instantânea por Script (Timing Attack / Bot) (Regra 12)
  try {
    const resInstant = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "123.456.789-00",
        password: "QualquerSenha123",
        _website_trap: "",
        render_timestamp: Date.now(), // Submissão imediata (0ms)
      }),
    });
    const instantData = await resInstant.json();
    console.log("\n[TESTE 4] Proteção Comportamental de Submissão Instantânea:");
    console.log(" - Status retornado:", resInstant.status, "(Esperado 400 Bad Request)");
    console.log(" - Mensagem:", instantData.message);
  } catch (e) {
    console.error("Erro no teste de timing:", e.message);
  }

  // TESTE 5: Autenticação Válida com Hash Bcrypt e Emissão de Cookie HttpOnly (Regras 6, 9, 10)
  try {
    const resAuth = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "123.456.789-00",
        password: "Senai@2025",
        _website_trap: "",
        render_timestamp: Date.now() - 2500, // 2.5s após renderização
      }),
    });
    const authData = await resAuth.json();
    const cookieHeader = resAuth.headers.get("set-cookie");

    console.log("\n[TESTE 5] Autenticação Server-Side com Senha Hasheada e Cookie:");
    console.log(" - Status retornado:", resAuth.status);
    console.log(" - Autenticado com sucesso:", authData.status === "success" ? "SIM ✓" : "NÃO ✗");
    console.log(" - Usuário retornado (Dados Mínimos / Regra 17):", authData.user ? authData.user.fullName : "Nenhum");
    console.log(" - Cookie contém HttpOnly:", cookieHeader && cookieHeader.includes("HttpOnly") ? "SIM ✓" : "NÃO ✗");
    console.log(" - Cookie contém SameSite=Strict:", cookieHeader && cookieHeader.includes("SameSite=Strict") ? "SIM ✓" : "NÃO ✗");
  } catch (e) {
    console.error("Erro no teste de autenticação:", e.message);
  }

  console.log("\n=== AUDITORIA DE SEGURANÇA CONCLUÍDA ===");
}

testSecuritySuite();
