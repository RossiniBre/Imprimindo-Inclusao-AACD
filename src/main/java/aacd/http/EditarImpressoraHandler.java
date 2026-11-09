package aacd.http;

import aacd.dao.UsuarioDao;
import aacd.model.Disponibilidade;
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
import java.util.Locale;
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

            // null = "não alterar"
            Set<Material> materiais = campos.containsKey("materiais")
                    ? Http.lerMateriais(campos.get("materiais"))
                    : null;
            Integer comprimentoMm = lerMedidaOpcional(campos, "comprimentoMm");
            Integer larguraMm = lerMedidaOpcional(campos, "larguraMm");
            Integer alturaMm = lerMedidaOpcional(campos, "alturaMm");
            Disponibilidade disponibilidade = lerDisponibilidadeOpcional(campos.get("disponibilidade"));

            editarImpressora.executar(ator, impressoraId, campos.get("modelo"), materiais,
                    comprimentoMm, larguraMm, alturaMm, disponibilidade);
            Http.json(ex, 200, Json.objeto().campo("mensagem", "Impressora atualizada.").build());

        } catch (IllegalStateException e) {
            Http.erro(ex, 409, e.getMessage());
        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (SQLException | MongoException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }

    /** Ausente ou vazio -> null (não alterar). */
    private static Disponibilidade lerDisponibilidadeOpcional(String texto) {
        if (texto == null || texto.isBlank()) return null;
        try {
            return Disponibilidade.valueOf(texto.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Disponibilidade inválida: " + texto.trim());
        }
    }

    /** Ausente ou vazio -> null (não alterar). Presente -> inteiro maior que zero. */
    private static Integer lerMedidaOpcional(Map<String, String> campos, String nome) {
        String texto = campos.get(nome);
        if (texto == null || texto.isBlank()) return null;
        int valor;
        try {
            valor = Integer.parseInt(texto.trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Valor inválido em " + nome + ".");
        }
        if (valor <= 0) {
            throw new IllegalArgumentException("O campo " + nome + " deve ser maior que zero.");
        }
        return valor;
    }
}