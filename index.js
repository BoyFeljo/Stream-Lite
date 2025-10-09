import fetch from "node-fetch";

// URL da lista M3U
const m3u_url = "http://fbld.link:80/get.php?username=17145909&password=49841687&type=m3u_plus&output=ts";

// Função para parsear M3U apenas canais
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

      const nameMatch = line.match(/tvg-name="([^"]*)"/i);
      if (nameMatch) name = nameMatch[1];

      const groupMatch = line.match(/group-title="([^"]*)"/i);
      if (groupMatch) group = groupMatch[1];

      if (!name) {
        const parts = line.split(",", 2);
        name = parts[1] ? parts[1].trim() : "Sem nome";
      }

      current = { name, group };
    } else if (line.startsWith("http")) {
      // Filtra apenas URLs de canais (.m3u8 ou .ts)
      if (line.match(/\.(m3u8|ts)$/i)) {
        if (!current) current = { name: line, group: "Desconhecido" };
        current.url = line;
        channels.push(current);
        current = null;
      }
    }
  }

  // Remove duplicados
  const seen = new Set();
  const clean = [];
  for (const c of channels) {
    if (!c.url) continue;
    const key = c.url;
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(c);
  }

  return clean;
}

// Função principal
export default async function handler(req, res) {
  try {
    const response = await fetch(m3u_url, { timeout: 20000 });
    const text = await response.text();

    if (!text || (!text.includes("#EXTM3U") && !text.includes("#EXTINF"))) {
      return res.status(502).json({ error: "Conteúdo não parece M3U" });
    }

    const channels = parseM3UChannels(text);

    // Retorna JSON apenas canais
    res.status(200).json(channels);
  } catch (err) {
    res.status(502).json({ error: "Falha ao carregar a lista M3U", details: err.message });
  }
  }
