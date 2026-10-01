package aacd.http;

import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;

public class LogoutHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;

    public LogoutHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.json(ex, 405, "{\"erro\":\"Método não permitido.\"}");
            return;
        }

        sessoes.destruir(Http.lerCookie(ex, "SESSAO"));

        ex.getResponseHeaders().add("Set-Cookie",
                "SESSAO=; Max-Age=0; HttpOnly; Path=/; SameSite=Strict");
        Http.json(ex, 200, "{\"ok\":true}");
    }
}