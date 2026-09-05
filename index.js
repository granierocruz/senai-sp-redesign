import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import app from "./api/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carrega o HTML do SENAI-SP em memória para entrega garantida em Serverless
const htmlPath = path.join(__dirname, "index.html");
let htmlContent = "";
if (fs.existsSync(htmlPath)) {
  htmlContent = fs.readFileSync(htmlPath, "utf8");
}

// Serve arquivos estáticos
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, "public")));

// Rota raiz garantida
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (htmlContent) {
    return res.send(htmlContent);
  }
  res.sendFile(htmlPath);
});

// Fallback SPA
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (htmlContent) {
    return res.send(htmlContent);
  }
  res.sendFile(htmlPath);
});

export default app;
