// index.js — versão turbo por Boy Feljo 🚀

import fs from "fs";
import path from "path";

const m3u_url = "http://asdns.lol/get.php?username=0118689&password=3451067&type=m3u_plus&output=ts";

// Caminho do cache local
const CACHE_FILE = path.resolve("./cache.json");
const CACHE_TTL = 3 * 24 * 60 * 60 * 1000; // 3 dias

// Função para carregar cache salvo
function loadCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    if (Date.now() - data.timestamp > CACHE_TTL) return null; // expirado
    return data.channels;
  } catch {
    return null;
  }
}

// Função para salvar cache em arquivo
function saveCache(channels) {
  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify({ timestamp: Date.now(), channels }, null, 2)
  );
}

// Função de parsing super rápida ⚡
function parseM3UChannels(m3uContent) {
  const lines = m3uContent.split(/\r?\n/);
  const channels = [];
  let name = "", group = "Desconhecido", logo = "", url = "";

  for (let line of lines) {
    if (line.startsWith("#EXTINF:")) {
      name = line.match(/tvg-name="([^"]*)"/i)?.[1] || line.split(",")[1]?.trim() || "Sem nome";
      group = line.match(/group-title="([^"]*)"/i)?.[1] || "Desconhecido";
      logo = line.match(/tvg-logo="([^"]*)"/i)?.[1] || "";
    } else if (line.startsWith("http")) {
      url = line.trim();
      if (!url.match(/\.(mp4|mkv|avi|mov|flv|webm)$/i)) {
        channels.push({ name, group, logo, url });
      }
    }
  }

  // Remove duplicados
  const seen = new Set();
  return channels.filter(c => {
    if (!c.url || seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

// 🔥 Função principal — Vercel Handler
export default async function handler(req, res) {
  try {
    const now = Date.now();

    // CORS liberado
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(204).end();

    const q = req.query.q ? req.query.q.toLowerCase() : null;

    // 📂 Tenta carregar cache local
    let channels = loadCache();
    if (channels) {
      console.log("✅ Usando cache salvo localmente!");
      const filtered = q
        ? channels.filter(c => c.name.toLowerCase().includes(q))
        : channels;
      return res.status(200).json(filtered);
    }

    // 🔄 Se não houver cache, busca online
    console.log("⏳ Buscando nova lista M3U...");
    const response = await fetch(m3u_url, { cache: "no-store" });
    const text = await response.text();

    if (!text.includes("#EXTM3U")) {
      return res.status(502).json({ error: "Lista M3U inválida" });
    }

    channels = parseM3UChannels(text);
    saveCache(channels); // 💾 Salva no cache

    const filtered = q
      ? channels.filter(c => c.name.toLowerCase().includes(q))
      : channels;

    res.status(200).json(filtered);
  } catch (err) {
    res.status(502).json({
      error: "Falha ao carregar lista M3U",
      details: err.message,
    });
  }
        }
