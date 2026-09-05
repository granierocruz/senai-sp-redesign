import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Carrega variáveis de ambiente se disponíveis
dotenv.config();

const app = express();

// Fallback resiliente para ambiente Serverless (prevenção de crash de boot)
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "senai_sp_corporate_secure_session_secret_2025_prod_fallback";

// =========================================================================
// 1. CABEÇALHOS DE SEGURANÇA HTTP (Helmet)
// =========================================================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.tailwindcss.com", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(cookieParser(SESSION_SECRET));

// =========================================================================
// 2. RATE LIMITING
// =========================================================================
const loginAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Limite de tentativas de autenticação excedido. Bloqueado temporariamente.",
  },
});

function sanitizeInput(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

// =========================================================================
// 3. BASE DE ALUNOS COM BCRYPT HASH
// =========================================================================
const defaultHash = bcrypt.hashSync("Senai@2025", 10);

const mockStudentDb = [
  {
    id: "9f3c6e12-4a7b-4d8e-9f0a-1b2c3d4e5f6a",
    cpf: "123.456.789-00",
    registration_code: "20251010",
    full_name: "Aluno Demonstração SENAI-SP",
    email: "aluno.demo@sp.senai.br",
    password_hash: defaultHash,
    role: "student",
    is_active: true,
  },
];

const LoginSchema = z.object({
  identifier: z
    .string()
    .min(5)
    .max(20)
    .regex(/^[0-9.\-]+$/),
  password: z.string().min(8).max(64),
  _website_trap: z.string().max(0).optional(),
  render_timestamp: z.number().optional(),
});

const CourseSearchSchema = z.object({
  query: z.string().max(80).optional(),
  category: z.enum(["todos", "tecnico", "ti", "robotica", "energia", "livres"]).default("todos"),
});

// =========================================================================
// 4. ROTAS DE API
// =========================================================================

// Login
app.post("/api/auth/login", loginAuthLimiter, async (req, res) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: "error",
        message: "Dados de login inválidos ou inconsistentes.",
      });
    }

    const { identifier, password, _website_trap } = parseResult.data;

    if (_website_trap && _website_trap.length > 0) {
      return res.status(400).json({ status: "error", message: "Acesso bloqueado." });
    }

    const cleanId = sanitizeInput(identifier);
    const student = mockStudentDb.find(
      (u) => (u.cpf === cleanId || u.registration_code === cleanId) && u.is_active
    );

    if (!student) {
      return res.status(401).json({
        status: "error",
        message: "Credenciais de acesso incorretas.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, student.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Credenciais de acesso incorretas.",
      });
    }

    res.cookie("senai_session", "session_token_authenticated", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 3600 * 1000,
      path: "/",
    });

    return res.status(200).json({
      status: "success",
      message: "Autenticação realizada com sucesso.",
      user: {
        id: student.id,
        fullName: student.full_name,
        registrationCode: student.registration_code,
        role: student.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Falha interna ao processar autenticação.",
    });
  }
});

// Catálogo de Cursos
app.get("/api/courses", (req, res) => {
  const parseResult = CourseSearchSchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ status: "error", message: "Parâmetros inválidos." });
  }

  const { query, category } = parseResult.data;
  const coursesCatalog = [
    { id: "c-01", title: "Automação e Robótica Industrial", category: "robotica tecnico", workload: "1.200h", modality: "Presencial Prático" },
    { id: "c-02", title: "Desenvolvimento de Sistemas & IA", category: "ti tecnico", workload: "1.200h", modality: "Híbrido (Presencial + EaD)" },
    { id: "c-03", title: "Mecânica de Precisão & Mecatrônica", category: "robotica tecnico", workload: "1.500h", modality: "Oficinas Avançadas" },
    { id: "c-04", title: "Energias Renováveis & Eletromobilidade", category: "energia tecnico", workload: "1.200h", modality: "Laboratório Solar" },
    { id: "c-05", title: "Cibersegurança & Redes Industriais (OT)", category: "ti livres", workload: "240h", modality: "100% Online com Prática" },
    { id: "c-06", title: "Manufatura Aditiva & Prototipagem 3D", category: "livres robotica", workload: "160h", modality: "Prática em Laboratório" },
  ];

  let filtered = coursesCatalog;
  if (category && category !== "todos") {
    filtered = filtered.filter((c) => c.category.includes(category));
  }
  if (query) {
    const q = sanitizeInput(query).toLowerCase();
    filtered = filtered.filter((c) => c.title.toLowerCase().includes(q));
  }

  return res.json({ status: "success", total: filtered.length, data: filtered });
});

// Health check para Vercel
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
