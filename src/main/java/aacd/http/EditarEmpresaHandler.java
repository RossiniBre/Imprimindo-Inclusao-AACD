package aacd.http;

import aacd.dao.UsuarioDao;
import aacd.model.Sessao;
import aacd.model.Usuario;
import aacd.service.EditarEmpresa;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;

public class EditarEmpresaHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final UsuarioDao usuarioDao = new UsuarioDao();
    private final EditarEmpresa editarEmpresa = new EditarEmpresa();

    public EditarEmpresaHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "EMPRESA");
        if (sessao.isEmpty()) return;

        Optional<Map<String, String>> formulario = Http.lerFormulario(ex);
        if (formulario.isEmpty()) return;
        Map<String, String> campos = formulario.get();

        try {
            Usuario ator = usuarioDao.buscarPorId(sessao.get().getUsuarioId());
            if (ator == null) {
                Http.erro(ex, 401, "Não autenticado.");
                return;
            }

            editarEmpresa.executar(ator,
                    campos.get("nome"), campos.get("email"), campos.get("telefone"),
                    campos.get("cep"), campos.get("rua"), campos.get("numero"),
                    campos.get("bairro"), campos.get("cidade"), campos.get("uf"));

            Http.json(ex, 200, Json.objeto().campo("mensagem", "Dados atualizados.").build());

        } catch (IllegalStateException e) {
            Http.erro(ex, 409, e.getMessage());
        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }
}