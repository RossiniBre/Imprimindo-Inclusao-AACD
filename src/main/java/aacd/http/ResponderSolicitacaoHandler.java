package aacd.http;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;

import com.mongodb.MongoException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import aacd.dao.UsuarioDao;
import aacd.model.Sessao;
import aacd.model.Usuario;
import aacd.service.GerenciadorSessoes;
import aacd.service.ResponderSolicitacao;

public class ResponderSolicitacaoHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final UsuarioDao usuarioDao = new UsuarioDao();
    private final ResponderSolicitacao responder = new ResponderSolicitacao();

    public ResponderSolicitacaoHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "EMPRESA");
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
            int solicitacaoId = Http.lerId(campos, "id", 0);
            String decisao = campos.get("decisao");

            if ("ACEITAR".equals(decisao)) {
                responder.aceitar(ator, solicitacaoId, campos.get("prazo"));
                Http.json(ex, 200, Json.objeto().campo("mensagem", "Solicitação aceita.").build());
            } else if ("RECUSAR".equals(decisao)) {
                responder.recusar(ator, solicitacaoId, campos.get("justificativa"));
                Http.json(ex, 200, Json.objeto().campo("mensagem", "Solicitação recusada.").build());
            } else {
                Http.erro(ex, 400, "Decisão inválida.");
            }

        } catch (IllegalStateException e) {
            Http.erro(ex, 409, e.getMessage());
        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (SQLException | MongoException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }
}