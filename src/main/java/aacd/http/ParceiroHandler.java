package aacd.http;

import aacd.dao.EmpresaDao;
import aacd.dao.ImpressoraDao;
import aacd.model.EmpresaResumo;
import aacd.model.Endereco;
import aacd.model.Impressora;
import aacd.model.Sessao;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class ParceiroHandler implements HttpHandler {

    private static final String BASE = "/api/parceiros";

    private final GerenciadorSessoes sessoes;
    private final EmpresaDao empresaDao = new EmpresaDao();
    private final ImpressoraDao impressoraDao = new ImpressoraDao();

    public ParceiroHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "GET");
            Http.json(ex, 405, Json.objeto().campo("Rota não encontrada.", "Método não permitido.").build());
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "FUNCIONARIO", "ADMIN");
        if (sessao.isEmpty()) {
            return;
        }

        String resto = ex.getRequestURI().getPath().substring(BASE.length());

        try {
            if (resto.isEmpty() || resto.equals("/")) {
                listarParceiros(ex);
            } else if (resto.matches("/\\d+/impressoras")) {
                listarImpressoras(ex, Integer.parseInt(resto.split("/")[1]));
            } else {
                Http.json(ex, 404, Json.objeto().campo("erro", "Rota não encontrada.").build());
            }
        } catch (SQLException e) {
            Http.json(ex, 500, Json.objeto().campo("Rota não encontrada.", "Erro interno.").build());
        }
    }

    private void listarParceiros(HttpExchange ex) throws IOException, SQLException {
        List<String> itens = new ArrayList<>();
        for (EmpresaResumo e : empresaDao.listarAtivas()) {
            Endereco end = e.endereco();
            String endereco = Json.objeto()
                    .campo("cep", end.getCep())
                    .campo("rua", end.getRua())
                    .campo("numero", end.getNumero())
                    .campo("bairro", end.getBairro())
                    .campo("cidade", end.getCidade())
                    .campo("uf", end.getUf())
                    .build();

            itens.add(Json.objeto()
                    .campo("id", e.id())
                    .campo("nome", e.nome())
                    .campo("email", e.email())
                    .campo("telefone", e.telefone())
                    .campoJson("endereco", endereco)
                    .build());
        }
        Http.json(ex, 200, Json.lista(itens));
    }

    private void listarImpressoras(HttpExchange ex, int idEmpresa) throws IOException, SQLException {
        if (!empresaDao.existeAtiva(idEmpresa)) {
            Http.json(ex, 404, Json.objeto().campo("Rota não encontrada.", "Empresa não encontrada.").build());
            return;
        }

        List<String> itens = new ArrayList<>();
        for (Impressora i : impressoraDao.listarPorEmpresa(idEmpresa)) {
            if (i.isAtivo()) {
                itens.add(ImpressoraHandler.paraJson(i));
            }
        }
        Http.json(ex, 200, Json.lista(itens));
    }
}