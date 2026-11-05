package aacd.http;

import aacd.dao.UsuarioDao;
import aacd.model.Sessao;
import aacd.model.Usuario;
import aacd.service.AlterarEstadoConta;
import aacd.service.ContaComVinculosException;
import aacd.service.ExcluirConta;
import aacd.service.GerenciadorSessoes;
import aacd.util.Senha;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;

public class ContaHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final UsuarioDao usuarioDao;
    private final AlterarEstadoConta alterarEstado;
    private final ExcluirConta excluirConta;

    public ContaHandler(GerenciadorSessoes sessoes, UsuarioDao usuarioDao,
                        AlterarEstadoConta alterarEstado, ExcluirConta excluirConta) {
        this.sessoes = sessoes;
        this.usuarioDao = usuarioDao;
        this.alterarEstado = alterarEstado;
        this.excluirConta = excluirConta;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "ADMIN");
        if (sessao.isEmpty()) return;

        Optional<Map<String, String>> campos = Http.lerFormulario(ex);
        if (campos.isEmpty()) return;

        try {
            int alvoId = Http.lerId(campos.get(), "id", 0);

            switch (ex.getRequestURI().getPath()) {
                case "/api/conta/desativar":
                    alterarEstado.desativar(alvoId);
                    break;
                case "/api/conta/reativar":
                    alterarEstado.reativar(alvoId);
                    break;
                case "/api/conta/excluir":
                    if (!senhaConfere(sessao.get(), campos.get().get("senha"))) {
                        Http.erro(ex, 403, "Senha incorreta.");
                        return;
                    }
                    excluirConta.executar(alvoId);
                    break;
                default:
                    Http.erro(ex, 404, "Rota não encontrada.");
                    return;
            }

            Http.json(ex, 200, Json.objeto().campo("ok", true).build());

        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (IllegalStateException e) {
            Http.erro(ex, 404, e.getMessage());
        } catch (ContaComVinculosException e) {
            Http.erro(ex, 409, e.getMessage());
        } catch (SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }

    private boolean senhaConfere(Sessao sessao, String senha) throws SQLException {
        if (senha == null || senha.isEmpty()) return false;
        Usuario admin = usuarioDao.buscarPorId(sessao.getUsuarioId());
        return admin != null && Senha.confere(senha, admin.getSenhaHash());
    }
}