package aacd.http;

import aacd.dao.UsuarioDao;
import aacd.model.Material;
import aacd.model.Sessao;
import aacd.model.Usuario;
import aacd.service.EditarImpressora;
import aacd.service.GerenciadorSessoes;
import com.mongodb.MongoException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

public class EditarImpressoraHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final UsuarioDao usuarioDao = new UsuarioDao();
    private final EditarImpressora editarImpressora = new EditarImpressora();

    public EditarImpressoraHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "ADMIN", "EMPRESA");
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
            int impressoraId = Http.lerId(campos, "id", 0);
            
            Set<Material> materiais = campos.containsKey("materiais")
                    ? Http.lerMateriais(campos.get("materiais"))
                    : null;

            editarImpressora.executar(ator, impressoraId, campos.get("modelo"), materiais);
            Http.json(ex, 200, Json.objeto().campo("mensagem", "Impressora atualizada.").build());

        } catch (IllegalStateException e) {
            Http.erro(ex, 409, e.getMessage());
        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (SQLException | MongoException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }
}