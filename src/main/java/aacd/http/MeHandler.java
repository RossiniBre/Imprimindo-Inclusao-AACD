package aacd.http;

import aacd.dao.UsuarioDao;
import aacd.model.Sessao;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Optional;

public class MeHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final UsuarioDao usuarioDao;

    public MeHandler(GerenciadorSessoes sessoes, UsuarioDao usuarioDao) {
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

        String token = Http.lerCookie(ex, "SESSAO");
        Optional<Sessao> sessao = sessoes.buscar(token);

        if (sessao.isEmpty()) {
            Http.erro(ex, 401, "Não autenticado.");
            return;
        }

        try {
            Optional<UsuarioDao.DadosConta> resultado =
                    usuarioDao.buscarDadosConta(sessao.get().getUsuarioId());

            if (resultado.isEmpty()) {
                sessoes.destruir(token);
                Http.erro(ex, 401, "Não autenticado.");
                return;
            }

            UsuarioDao.DadosConta d = resultado.get();
            var json = Json.objeto().campo("perfil", d.perfil());
            if (d.nome() != null)          json = json.campo("nome", d.nome());
            if (d.identificador() != null) json = json.campo("identificador", d.identificador());
            if (d.email() != null)         json = json.campo("email", d.email());
            if (d.cargo() != null)         json = json.campo("cargo", d.cargo());
            if (d.setor() != null)         json = json.campo("setor", d.setor());

            Http.json(ex, 200, json.build());

        } catch (SQLException e) {
            e.printStackTrace();
            Http.erro(ex, 500, "Erro interno.");
        }
    }
}