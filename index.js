// /api/filmes.js — Versão Vercel ⚡ by Boy Feljo 🇲🇿

// ✅ Link da tua lista M3U
const M3U_URL = "http://sigcine1.space:80/get.php?username=526311976&password=177652875&type=m3u_plus";

// Cache em memória (reset a cada nova instância)
let cache = { timestamp: 0, data: null };
const CACHE_TTL = 15 * 60 * 60 * 1000; // ⏱️ 15 horas

// --- Função para ler e converter M3U em objetos ---
function parseM3UToFilms(m3uContent) {
  const lines = m3uContent.split(/\r?\n/);
  const filmes = [];

  let name = "", group = "Desconhecido", logo = "", url = "";

  for (let line of lines) {
    if (line.startsWith("#EXTINF:")) {
      name = line.match(/tvg-name="([^"]*)"/i)?.[1] ||
             line.split(",")[1]?.trim() || "Sem título";
      group = line.match(/group-title="([^"]*)"/i)?.[1] || "Desconhecido";
      logo = line.match(/tvg-logo="([^"]*)"/i)?.[1] || "";
    } else if (line.startsWith("http")) {
      url = line.trim();

      // 🎬 Filtra somente filmes — evitando streams ao vivo
      if (
        /(filme|movie|cinema|film)/i.test(group) ||
        /(filme|movie|cinema|film)/i.test(name)
      ) {
        // Extrai ano (ex: 2023) do título, se existir
        const ano = name.match(/(19|20)\d{2}/)?.[0] || null;

        filmes.push({
          nome: name,
          grupo: group,
          logo,
          url,
          ano: ano ? parseInt(ano) : null,
        });
      }
    }
  }

  // Remove duplicados por URL
  const seen = new Set();
  const unicos = filmes.filter(f => {
    if (seen.has(f.url)) return false;
    seen.add(f.url);
    return true;
  });

  // Ordena por ano (mais recentes primeiro)
  unicos.sort((a, b) => (b.ano || 0) - (a.ano || 0));

  return unicos;
}

// --- Função principal do handler Vercel ---
export default async function handler(req, res) {
  try {
    const now = Date.now();

    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(204).end();

    // ⚡ Cache válido?
    if (cache.data && now - cache.timestamp < CACHE_TTL) {
      console.log("✅ Cache ativo (filmes)");
      return res.status(200).json(cache.data);
    }

    console.log("⏳ Atualizando cache de filmes...");
    const response = await fetch(M3U_URL, { cache: "no-store" });
    const text = await response.text();

    if (!text.includes("#EXTM3U")) {
      return res.status(502).json({ error: "Lista M3U inválida" });
    }

    // 🧩 Processar lista e armazenar no cache
    const filmes = parseM3UToFilms(text);
    cache = { timestamp: now, data: filmes };

    res.status(200).json(filmes);
  } catch (err) {
    res.status(502).json({
      error: "Falha ao carregar lista de filmes",
      detalhes: err.message,
    });
  }
          }
