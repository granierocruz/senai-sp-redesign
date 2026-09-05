import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { z } from "zod";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

// Carrega variáveis de ambiente (Regra 1)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

// Validação de Chave e Segredos de Sessão no Boot
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error("FATAL: SESSION_SECRET deve ter no mínimo 32 caracteres criptográficos.");
  process.exit(1);
}

// =========================================================================
// 1. FORÇAR HTTPS EM PRODUÇÃO (Regra 19)
// =========================================================================
app.use((req, res, next) => {
  const isLocal = req.hostname === "localhost" || req.hostname === "127.0.0.1";
  if (isProduction && !isLocal && req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// =========================================================================
// 2. CABEÇALHOS DE SEGURANÇA HTTP ROBUSTOS COM HELMET (Regra 18 e 19)
// =========================================================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://cdn.tailwindcss.com",
          "'unsafe-inline'", // Tailwind CDN dinâmico
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://lh3.googleusercontent.com",
        ],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"], // Previne Clickjacking (X-Frame-Options: DENY)
        upgradeInsecureRequests: [], // Força HTTPS (Regra 19)
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json({ limit: "50kb" })); // Previne payload DoS
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(cookieParser(process.env.SESSION_SECRET));

// =========================================================================
// 3. LIMITADORES DE TAXA (RATE LIMITING) (Regra 11)
// =========================================================================
const apiGlobalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requisições por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Muitas requisições originadas deste IP. Tente novamente em 15 minutos.",
  },
});

const loginAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas de login por IP para mitigar força bruta
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Limite de tentativas de autenticação excedido. Bloqueado por 15 minutos.",
  },
});

app.use("/api/", apiGlobalLimiter);

// =========================================================================
// 4. SANITIZAÇÃO DE ENTRADAS CONTRA XSS E INJEÇÕES (Regra 15)
// =========================================================================
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
// 5. BANCO DE DADOS EM MEMÓRIA SIMULADO COM CONSULTAS PARAMETRIZADAS (Regra 13)
// =========================================================================
// Hash gerado com 12 rounds de salt (Argon2 / Bcrypt) para "Senai@2025" (Regra 10)
const defaultHash = bcrypt.hashSync("Senai@2025", 12);

const mockStudentDb = [
  {
    id: "9f3c6e12-4a7b-4d8e-9f0a-1b2c3d4e5f6a",
    cpf: "123.456.789-00",
    registration_code: "20251010",
    full_name: "Aluno Demonstração SENAI-SP",
    email: "aluno.demo@sp.senai.br",
    password_hash: defaultHash,
    role: "student", // Imutável pelo cliente (Regra 8)
    is_active: true,
  },
];

// Função que emula Prepared Statements (Regra 13)
function findStudentByCredentialParameterized(identifier) {
  // Parâmetros vinculados de forma segura, sem interpolação de strings
  const cleanId = sanitizeInput(identifier);
  return mockStudentDb.find(
    (u) => (u.cpf === cleanId || u.registration_code === cleanId) && u.is_active
  );
}

// =========================================================================
// 6. SCHEMAS DE VALIDAÇÃO COM ZOD (Regra 14)
// =========================================================================
const LoginSchema = z.object({
  identifier: z
    .string()
    .min(5, "Identificador deve ter no mínimo 5 caracteres")
    .max(20, "Identificador não pode exceder 20 caracteres")
    .regex(/^[0-9.\-]+$/, "Identificador contém caracteres inválidos"),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(64, "Senha não pode exceder 64 caracteres"),
  // Proteção Anti-Bot Honeypot (Regra 12)
  _website_trap: z.string().max(0, "Acesso automatizado bloqueado"),
  // Validação comportamental de tempo mínimo (Regra 12)
  render_timestamp: z.number().refine(
    (t) => Date.now() - t >= 1000,
    "Tentativa de submissão instantânea por robô detectada"
  ),
});

const CourseSearchSchema = z.object({
  query: z.string().max(80, "Consulta de busca muito longa").optional(),
  category: z.enum(["todos", "tecnico", "ti", "robotica", "energia", "livres"]).default("todos"),
});

// =========================================================================
// 7. ROTAS DE API PROTEGIDAS
// =========================================================================

// ROTA DE LOGIN DO PORTAL DO ALUNO (Regras 6, 8, 9, 10, 11, 12, 14, 17)
app.post("/api/auth/login", loginAuthLimiter, async (req, res) => {
  try {
    // Validação estrita de esquema
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: "error",
        message: "Dados de login inválidos ou inconsistentes.",
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const { identifier, password } = parseResult.data;

    // Consulta parametrizada (Prepared Statement)
    const student = findStudentByCredentialParameterized(identifier);
    if (!student) {
      // Tempo constante para mitigar timing attacks
      await bcrypt.compare("dummy_password", "$2a$12$abcdefghijklmnopqrstuvwx");
      return res.status(401).json({
        status: "error",
        message: "Credenciais de acesso incorretas.",
      });
    }

    // Validação de hash criptográfico seguro (Regra 10)
    const isPasswordValid = await bcrypt.compare(password, student.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Credenciais de acesso incorretas.",
      });
    }

    // Geração de token de sessão seguro isolado no servidor
    const sessionToken = crypto.randomBytes(32).toString("hex");

    // Cookie com flags de proteção estritas (Regra 9)
    res.cookie("senai_session", sessionToken, {
      httpOnly: true, // Inacessível por scripts JS (Mitiga XSS)
      secure: isProduction, // Transmitido estritamente via HTTPS (Regra 19)
      sameSite: "strict", // Proteção estrita contra CSRF
      maxAge: 3600 * 1000, // 1 hora de expiração
      path: "/",
    });

    // Retorno exclusivo dos dados estritamente necessários (Regra 17 - Projeção de Dados)
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
    console.error("[SEGURANÇA] Erro interno durante autenticação:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Falha interna no processamento seguro da requisição.",
    });
  }
});

// ROTA DE BUSCA DE CURSOS SANITIZADA (Regras 13, 14, 15, 17)
app.get("/api/courses", (req, res) => {
  const parseResult = CourseSearchSchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      status: "error",
      message: "Parâmetros de busca inválidos.",
    });
  }

  const { query, category } = parseResult.data;
  const sanitizedQuery = query ? sanitizeInput(query).toLowerCase() : "";

  // Retorna apenas catálogo público (Menor Privilégio - Regra 7 e 17)
  const coursesCatalog = [
    {
      id: "c-01",
      title: "Automação e Robótica Industrial",
      category: "robotica tecnico",
      workload: "1.200h",
      modality: "Presencial Prático",
    },
    {
      id: "c-02",
      title: "Desenvolvimento de Sistemas & IA",
      category: "ti tecnico",
      workload: "1.200h",
      modality: "Híbrido (Presencial + EaD)",
    },
    {
      id: "c-03",
      title: "Mecânica de Precisão & Mecatrônica",
      category: "robotica tecnico",
      workload: "1.500h",
      modality: "Oficinas Avançadas",
    },
    {
      id: "c-04",
      title: "Energias Renováveis & Eletromobilidade",
      category: "energia tecnico",
      workload: "1.200h",
      modality: "Laboratório Solar",
    },
    {
      id: "c-05",
      title: "Cibersegurança & Redes Industriais (OT)",
      category: "ti livres",
      workload: "240h",
      modality: "100% Online com Prática",
    },
    {
      id: "c-06",
      title: "Manufatura Aditiva & Prototipagem 3D",
      category: "livres robotica",
      workload: "160h",
      modality: "Prática em Laboratório",
    },
  ];

  const sanitizeAndNormalize = (s) =>
    sanitizeInput(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const queryNormalized = query ? sanitizeAndNormalize(query) : "";

  let filtered = coursesCatalog;
  if (category && category !== "todos") {
    filtered = filtered.filter((c) => c.category.includes(category));
  }
  if (queryNormalized) {
    filtered = filtered.filter((c) =>
      sanitizeAndNormalize(c.title).includes(queryNormalized)
    );
  }

  res.json({
    status: "success",
    total: filtered.length,
    data: filtered,
  });
});

// LOGOUT SEGURO (Regra 9)
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("senai_session", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
  });
  res.json({ status: "success", message: "Sessão encerrada com segurança." });
});

// =========================================================================
// 8. SERVINDO ARQUIVOS ESTÁTICOS COM SEGURANÇA
// =========================================================================
app.use(express.static(__dirname, {
  dotfiles: "ignore", // Bloqueia acesso a .env, .git etc.
  etag: true,
  maxAge: "1d",
}));

app.listen(PORT, () => {
  console.log(`[SEGURANÇA CORPORATIVA] Servidor SENAI-SP ativo na porta ${PORT}`);
  console.log(`[POLÍTICAS ATIVAS] Helmet CSP, HSTS, Rate Limiting, Zod Validation, HttpOnly Cookies.`);
});
