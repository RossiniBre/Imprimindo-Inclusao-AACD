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
            Http.json(ex, 405, "{\"erro\":\"Método não permitido.\"}");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "EMPRESA");
        if (sessao.isEmpty()) return;

        Map<String, String> campos = Http.lerFormulario(ex);

        try {
            Usuario ator = usuarioDao.buscarPorId(sessao.get().getUsuarioId());
            int solicitacaoId = Http.lerId(campos, "id", 0);
            String decisao = campos.get("decisao");

            if ("ACEITAR".equals(decisao)) {
                responder.aceitar(ator, solicitacaoId, campos.get("prazo"));
                Http.json(ex, 200, "{\"mensagem\":\"Solicitação aceita.\"}");
            } else if ("RECUSAR".equals(decisao)) {
                responder.recusar(ator, solicitacaoId, campos.get("justificativa"));
                Http.json(ex, 200, "{\"mensagem\":\"Solicitação recusada.\"}");
            } else {
                Http.json(ex, 400, "{\"erro\":\"Decisão inválida.\"}");
            }

        } catch (IllegalStateException e) {
            Http.json(ex, 409, "{\"erro\":\"" + e.getMessage() + "\"}");
        } catch (IllegalArgumentException e) {
            Http.json(ex, 400, "{\"erro\":\"" + e.getMessage() + "\"}");
        } catch (SQLException | MongoException e) {
            Http.json(ex, 500, "{\"erro\":\"Erro interno.\"}");
        }
    }
}