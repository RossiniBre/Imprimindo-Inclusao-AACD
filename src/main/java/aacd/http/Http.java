package aacd.http;

import aacd.model.Sessao;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/** Funções auxiliares para responder requisições. */
public final class Http {

    private Http() {}

    public static void enviar(HttpExchange ex, int status, String contentType, byte[] corpo) throws IOException {
        ex.getResponseHeaders().set("Content-Type", contentType);
        ex.sendResponseHeaders(status, corpo.length);
        try (var os = ex.getResponseBody()) {
            os.write(corpo);
        }
    }

    public static void json(HttpExchange ex, int status, String json) throws IOException {
        enviar(ex, status, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
    }

    public static String lerCookie(HttpExchange ex, String nome) {
        var linhas = ex.getRequestHeaders().get("Cookie");
        if (linhas == null) return null;
        for (String linha : linhas) {
            for (String par : linha.split(";")) {
                String[] kv = par.trim().split("=", 2);
                if (kv.length == 2 && kv[0].equals(nome) && !kv[1].isEmpty()) {
                    return kv[1];
                }
            }
        }
        return null;
    }

    public static Optional<Sessao> exigirPerfil(HttpExchange ex, GerenciadorSessoes sessoes, String... perfis)
            throws IOException {
        Optional<Sessao> sessao = sessoes.buscar(lerCookie(ex, "SESSAO"));

        if (sessao.isEmpty()) {
            json(ex, 401, "{\"erro\":\"Não autenticado.\"}");
            return Optional.empty();
        }

        String perfilAtual = sessao.get().getPerfil();
        for (String p : perfis) {
            if (p.equals(perfilAtual)) {
                return sessao;
            }
        }

        json(ex, 403, "{\"erro\":\"Acesso negado.\"}");
        return Optional.empty();
    }

    public static Map<String, String> lerFormulario(HttpExchange ex) throws IOException {
        String corpo = new String(ex.getRequestBody().readNBytes(4096), StandardCharsets.UTF_8);
        Map<String, String> campos = new HashMap<>();
        for (String par : corpo.split("&")) {
            String[] kv = par.split("=", 2);
            if (kv.length == 2) {
                campos.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8),
                        URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
            }
        }
        return campos;
    }

    public static int lerId(Map<String, String> campos, String campo, int padrao) {
        String valor = campos.get(campo);
        if (valor == null || valor.isBlank()) return padrao;
        try {
            return Integer.parseInt(valor.trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Id inválido!");
        }
    }
}