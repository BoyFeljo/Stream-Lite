<?php
// URL da lista M3U
$m3u_url = "http://fbld.link:80/get.php?username=17145909&password=49841687&type=m3u_plus&output=ts";

// Função para baixar via cURL
function fetchUrl($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0");
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $data = curl_exec($ch);
    curl_close($ch);
    return $data;
}

// Função para parsear M3U apenas canais
function parse_m3u_channels($m3u_content) {
    $lines = preg_split("/\r\n|\n|\r/", $m3u_content);
    $channels = [];
    $current = null;

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === "") continue;

        if (stripos($line, "#EXTINF:") === 0) {
            $name = null;
            $group = "Desconhecido";
            if (preg_match('/tvg-name="([^"]*)"/i', $line, $m)) $name = $m[1];
            if (preg_match('/group-title="([^"]*)"/i', $line, $m)) $group = $m[1];
            if (!$name) {
                $parts = explode(",", $line, 2);
                $name = isset($parts[1]) ? trim($parts[1]) : "Sem nome";
            }
            $current = [
                "name" => $name,
                "group" => $group
            ];
        } elseif (filter_var($line, FILTER_VALIDATE_URL)) {
            // Filtra apenas URLs de canais (m3u8 ou ts)
            if (preg_match("/\.(m3u8|ts)$/i", $line)) {
                if ($current === null) {
                    $current = ["name" => $line, "group" => "Desconhecido"];
                }
                $current["url"] = $line;
                $channels[] = $current;
                $current = null;
            }
        }
    }

    return $channels;
}

// Baixa lista M3U
$content = fetchUrl($m3u_url);
if (!$content) {
    header('Content-Type: application/json');
    echo json_encode(["error" => "Falha ao carregar a lista M3U"]);
    exit;
}

// Parse apenas canais
$channels = parse_m3u_channels($content);

// Remove duplicados
$seen = [];
$clean = [];
foreach ($channels as $c) {
    if (!isset($c['url'])) continue;
    $key = md5($c['url']);
    if (isset($seen[$key])) continue;
    $seen[$key] = true;
    $clean[] = $c;
}

// Retorna JSON apenas canais
header('Content-Type: application/json');
echo json_encode($clean, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
