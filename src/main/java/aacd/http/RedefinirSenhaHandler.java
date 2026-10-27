package aacd.http;

import aacd.service.RedefinicaoSenhaService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;

public class RedefinirSenhaHandler implements HttpHandler {

    private final RedefinicaoSenhaService redefinicao;

    public RedefinirSenhaHandler(RedefinicaoSenhaService redefinicao) {
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
        Map<String, String> campos = formulario.get();

        try {
            redefinicao.redefinir(campos.get("email"), campos.get("codigo"), campos.get("novaSenha"));
            Http.json(ex, 200, Json.objeto().campo("mensagem", "Senha redefinida com sucesso.").build());
        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }
}