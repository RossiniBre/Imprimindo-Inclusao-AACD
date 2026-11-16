package aacd.http;

import aacd.dao.UsuarioDao;
import aacd.model.Sessao;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Optional;

public class ContatoAacdHandler implements HttpHandler {

    // TROQUE pelo valor real da coluna usuario.perfil do admin da AACD
    private static final String PERFIL_ADMIN = "ADMIN";

    private final GerenciadorSessoes sessoes;
    private final UsuarioDao usuarioDao;

    public ContatoAacdHandler(GerenciadorSessoes sessoes, UsuarioDao usuarioDao) {
        this.sessoes = sessoes;
        this.usuarioDao = usuarioDao;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "GET");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Sessao> sessao = sessoes.buscar(Http.lerCookie(ex, "SESSAO"));
        if (sessao.isEmpty()) {
            Http.erro(ex, 401, "Não autenticado.");
            return;
        }

        try {
            Optional<UsuarioDao.ContatoAacd> resultado = usuarioDao.buscarContatoAacd(PERFIL_ADMIN);

            if (resultado.isEmpty() || resultado.get().email() == null) {
                Http.erro(ex, 404, "Contato da AACD não encontrado.");
                return;
            }

            UsuarioDao.ContatoAacd c = resultado.get();
            var json = Json.objeto().campo("nome", c.nome()).campo("email", c.email());
            if (c.cargo() != null) json = json.campo("cargo", c.cargo());
            if (c.setor() != null) json = json.campo("setor", c.setor());

            Http.json(ex, 200, json.build());

        } catch (SQLException e) {
            e.printStackTrace();
            Http.erro(ex, 500, "Erro interno.");
        }
    }
}