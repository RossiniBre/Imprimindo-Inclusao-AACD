package aacd.http;

import aacd.dao.UsuarioDao;
import aacd.model.Sessao;
import aacd.model.Usuario;
import aacd.service.CadastrarImpressora;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;

public class ImpressoraHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final UsuarioDao usuarioDao;
    private final CadastrarImpressora cadastro;

    public ImpressoraHandler(GerenciadorSessoes sessoes, UsuarioDao usuarioDao,
                             CadastrarImpressora cadastro) {
        this.sessoes = sessoes;
        this.usuarioDao = usuarioDao;
        this.cadastro = cadastro;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.json(ex, 405, "{\"erro\":\"Método não permitido.\"}");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "EMPRESA");
        if (sessao.isEmpty()) {
            return;
        }

        Map<String, String> campos = Http.lerFormulario(ex);

        try {
            Usuario ator = usuarioDao.buscarPorId(sessao.get().getUsuarioId());
            if (ator == null) {
                Http.json(ex, 401, "{\"erro\":\"Não autenticado.\"}");
                return;
            }

            int id = cadastro.executar(ator, campos.get("modelo"));
            Http.json(ex, 201, "{\"id\":" + id + "}");

        } catch (IllegalStateException e) {
            Http.json(ex, 403, "{\"erro\":\"" + e.getMessage() + "\"}");
        } catch (IllegalArgumentException e) {
            Http.json(ex, 400, "{\"erro\":\"" + e.getMessage() + "\"}");
        } catch (SQLException e) {
            Http.json(ex, 500, "{\"erro\":\"Erro interno.\"}");
        }
    }
}