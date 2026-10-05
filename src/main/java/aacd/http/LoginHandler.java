package aacd.http;

import aacd.model.Usuario;
import aacd.service.AutenticacaoService;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;

public class LoginHandler implements HttpHandler {

    private final AutenticacaoService autenticacao;
    private final GerenciadorSessoes sessoes;

    public LoginHandler(AutenticacaoService autenticacao, GerenciadorSessoes sessoes) {
        this.autenticacao = autenticacao;
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            Http.json(ex, 405, "{\"erro\":\"Método não permitido.\"}");
            return;
        }

        Map<String, String> campos = Http.lerFormulario(ex);

        try {
            Optional<Usuario> resultado =
                    autenticacao.autenticar(campos.get("identificador"), campos.get("senha"));

            if (resultado.isEmpty()) {
                Http.json(ex, 401, "{\"erro\":\"Identificador ou senha inválidos.\"}");
                return;
            }

            Usuario usuario = resultado.get();
            String token = sessoes.criar(usuario.getId(), usuario.getPerfil());
            ex.getResponseHeaders().add("Set-Cookie",
                    "SESSAO=" + token + "; HttpOnly; Path=/; SameSite=Strict");
            Http.json(ex, 200, "{\"perfil\":\"" + usuario.getPerfil() + "\"}");

        } catch (SQLException e) {
            Http.json(ex, 500, "{\"erro\":\"Erro interno.\"}");
        }
    }

}