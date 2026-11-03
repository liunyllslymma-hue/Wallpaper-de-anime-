const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data", "wallpapers.json");
const UPLOAD_DIR = path.join(ROOT, "uploads");

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ADMIN_USER || !ADMIN_PASSWORD || !SESSION_SECRET) {
  console.error("Configure ADMIN_USER, ADMIN_PASSWORD e SESSION_SECRET no arquivo .env.");
  process.exit(1);
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use(session({
  name: "wallpaper.sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8
  }
}));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomBytes(16).toString("hex") + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Formato não permitido. Use JPG, PNG, WEBP ou GIF."), allowed.includes(file.mimetype));
  }
});

function readWallpapers() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return []; }
}
function writeWallpapers(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Faça login como administrador." });
}

app.get("/api/wallpapers", (req, res) => {
  const items = readWallpapers().sort((a, b) => b.createdAt - a.createdAt);
  res.json(items);
});
app.get("/api/session", (req, res) => res.json({ isAdmin: !!(req.session && req.session.isAdmin) }));
app.post("/api/login", loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const safeEqual = (a, b) => {
    const aa = Buffer.from(String(a || ""));
    const bb = Buffer.from(String(b || ""));
    return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
  };
  if (safeEqual(username, ADMIN_USER) && safeEqual(password, ADMIN_PASSWORD)) {
    req.session.regenerate(err => {
      if (err) return res.status(500).json({ error: "Não foi possível iniciar a sessão." });
      req.session.isAdmin = true;
      res.json({ ok: true });
    });
  } else {
    res.status(401).json({ error: "Usuário ou senha incorretos." });
  }
});
app.post("/api/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.clearCookie("wallpaper.sid").json({ ok: true }));
});
app.post("/api/wallpapers", requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Selecione uma imagem." });
  const { title, anime, description } = req.body || {};
  if (!title || !anime) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Preencha o título e o anime." });
  }
  const item = {
    id: crypto.randomUUID(),
    title: String(title).trim().slice(0, 90),
    anime: String(anime).trim().slice(0, 60),
    description: String(description || "").trim().slice(0, 300),
    image: "/uploads/" + req.file.filename,
    createdAt: Date.now()
  };
  const items = readWallpapers();
  items.push(item);
  writeWallpapers(items);
  res.status(201).json(item);
});
app.delete("/api/wallpapers/:id", requireAdmin, (req, res) => {
  const items = readWallpapers();
  const item = items.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Wallpaper não encontrado." });
  const filename = path.basename(item.image);
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  writeWallpapers(items.filter(x => x.id !== req.params.id));
  res.json({ ok: true });
});

app.use("/uploads", express.static(UPLOAD_DIR, { fallthrough: false, maxAge: "7d" }));
app.use(express.static(path.join(ROOT, "public")));
app.get("*", (_req, res) => res.sendFile(path.join(ROOT, "public", "index.html")));

app.use((err, _req, res, _next) => {
  const message = err.code === "LIMIT_FILE_SIZE" ? "A imagem deve ter no máximo 20 MB." : err.message || "Erro inesperado.";
  res.status(400).json({ error: message });
});

app.listen(PORT, () => console.log(`Wallpaper de Anime rodando em http://localhost:${PORT}`));
