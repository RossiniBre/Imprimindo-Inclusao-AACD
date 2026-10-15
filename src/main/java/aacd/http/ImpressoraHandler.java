package aacd.http;

import aacd.dao.EmpresaDao;
import aacd.dao.ImpressoraDao;
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

public class ImpressoraHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final UsuarioDao usuarioDao;
    private final CadastrarImpressora cadastro;
    private final EmpresaDao empresaDao = new EmpresaDao();
    private final ImpressoraDao impressoraDao = new ImpressoraDao();

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
            Http.json(ex, 405, Json.objeto().campo("erro", "Método não permitido.").build());
        }
    }

    private void cadastrar(HttpExchange ex) throws IOException {
        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "EMPRESA");
        if (sessao.isEmpty()) {
            return;
        }

        Map<String, String> campos = Http.lerFormulario(ex);

        try {
            Usuario ator = usuarioDao.buscarPorId(sessao.get().getUsuarioId());
            if (ator == null) {
                Http.json(ex, 401, "{\"erro\":\"Não autenticado.\"}");
                return;
            }

            int id = cadastro.executar(ator, campos.get("modelo"));
            Http.json(ex, 201, "{\"id\":" + id + "}");

        } catch (IllegalStateException e) {
            Http.json(ex, 403, "{\"erro\":\"" + e.getMessage() + "\"}");
        } catch (IllegalArgumentException e) {
            Http.json(ex, 400, "{\"erro\":\"" + e.getMessage() + "\"}");
        } catch (SQLException e) {
            Http.json(ex, 500, "{\"erro\":\"Erro interno.\"}");
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
                Http.json(ex, 404, Json.objeto().campo("erro", "Empresa não encontrada.").build());
                return;
            }

            List<String> itens = new ArrayList<>();
            for (Impressora i : impressoraDao.listarPorEmpresa(empresa.getId())) {
                itens.add(Json.objeto()
                        .campo("id", i.getId())
                        .campo("modelo", i.getModelo())
                        .campo("disponibilidade", i.getDisponibilidade().name())
                        .campo("ativo", i.isAtivo())
                        .build());
            }
            Http.json(ex, 200, Json.lista(itens));

        } catch (SQLException e) {
            Http.json(ex, 500, Json.objeto().campo("erro", "Erro interno.").build());
        }
    }
}