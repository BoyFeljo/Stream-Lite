<?php
// CONFIG
$m3u_url = "http://fbld.link:80/get.php?username=17145909&password=49841687&type=m3u_plus&output=ts";

// Função para baixar via cURL
function fetchUrl($url, $timeout = 20) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $data = curl_exec($ch);
    $err = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$data, $status, $err];
}

// Função para parsear M3U apenas canais
function parse_m3u($m3u_content) {
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
            $current = ["name" => $name, "group" => $group];
        } elseif (filter_var($line, FILTER_VALIDATE_URL)) {
            if ($current === null) $current = ["name" => $line, "group" => "Desconhecido"];
            $current["url"] = $line;
            $channels[] = $current;
            $current = null;
        }
    }
    return $channels;
}

// Busca a M3U
list($content, $status, $err) = fetchUrl($m3u_url);

if ($content === false || strlen(trim($content)) === 0) {
    header('Content-Type: application/json');
    http_response_code(502);
    echo json_encode(["error" => "Falha ao carregar a lista M3U", "curl_error" => $err]);
    exit;
}

// Parser
$channels = parse_m3u($content);

// Retorna JSON direto
header('Content-Type: application/json');
echo json_encode($channels, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
