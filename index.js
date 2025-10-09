// index.js

// URL da sua M3U
const m3u_url = "http://fbld.link:80/get.php?username=17145909&password=49841687&type=m3u_plus&output=ts";

// Cache em memória
let cache = { timestamp: 0, data: null };
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Função para parsear canais de TV com capas
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

      current = { name, group };
      if (logo) current.logo = logo;
    } else if (line.startsWith("http")) {
      if (!current) current = { name: line, group: "Desconhecido" };
      current.url = line;

      // Ignora filmes, séries, anime, cinema
      const lowerName = current.name.toLowerCase();
      const lowerGroup = current.group.toLowerCase();
      const ignoreKeywords = ["movie", "filme", "serie", "series", "anime", "cinema"];
      const isMovieOrSeries = ignoreKeywords.some(k => lowerName.includes(k) || lowerGroup.includes(k));

      if (!isMovieOrSeries) {
        channels.push(current);
      }

      current = null;
    }
  }

  // Remove duplicados
  const seen = new Set();
  const clean = [];
  for (const c of channels) {
    if (!c.url) continue;
    if (seen.has(c.url)) continue;
    seen.add(c.url);
    clean.push(c);
  }

  // Prioriza canais de Sport/Futebol
  const sportKeywords = ["futebol", "sport", "soccer", "football"];
  const sportChannels = clean.filter(c =>
    sportKeywords.some(k => c.name.toLowerCase().includes(k) || c.group.toLowerCase().includes(k))
  );
  const otherChannels = clean.filter(c => !sportChannels.includes(c));

  // Junta canais de Sport primeiro e depois o resto
  const finalList = sportChannels.concat(otherChannels);

  return finalList;
}

// Função principal para Vercel
export default async function handler(req, res) {
  try {
    const now = Date.now();

    // Retorna cache se ainda válido
    if (cache.data && now - cache.timestamp < CACHE_TTL) {
      return res.status(200).json(cache.data);
    }

    // Busca a M3U
    const response = await fetch(m3u_url);
    const text = await response.text();

    if (!text || (!text.includes("#EXTM3U") && !text.includes("#EXTINF"))) {
      return res.status(502).json({ error: "Conteúdo não parece M3U" });
    }

    const channels = parseM3UChannels(text);

    // Atualiza cache
    cache.data = channels;
    cache.timestamp = now;

    // Retorna JSON
    res.status(200).json(channels);
  } catch (err) {
    res.status(502).json({ error: "Falha ao carregar a lista M3U", details: err.message });
  }
    }
