package aacd.http;

import aacd.dao.EmpresaDao;
import aacd.dao.UsuarioDao;
import aacd.model.Empresa;
import aacd.model.Endereco;
import aacd.model.Sessao;
import aacd.model.Usuario;
import aacd.service.GerenciadorSessoes;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Optional;

public class EmpresaPerfilHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final UsuarioDao usuarioDao = new UsuarioDao();
    private final EmpresaDao empresaDao = new EmpresaDao();

    public EmpresaPerfilHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "GET");
            Http.json(ex, 405, Json.objeto().campo("erro", "Método não permitido.").build());
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "EMPRESA");
        if (sessao.isEmpty()) return;

        try {
            int usuarioId = sessao.get().getUsuarioId();
            Usuario usuario = usuarioDao.buscarPorId(usuarioId);
            Empresa empresa = empresaDao.buscarPorUsuarioId(usuarioId);

            if (usuario == null || empresa == null) {
                Http.json(ex, 404, Json.objeto().campo("erro", "Empresa não encontrada.").build());
                return;
            }

            Endereco end = empresa.getEndereco();
            String endereco = Json.objeto()
                    .campo("cep", end.getCep())
                    .campo("rua", end.getRua())
                    .campo("numero", end.getNumero())
                    .campo("bairro", end.getBairro())
                    .campo("cidade", end.getCidade())
                    .campo("uf", end.getUf())
                    .build();

            String json = Json.objeto()
                    .campo("nome", usuario.getNome())
                    .campo("email", empresa.getEmail())
                    .campo("telefone", empresa.getTelefone())
                    .campo("cnpj", empresa.getCnpj())
                    .campoJson("endereco", endereco)
                    .build();

            Http.json(ex, 200, json);

        } catch (SQLException e) {
            Http.json(ex, 500, Json.objeto().campo("erro", "Erro interno.").build());
        }
    }
}