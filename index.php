<?php
// CONFIG
$m3u_url = "http://fbld.link:80/get.php?username=17145909&password=49841687&type=m3u_plus&output=ts";
$cache_file = __DIR__ . "/canais.json";
$cache_ttl = 3600; // segundos — 3600 = 1 hora (muda conforme quiseres)
$curl_timeout = 20;

// Função para baixar via cURL (mais confiável que file_get_contents)
function fetchUrl($url, $timeout = 20) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    // Cabeçalhos comuns pra "enganar" bloqueios simples
    curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language: en-US,en;q=0.5"
    ]);
    // Em hosts mal configurados podes desativar verificação SSL (usar só se necessário)
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $data = curl_exec($ch);
    $err = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$data, $status, $err];
}

// Função para parsear M3U (EXTINF) em array
function parse_m3u($m3u_content) {
    $lines = preg_split("/\r\n|\n|\r/", $m3u_content);
    $channels = [];
    $current = null;

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === "") continue;

        if (stripos($line, "#EXTINF:") === 0) {
            // tenta pegar tvg-name, group-title ou título depois da vírgula
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
            if ($current === null) {
                // Sem EXTINF antes (lista simples) - cria com nome a partir da url
                $current = [
                    "name" => $line,
                    "group" => "Desconhecido"
                ];
            }
            $current["url"] = $line;

            // Opcional: validar se URL termina em .m3u8, .ts, .mp4, etc — aqui aceitamos tudo
            $channels[] = $current;
            $current = null;
        } else {
            // linha não é URL nem EXTINF — ignora
        }
    }

    return $channels;
}

// Serve cache se ainda válido
if (file_exists($cache_file) && (time() - filemtime($cache_file) < $cache_ttl)) {
    header('Content-Type: application/json');
    echo file_get_contents($cache_file);
    exit;
}

// Tenta buscar
list($content, $status, $err) = fetchUrl($m3u_url, $GLOBALS['curl_timeout']);

if ($content === false || $content === null || strlen(trim($content)) === 0) {
    // Erro ou timeout
    header('Content-Type: application/json');
    http_response_code(502);
    echo json_encode(["error" => "Falha ao carregar a lista M3U", "http_code" => $status, "curl_error" => $err]);
    exit;
}

// Verifica se parece M3U
if (stripos($content, '#EXTM3U') === false && stripos($content, '#EXTINF') === false) {
    // Possivelmente o servidor retornou HTML de erro / login required
    header('Content-Type: application/json');
    http_response_code(502);
    echo json_encode(["error" => "Conteúdo retornado não parece M3U. Pode ser página de login ou erro.", "http_code" => $status]);
    exit;
}

// Parser
$channels = parse_m3u($content);

// Opcional: remove duplicados e canais sem URL válida
$seen = [];
$clean = [];
foreach ($channels as $c) {
    if (!isset($c['url'])) continue;
    $key = md5($c['url']);
    if (isset($seen[$key])) continue;
    $seen[$key] = true;
    $clean[] = $c;
}

// Salva cache
file_put_contents($cache_file, json_encode($clean, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));

// Retorna JSON
header('Content-Type: application/json');
echo json_encode($clean, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);