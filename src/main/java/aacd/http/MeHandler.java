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
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Sessao> sessao = sessoes.buscar(Http.lerCookie(ex, "SESSAO"));

        if (sessao.isEmpty()) {
            Http.erro(ex, 401, "Não autenticado.");
            return;
        }

        Http.json(ex, 200, Json.objeto().campo("perfil", sessao.get().getPerfil()).build());
    }
}