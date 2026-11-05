package aacd.http;

import aacd.dao.FuncionarioDao;
import aacd.dao.UsuarioDao;
import aacd.model.FuncionarioResumo;
import aacd.model.Sessao;
import aacd.model.Usuario;
import aacd.service.CadastrarFuncionario;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class FuncionarioHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final UsuarioDao usuarioDao;
    private final CadastrarFuncionario cadastro;
    private final FuncionarioDao funcionarioDao = new FuncionarioDao();

    public FuncionarioHandler(GerenciadorSessoes sessoes, UsuarioDao usuarioDao,
                              CadastrarFuncionario cadastro) {
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

    private void listar(HttpExchange ex) throws IOException {
        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "ADMIN");
        if (sessao.isEmpty()) {
            return;
        }

        try {
            List<String> itens = new ArrayList<>();
            for (FuncionarioResumo f : funcionarioDao.listar()) {
                itens.add(Json.objeto()
                        .campo("id", f.usuarioId())
                        .campo("nome", f.nome())
                        .campo("identificador", f.identificador())
                        .campo("email", f.email())
                        .campo("perfil", f.perfil())
                        .campo("cargo", f.cargo())
                        .campo("setor", f.setor())
                        .campo("ativo", f.ativo())
                        .build());
            }
            Http.json(ex, 200, Json.lista(itens));

        } catch (SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }

    private void cadastrar(HttpExchange ex) throws IOException {
        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "ADMIN");
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

            cadastro.executar(ator,
                    campos.get("nome"), campos.get("identificador"), campos.get("email"),
                    campos.get("senha"), campos.get("cargo"), campos.get("setor"));

            Http.json(ex, 201, Json.objeto().campo("mensagem", "Funcionário cadastrado.").build());

        } catch (IllegalStateException e) {
            Http.erro(ex, 409, e.getMessage());
        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }
}