package aacd.http;

import aacd.dao.SolicitacaoDao;
import aacd.dao.SolicitacaoEventosDao;
import aacd.model.Solicitacao;
import aacd.service.GerenciadorSessoes;
import com.mongodb.MongoException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import org.bson.Document;

import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class VerSolicitacaoHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final SolicitacaoDao solicitacaoDao = new SolicitacaoDao();
    private final SolicitacaoEventosDao eventosDao = new SolicitacaoEventosDao();

    public VerSolicitacaoHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "GET");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        if (Http.exigirPerfil(ex, sessoes, "ADMIN", "FUNCIONARIO").isEmpty()) return;

        try {
            int id = Http.lerId(Http.lerQuery(ex), "id", 0);
            Solicitacao s = solicitacaoDao.buscarPorId(id);
            if (s == null) {
                Http.erro(ex, 404, "Solicitação não encontrada.");
                return;
            }

            Json.Objeto corpo = Json.objeto()
                    .campo("id", s.getId())
                    .campo("titulo", s.getTitulo())
                    .campo("status", s.getStatus().name());
            if (s.getJustificativa() != null) {
                corpo.campo("justificativa", s.getJustificativa());
            }

            Document extras = eventosDao.buscar(id); // null se ainda não houve evento
            if (extras != null) {
                if (extras.getString("prazoEstimado") != null) {
                    corpo.campo("prazoEstimado", extras.getString("prazoEstimado"));
                }
                corpo.campoJson("historico", historico(extras));
            }

            Http.json(ex, 200, corpo.build());

        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (SQLException | MongoException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }

    private String historico(Document extras) {
        List<String> itens = new ArrayList<>();
        for (Document e : extras.getList("historico", Document.class, List.of())) {
            Date data = e.getDate("data");
            itens.add(Json.objeto()
                    .campo("de", e.getString("statusAnterior"))
                    .campo("para", e.getString("statusNovo"))
                    .campo("observacao", e.getString("observacao"))
                    .campo("data", data == null ? null : data.toInstant().toString())
                    .build());
        }
        return Json.lista(itens);
    }
}