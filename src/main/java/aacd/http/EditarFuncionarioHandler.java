package aacd.http;

import aacd.dao.UsuarioDao;
import aacd.model.Sessao;
import aacd.model.Usuario;
import aacd.service.EditarFuncionario;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;

public class EditarFuncionarioHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final UsuarioDao usuarioDao = new UsuarioDao();
    private final EditarFuncionario editarFuncionario = new EditarFuncionario();

    public EditarFuncionarioHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "ADMIN", "FUNCIONARIO");
        if (sessao.isEmpty()) return;

        Optional<Map<String, String>> formulario = Http.lerFormulario(ex);
        if (formulario.isEmpty()) return;
        Map<String, String> campos = formulario.get();

        try {
            int idSessao = sessao.get().getUsuarioId();
            Usuario ator = usuarioDao.buscarPorId(idSessao);
            if (ator == null) {
                Http.erro(ex, 401, "Não autenticado.");
                return;
            }
            int alvoId = Http.lerId(campos, "id", idSessao);

            editarFuncionario.executar(ator, alvoId, campos.get("cargo"), campos.get("setor"));
            Http.json(ex, 200, Json.objeto().campo("mensagem", "Funcionário atualizado.").build());

        } catch (IllegalStateException e) {
            Http.erro(ex, 409, e.getMessage());
        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }
}