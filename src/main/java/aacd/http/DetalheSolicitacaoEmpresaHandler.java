package aacd.http;

import aacd.config.ConnectionFactory;
import aacd.dao.*;
import aacd.model.Impressora;
import aacd.model.Sessao;
import aacd.model.SolicitacaoImpressao;
import aacd.service.GerenciadorSessoes;
import aacd.service.SolicitacaoDaEmpresa;
import com.mongodb.MongoException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import org.bson.Document;

import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;

public class DetalheSolicitacaoEmpresaHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final ConteudoSolicitacaoDao conteudoDao;
    private final SolicitacaoDaEmpresa daEmpresa = new SolicitacaoDaEmpresa();
    private final SolicitacaoEventosDao eventosDao = new SolicitacaoEventosDao();
    private final ImpressoraDao impressoraDao = new ImpressoraDao();

    public DetalheSolicitacaoEmpresaHandler(GerenciadorSessoes sessoes, ConteudoSolicitacaoDao conteudoDao) {
        this.sessoes = sessoes;
        this.conteudoDao = conteudoDao;
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

    private String impressoraJson(Impressora i) {
        return Json.objeto()
                .campo("modelo", i.getModelo())
                .campo("comprimentoMm", i.getComprimentoMm())
                .campo("larguraMm", i.getLarguraMm())
                .campo("alturaMm", i.getAlturaMm())
                .build();
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "GET");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }
        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "EMPRESA");
        if (sessao.isEmpty()) return;

        try {
            int id = Http.lerId(Http.lerQuery(ex), "id", 0);
            Optional<SolicitacaoImpressao> achada = daEmpresa.buscar(sessao.get().getUsuarioId(), id);
            if (achada.isEmpty()) {
                Http.erro(ex, 404, "Solicitação não encontrada.");
                return;
            }
            SolicitacaoImpressao s = achada.get();

            Json.Objeto corpo = Json.objeto()
                    .campo("id", s.getSolicitacaoId())
                    .campo("titulo", s.getTitulo())
                    .campo("status", s.getStatus().name());
            if (s.getJustificativa() != null) corpo.campo("justificativa", s.getJustificativa());

            conteudoDao.buscarPorId(s.getMongoId()).ifPresent(c -> corpo
                    .campo("descricao", c.getDescricao())
                    .campo("quantidade", c.getQuantidade())
                    .campo("nomeArquivo", c.getNomeArquivo()));

            Integer impressoraId = s.getImpressoraId();
            if (impressoraId != null && impressoraId > 0) {
                try (Connection conn = ConnectionFactory.getConnection()) {
                    Impressora impressora = impressoraDao.buscarPorId(conn, impressoraId);
                    if (impressora != null) {
                        corpo.campoJson("impressora", impressoraJson(impressora));
                    }
                }
            }

            Document extras = eventosDao.buscar(id);
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
}