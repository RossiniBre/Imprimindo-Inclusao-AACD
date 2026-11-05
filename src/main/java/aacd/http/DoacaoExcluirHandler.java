package aacd.http;

import aacd.dao.DoacaoDao;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;

public class DoacaoExcluirHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final DoacaoDao doacaoDao = new DoacaoDao();

    public DoacaoExcluirHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        if (Http.exigirPerfil(ex, sessoes, "ADMIN", "FUNCIONARIO").isEmpty()) return;

        Optional<Map<String, String>> formulario = Http.lerFormulario(ex);
        if (formulario.isEmpty()) return;

        int id;
        try {
            id = Integer.parseInt(formulario.get().get("id").trim());
        } catch (NumberFormatException | NullPointerException e) {
            Http.erro(ex, 400, "Id da doação inválido.");
            return;
        }

        try {
            if (doacaoDao.excluir(id)) {
                Http.json(ex, 200, Json.objeto().campo("mensagem", "Doação excluída.").build());
            } else {
                Http.erro(ex, 404, "Doação não encontrada.");
            }
        } catch (SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }
}