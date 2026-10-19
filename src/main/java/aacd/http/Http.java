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
            erro(ex, 401, "Não autenticado.");
            return Optional.empty();
        }

        String perfilAtual = sessao.get().getPerfil();
        for (String p : perfis) {
            if (p.equals(perfilAtual)) {
                return sessao;
            }
        }

        erro(ex, 403, "Acesso negado.");
        return Optional.empty();
    }

    private static final int FORMULARIO_MAX = 4096;

    public static Optional<Map<String, String>> lerFormulario(HttpExchange ex) throws IOException {
        byte[] bytes = ex.getRequestBody().readNBytes(FORMULARIO_MAX + 1);
        if (bytes.length > FORMULARIO_MAX) {
            erro(ex, 413, "Corpo da requisição maior que o limite.");
            return Optional.empty();
        }

        String corpo = new String(bytes, StandardCharsets.UTF_8);
        Map<String, String> campos = new HashMap<>();

        try {
            for (String par : corpo.split("&")) {
                String[] kv = par.split("=", 2);
                if (kv.length == 2) {
                    campos.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8),
                            URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
                }
            }
        } catch (IllegalArgumentException e) {
            erro(ex, 400, "Formulário malformado.");
            return Optional.empty();
        }

        return Optional.of(campos);
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

    public static Map<String, String> lerQuery(HttpExchange ex) {
        Map<String, String> campos = new HashMap<>();
        String query = ex.getRequestURI().getRawQuery();
        if (query == null || query.isBlank()) return campos;

        try {
            for (String par : query.split("&")) {
                String[] kv = par.split("=", 2);
                if (kv.length == 2) {
                    campos.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8),
                            URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
                }
            }
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Parâmetros inválidos.");
        }
        return campos;
    }

    public static void erro(HttpExchange ex, int status, String mensagem) throws IOException {
        json(ex, status, Json.objeto().campo("erro", mensagem != null ? mensagem : "Erro.").build());
    }
}