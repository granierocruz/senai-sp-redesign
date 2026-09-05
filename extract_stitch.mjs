import { stitch } from "@google/stitch-sdk";
import fs from "fs";

/**
 * Script utilitário para consumo seguro do Google Stitch SDK.
 * A chave de API é obtida estritamente de variáveis de ambiente do servidor,
 * prevenindo qualquer exposição de segredos em código-fonte ou cliente.
 */

// Validação estrita da chave em runtime
const apiKey = process.env.STITCH_API_KEY;

if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
  console.error("FATAL: Variável de ambiente STITCH_API_KEY não está configurada no servidor.");
  process.exit(1);
}

async function main() {
  try {
    console.log("[SEGURANÇA] Inicializando conexão autenticada com Google Stitch...");
    const projects = await stitch.projects();
    console.log(`[INFO] Projetos autorizados encontrados: ${projects.length}`);

    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      console.log(`\n=== PROJETO #${i + 1}: ID = ${p.id}, Título = ${p.title || p.name || "SENAI-SP"} ===`);

      try {
        const screens = await p.screens();
        console.log(`[INFO] Telas disponíveis no projeto: ${screens.length}`);

        for (let j = 0; j < screens.length; j++) {
          const s = screens[j];
          console.log(`--- Tela #${j + 1}: ID = ${s.id} ---`);

          try {
            const html = await s.getHtml();
            if (html) {
              const outPath = `screen_${i}_${j}_${s.id}.html`;
              fs.writeFileSync(outPath, html, "utf8");
              console.log(`[SUCESSO] Layout sincronizado em: ${outPath}`);
            }
          } catch (htmlErr) {
            console.error(`[ERRO] Falha ao extrair HTML da tela ${s.id}:`, htmlErr.message);
          }
        }
      } catch (screenErr) {
        console.error(`[ERRO] Falha ao listar telas do projeto ${p.id}:`, screenErr.message);
      }
    }
  } catch (err) {
    console.error("[FATAL] Erro de autenticação ou comunicação com o Stitch:", err.message);
  }
}

main();
