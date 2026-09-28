package br.aacd.http;

import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

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
}