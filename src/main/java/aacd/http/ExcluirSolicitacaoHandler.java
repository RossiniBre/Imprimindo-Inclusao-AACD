package aacd.http;

import aacd.dao.UsuarioDao;
import aacd.model.Sessao;
import aacd.model.Usuario;
import aacd.service.ExcluirSolicitacao;
import aacd.service.GerenciadorSessoes;
import aacd.storage.ArmazenamentoException;
import com.mongodb.MongoException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;

public class ExcluirSolicitacaoHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final ExcluirSolicitacao excluir;
    private final UsuarioDao usuarioDao = new UsuarioDao();

    public ExcluirSolicitacaoHandler(GerenciadorSessoes sessoes, ExcluirSolicitacao excluir) {
        this.sessoes = sessoes;
        this.excluir = excluir;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "ADMIN", "FUNCIONARIO");
        if (sessao.isEmpty()) return;

        Optional<Map<String, String>> formulario = Http.lerFormulario(ex);
        if (formulario.isEmpty()) return;
        Map<String, String> campos = formulario.get();

        try {
            Usuario ator = usuarioDao.buscarPorId(sessao.get().getUsuarioId());
            if (ator == null) {
                Http.erro(ex, 401, "Não autenticado.");
                return;
            }
            int id = Http.lerId(campos, "id", 0);
            excluir.excluir(ator, id);
            Http.json(ex, 200, Json.objeto().campo("mensagem", "Solicitação apagada.").build());

        } catch (SecurityException e) {
            Http.erro(ex, 403, e.getMessage());
        } catch (IllegalStateException e) {
            Http.erro(ex, 409, e.getMessage());
        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (SQLException | MongoException | ArmazenamentoException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }
}