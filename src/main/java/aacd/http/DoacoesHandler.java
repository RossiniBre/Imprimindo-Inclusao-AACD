package aacd.http;

import aacd.dao.DoacaoDao;
import aacd.model.DoacaoResumo;
import aacd.model.Sessao;
import aacd.service.ManifestarDoacao;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class DoacoesHandler implements HttpHandler {

    private static final int FORMULARIO_MAX = 16384;

    private final GerenciadorSessoes sessoes;
    private final ManifestarDoacao manifestarDoacao = new ManifestarDoacao();
    private final DoacaoDao doacaoDao = new DoacaoDao();

    public DoacoesHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        switch (ex.getRequestMethod()) {
            case "POST": criar(ex); break;
            case "GET":  listar(ex); break;
            default:
                ex.getResponseHeaders().set("Allow", "GET, POST");
                Http.erro(ex, 405, "Método não permitido.");
        }
    }

    private void criar(HttpExchange ex) throws IOException {
        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "EMPRESA");
        if (sessao.isEmpty()) return;

        Optional<Map<String, String>> campos = Http.lerFormulario(ex, FORMULARIO_MAX);
        if (campos.isEmpty()) return;

        try {
            int id = manifestarDoacao.executar(
                    sessao.get().getUsuarioId(),
                    campos.get().get("tipo"),
                    campos.get().get("descricao"),
                    campos.get().get("quantidade"));
            Http.json(ex, 201, Json.objeto().campo("id", id).build());

        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (IllegalStateException e) {
            Http.erro(ex, 404, e.getMessage());
        } catch (SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }

    private void listar(HttpExchange ex) throws IOException {
        if (Http.exigirPerfil(ex, sessoes, "ADMIN", "FUNCIONARIO").isEmpty()) return;

        try {
            List<String> itens = new ArrayList<>();
            for (DoacaoResumo d : doacaoDao.listar()) {
                String empresa = Json.objeto()
                        .campo("id", d.getEmpresaId())
                        .campo("nome", d.getEmpresaNome())
                        .campo("email", d.getEmail())
                        .campo("telefone", d.getTelefone())
                        .build();

                itens.add(Json.objeto()
                        .campo("id", d.getId())
                        .campo("tipo", d.getTipo())
                        .campo("descricao", d.getDescricao())
                        .campo("quantidade", d.getQuantidade())
                        .campo("dataManifestacao", d.getDataManifestacao() == null ? null : d.getDataManifestacao().toString())
                        .campo("visualizada", d.isVisualizada())
                        .campoJson("empresa", empresa)
                        .build());
            }
            Http.json(ex, 200, Json.lista(itens));

        } catch (SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }
}