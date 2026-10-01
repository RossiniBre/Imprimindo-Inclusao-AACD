package aacd.http;

import aacd.model.Sessao;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.Optional;

public class MeHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;

    public MeHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "GET");
            Http.json(ex, 405, "{\"erro\":\"Método não permitido.\"}");
            return;
        }

        Optional<Sessao> sessao = sessoes.buscar(Http.lerCookie(ex, "SESSAO"));

        if (sessao.isEmpty()) {
            Http.json(ex, 401, "{\"erro\":\"Não autenticado.\"}");
            return;
        }

        Http.json(ex, 200, "{\"perfil\":\"" + sessao.get().getPerfil() + "\"}");
    }
}