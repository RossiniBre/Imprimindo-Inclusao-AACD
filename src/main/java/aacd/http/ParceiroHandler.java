package aacd.http;

import aacd.dao.EmpresaDao;
import aacd.dao.ImpressoraDao;
import aacd.dao.ImpressoraMateriaisDao;
import aacd.model.*;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.*;

public class ParceiroHandler implements HttpHandler {

    private static final String BASE = "/api/parceiros";

    private final GerenciadorSessoes sessoes;
    private final EmpresaDao empresaDao = new EmpresaDao();
    private final ImpressoraDao impressoraDao = new ImpressoraDao();
    private final ImpressoraMateriaisDao materiaisDao = new ImpressoraMateriaisDao();

    public ParceiroHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "GET");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "FUNCIONARIO", "ADMIN");
        if (sessao.isEmpty()) {
            return;
        }

        String resto = ex.getRequestURI().getPath().substring(BASE.length());

        try {
            if (resto.isEmpty() || resto.equals("/")) {
                listarParceiros(ex, sessao.get());
            } else if (resto.matches("/\\d+/impressoras")) {
                listarImpressoras(ex, sessao.get(), Integer.parseInt(resto.split("/")[1]));
            } else {
                Http.json(ex, 404, Json.objeto().campo("erro", "Rota não encontrada.").build());
            }
        } catch (SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }

    // Só o admin enxerga (e pode reativar) as empresas desativadas
    private boolean ehAdmin(Sessao sessao) {
        return "ADMIN".equals(sessao.getPerfil());
    }

    private void listarParceiros(HttpExchange ex, Sessao sessao) throws IOException, SQLException {
        List<EmpresaResumo> empresas = ehAdmin(sessao)
                ? empresaDao.listarTodas()
                : empresaDao.listarAtivas();

        List<String> itens = new ArrayList<>();
        for (EmpresaResumo e : empresas) {
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
                    .campo("usuarioId", e.usuarioId())
                    .campo("ativo", e.ativo())
                    .campo("nome", e.nome())
                    .campo("email", e.email())
                    .campo("telefone", e.telefone())
                    .campoJson("endereco", endereco)
                    .build());
        }
        Http.json(ex, 200, Json.lista(itens));
    }

        private void listarImpressoras(HttpExchange ex, Sessao sessao, int idEmpresa) throws IOException, SQLException {
        boolean podeVer = ehAdmin(sessao)
                ? empresaDao.existe(idEmpresa)
                : empresaDao.existeAtiva(idEmpresa);
        if (!podeVer) {
            Http.erro(ex, 404, "Empresa não encontrada.");
            return;
        }

        List<Impressora> impressoras = impressoraDao.listarPorEmpresa(idEmpresa);

        List<Integer> ids = impressoras.stream().map(Impressora::getId).toList();
        Map<Integer, Set<Material>> materiais = materiaisDao.buscarVarias(ids);

        List<String> itens = new ArrayList<>();
        for (Impressora i : impressoras) {
            itens.add(ImpressoraHandler.paraJson(i, materiais.getOrDefault(i.getId(), Set.of())));
        }
        Http.json(ex, 200, Json.lista(itens));
    }
}