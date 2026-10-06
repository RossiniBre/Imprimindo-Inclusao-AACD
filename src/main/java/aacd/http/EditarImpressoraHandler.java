package aacd.http;

import aacd.dao.UsuarioDao;
import aacd.model.Sessao;
import aacd.model.Usuario;
import aacd.service.EditarImpressora;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;

public class EditarImpressoraHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final UsuarioDao usuarioDao = new UsuarioDao();
    private final EditarImpressora editarImpressora = new EditarImpressora();

    public EditarImpressoraHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.json(ex, 405, "{\"erro\":\"Método não permitido.\"}");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "ADMIN", "EMPRESA");
        if (sessao.isEmpty()) return;

        Map<String, String> campos = Http.lerFormulario(ex);

        try {
            Usuario ator = usuarioDao.buscarPorId(sessao.get().getUsuarioId());
            int impressoraId = Http.lerId(campos, "id", 0);

            editarImpressora.executar(ator, impressoraId, campos.get("modelo"));
            Http.json(ex, 200, "{\"mensagem\":\"Impressora atualizada.\"}");

        } catch (IllegalStateException e) {
            Http.json(ex, 409, "{\"erro\":\"" + e.getMessage() + "\"}");
        } catch (IllegalArgumentException e) {
            Http.json(ex, 400, "{\"erro\":\"" + e.getMessage() + "\"}");
        } catch (SQLException e) {
            Http.json(ex, 500, "{\"erro\":\"Erro interno.\"}");
        }
    }
}