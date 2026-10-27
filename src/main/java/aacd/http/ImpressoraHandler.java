package aacd.http;

import aacd.dao.EmpresaDao;
import aacd.dao.ImpressoraDao;
import aacd.dao.ImpressoraMateriaisDao;
import aacd.dao.UsuarioDao;
import aacd.model.Empresa;
import aacd.model.Impressora;
import aacd.model.Sessao;
import aacd.model.Usuario;
import aacd.service.CadastrarImpressora;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import aacd.model.Material;
import com.mongodb.MongoException;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;

public class ImpressoraHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final UsuarioDao usuarioDao;
    private final CadastrarImpressora cadastro;
    private final EmpresaDao empresaDao = new EmpresaDao();
    private final ImpressoraDao impressoraDao = new ImpressoraDao();
    private final ImpressoraMateriaisDao materiaisDao = new ImpressoraMateriaisDao();

    public ImpressoraHandler(GerenciadorSessoes sessoes, UsuarioDao usuarioDao,
                             CadastrarImpressora cadastro) {
        this.sessoes = sessoes;
        this.usuarioDao = usuarioDao;
        this.cadastro = cadastro;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        String metodo = ex.getRequestMethod();

        if ("GET".equals(metodo)) {
            listar(ex);
        } else if ("POST".equals(metodo)) {
            cadastrar(ex);
        } else {
            ex.getResponseHeaders().set("Allow", "GET, POST");
            Http.erro(ex, 405, "Método não permitido.");
        }
    }

    private void cadastrar(HttpExchange ex) throws IOException {
        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "EMPRESA");
        if (sessao.isEmpty()) {
            return;
        }

        Optional<Map<String, String>> formulario = Http.lerFormulario(ex);
        if (formulario.isEmpty()) {
            return;
        }
        Map<String, String> campos = formulario.get();

        try {
            Usuario ator = usuarioDao.buscarPorId(sessao.get().getUsuarioId());
            if (ator == null) {
                Http.erro(ex, 401, "Não autenticado.");
                return;
            }

            int id = cadastro.executar(ator, campos.get("modelo"),
                    lerMateriais(campos.get("materiais")));
            Http.json(ex, 201, Json.objeto().campo("id", id).build());

        } catch (IllegalStateException e) {
            Http.erro(ex, 403, e.getMessage());
        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
        } catch (MongoException e) {
            e.printStackTrace();
            Http.erro(ex, 500, "Erro interno.");
        }
    }

    private void listar(HttpExchange ex) throws IOException {
        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "EMPRESA");
        if (sessao.isEmpty()) {
            return;
        }

        try {
            Empresa empresa = empresaDao.buscarPorUsuarioId(sessao.get().getUsuarioId());
            if (empresa == null) {
                Http.erro(ex, 404, "Empresa não encontrada.");
                return;
            }

            List<Impressora> impressoras = impressoraDao.listarPorEmpresa(empresa.getId());
            List<Integer> ids = impressoras.stream().map(Impressora::getId).toList();
            Map<Integer, Set<Material>> materiais = materiaisDao.buscarVarias(ids);

            List<String> itens = new ArrayList<>();
            for (Impressora i : impressoras) {
                itens.add(paraJson(i, materiais.getOrDefault(i.getId(), Set.of())));
            }
            Http.json(ex, 200, Json.lista(itens));

        } catch (SQLException | MongoException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }

    private static Set<Material> lerMateriais(String texto) {
        Set<Material> resultado = EnumSet.noneOf(Material.class);
        if (texto == null || texto.isBlank()) {
            return resultado;
        }
        for (String parte : texto.split(",")) {
            String nome = parte.trim();
            if (nome.isEmpty()) continue;
            try {
                resultado.add(Material.valueOf(nome.toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Material inválido: " + nome);
            }
        }
        return resultado;
    }

    public static String paraJson(Impressora i, Set<Material> materiais) {
        List<String> itensMateriais = new ArrayList<>();
        for (Material m : materiais) {
            itensMateriais.add(Json.objeto()
                    .campo("codigo", m.name())
                    .campo("rotulo", m.getRotulo())
                    .build());
        }

        String base = Json.objeto()
                .campo("id", i.getId())
                .campo("modelo", i.getModelo())
                .campo("disponibilidade", i.getDisponibilidade().name())
                .campo("ativo", i.isAtivo())
                .build();

        return base.substring(0, base.lastIndexOf('}'))
                + ",\"materiais\":" + Json.lista(itensMateriais) + "}";
    }
}