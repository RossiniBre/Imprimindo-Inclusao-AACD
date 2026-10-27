package aacd.http;

import aacd.service.RedefinicaoSenhaService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

public class EsqueciSenhaHandler implements HttpHandler {

    private final RedefinicaoSenhaService redefinicao;

    public EsqueciSenhaHandler(RedefinicaoSenhaService redefinicao) {
        this.redefinicao = redefinicao;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Map<String, String>> formulario = Http.lerFormulario(ex);
        if (formulario.isEmpty()) {
            return;
        }

        redefinicao.solicitar(formulario.get().get("email"));
        Http.json(ex, 200, Json.objeto()
                .campo("mensagem", "Se o e-mail estiver cadastrado, você receberá um código em instantes.")
                .build());
    }
}