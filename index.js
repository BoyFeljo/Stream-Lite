// index.js — versão otimizada por Boy Feljo 💥

const m3u_url = "http://asdns.lol/get.php?username=0118689&password=3451067&type=m3u_plus&output=ts";

// Cache global (mantém por 3 dias)
let cache = { timestamp: 0, data: null };
const CACHE_TTL = 3 * 24 * 60 * 60 * 1000; // 3 dias

// Função de parsing super rápida
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
      // Ignora arquivos de filmes diretos
      if (!url.match(/\.(mp4|mkv|avi|mov|flv|webm)$/i)) {
        channels.push({ name, group, logo, url });
      }
    }
  }

  // Remove duplicados rapidamente
  const seen = new Set();
  return channels.filter(c => {
    if (!c.url || seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

// Função principal — Vercel Handler
export default async function handler(req, res) {
  try {
    const now = Date.now();

    // Parâmetro de busca
    const q = req.query.q ? req.query.q.toLowerCase() : null;

    // Usa cache se ainda válido
    if (cache.data && now - cache.timestamp < CACHE_TTL) {
      const filtered = q
        ? cache.data.filter(c => c.name.toLowerCase().includes(q))
        : cache.data;
      return res.status(200).json(filtered);
    }

    // Faz fetch do servidor M3U
    const response = await fetch(m3u_url, { cache: "no-store" });
    const text = await response.text();

    if (!text.includes("#EXTM3U")) {
      return res.status(502).json({ error: "Lista M3U inválida" });
    }

    const channels = parseM3UChannels(text);

    // Atualiza cache
    cache = { timestamp: now, data: channels };

    const filtered = q
      ? channels.filter(c => c.name.toLowerCase().includes(q))
      : channels;

    res.status(200).json(filtered);
  } catch (err) {
    res.status(502).json({
      error: "Falha ao carregar lista M3U",
      details: err.message
    });
  }
}
