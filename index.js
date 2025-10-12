// index.js

const m3u_url = "http://carabina.pro/get.php?username=patricialittle&password=home123&type=m3u_plus";

let cache = { timestamp: 0, data: null };
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Função para parsear apenas canais
function parseM3UChannels(m3uContent) {
  const lines = m3uContent.split(/\r?\n/);
  const channels = [];
  let current = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF:")) {
      let name = null;
      let group = "Desconhecido";
      let logo = null;

      const nameMatch = line.match(/tvg-name="([^"]*)"/i);
      if (nameMatch) name = nameMatch[1];

      const groupMatch = line.match(/group-title="([^"]*)"/i);
      if (groupMatch) group = groupMatch[1];

      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      if (logoMatch) logo = logoMatch[1];

      if (!name) {
        const parts = line.split(",", 2);
        name = parts[1] ? parts[1].trim() : "Sem nome";
      }

      current = { name, group, logo: logo || null };
    } else if (line.startsWith("http")) {
      if (!current) current = { name: line, group: "Desconhecido", logo: null };
      current.url = line;

      // Ignora links de vídeo direto (filmes/episódios)
      if (!current.url.match(/\.(mp4|mkv|avi|mov|flv|webm)$/i)) {
        channels.push(current);
      }

      current = null;
    }
  }

  // Remove duplicados
  const seen = new Set();
  return channels.filter(c => {
    if (!c.url) return false;
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

// Função principal para Vercel
export default async function handler(req, res) {
  try {
    const now = Date.now();

    if (cache.data && now - cache.timestamp < CACHE_TTL) {
      return res.status(200).json(cache.data);
    }

    const response = await fetch(m3u_url);
    const text = await response.text();

    if (!text || (!text.includes("#EXTM3U") && !text.includes("#EXTINF"))) {
      return res.status(502).json({ error: "Conteúdo não parece M3U" });
    }

    const channels = parseM3UChannels(text);

    cache.data = channels;
    cache.timestamp = now;

    res.status(200).json(channels);
  } catch (err) {
    res.status(502).json({ error: "Falha ao carregar a lista M3U", details: err.message });
  }
                 }
