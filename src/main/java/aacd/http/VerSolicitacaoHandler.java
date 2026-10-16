package aacd.http;

import aacd.dao.SolicitacaoDao;
import aacd.dao.SolicitacaoEventosDao;
import aacd.model.Solicitacao;
import aacd.service.GerenciadorSessoes;
import com.google.gson.Gson;
import com.mongodb.MongoException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import org.bson.Document;

import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class VerSolicitacaoHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final SolicitacaoDao solicitacaoDao = new SolicitacaoDao();
    private final SolicitacaoEventosDao eventosDao = new SolicitacaoEventosDao();
    private final Gson gson = new Gson();

    public VerSolicitacaoHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "GET");
            Http.json(ex, 405, "{\"erro\":\"Método não permitido.\"}");
            return;
        }

        if (Http.exigirPerfil(ex, sessoes, "ADMIN", "FUNCIONARIO").isEmpty()) return;

        try {
            int id = Http.lerId(Http.lerQuery(ex), "id", 0);
            Solicitacao s = solicitacaoDao.buscarPorId(id);
            if (s == null) {
                Http.json(ex, 404, "{\"erro\":\"Solicitação não encontrada.\"}");
                return;
            }

            Map<String, Object> corpo = new LinkedHashMap<>();
            corpo.put("id", s.getId());
            corpo.put("titulo", s.getTitulo());
            corpo.put("status", s.getStatus().name());
            if (s.getJustificativa() != null) corpo.put("justificativa", s.getJustificativa());

            Document extras = eventosDao.buscar(id); // null se ainda não houve evento
            if (extras != null) {
                if (extras.getString("prazoEstimado") != null) {
                    corpo.put("prazoEstimado", extras.getString("prazoEstimado"));
                }
                corpo.put("historico", historico(extras));
            }

            Http.json(ex, 200, gson.toJson(corpo));

        } catch (IllegalArgumentException e) {
            Http.json(ex, 400, "{\"erro\":\"" + e.getMessage() + "\"}");
        } catch (SQLException | MongoException e) {
            Http.json(ex, 500, "{\"erro\":\"Erro interno.\"}");
        }
    }

    private List<Map<String, Object>> historico(Document extras) {
        List<Map<String, Object>> lista = new ArrayList<>();
        for (Document e : extras.getList("historico", Document.class)) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("de", e.getString("statusAnterior"));
            item.put("para", e.getString("statusNovo"));
            item.put("observacao", e.getString("observacao"));
            item.put("data", e.getDate("data").toInstant().toString());
            lista.add(item);
        }
        return lista;
    }
}