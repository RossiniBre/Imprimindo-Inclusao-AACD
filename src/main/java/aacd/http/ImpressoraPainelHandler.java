package aacd.http;

import aacd.dao.EmpresaDao;
import aacd.dao.ImpressoraDao;
import aacd.model.Disponibilidade;
import aacd.model.Empresa;
import aacd.model.Material;
import aacd.model.Sessao;
import aacd.service.GerenciadorSessoes;
import aacd.service.ListarImpressoras;
import com.mongodb.MongoException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

public class ImpressoraPainelHandler implements HttpHandler {

    private final GerenciadorSessoes sessoes;
    private final EmpresaDao empresaDao = new EmpresaDao();
    private final ListarImpressoras listarImpressoras = new ListarImpressoras();

    public ImpressoraPainelHandler(GerenciadorSessoes sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "GET");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "ADMIN", "FUNCIONARIO", "EMPRESA");
        if (sessao.isEmpty()) {
            return;
        }
        boolean ehEmpresa = "EMPRESA".equals(sessao.get().getPerfil());

        try {
            Map<String, String> query = Http.lerQuery(ex);

            int idParam = Http.lerId(query, "empresaId", 0);
            Integer empresaId = idParam > 0 ? idParam : null;
            Disponibilidade disponibilidade =
                    lerEnum(query.get("disponibilidade"), Disponibilidade.class, "Disponibilidade");
            Material material = lerEnum(query.get("material"), Material.class, "Material");

            if (ehEmpresa) {
                Empresa empresa = empresaDao.buscarPorUsuarioId(sessao.get().getUsuarioId());
                if (empresa == null) {
                    Http.erro(ex, 404, "Empresa não encontrada.");
                    return;
                }
                empresaId = empresa.getId();
            }

            List<ListarImpressoras.Item> itens =
                    listarImpressoras.listar(empresaId, disponibilidade, material);

            if (!ehEmpresa) {
                itens = itens.stream().filter(i -> i.impressora().ativo()).toList();
            }

            List<String> json = new ArrayList<>();
            for (ListarImpressoras.Item item : itens) {
                json.add(paraJson(item));
            }
            Http.json(ex, 200, Json.lista(json));

        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (SQLException | MongoException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }

    private static <E extends Enum<E>> E lerEnum(String texto, Class<E> tipo, String campo) {
        if (texto == null || texto.isBlank()) return null;
        try {
            return Enum.valueOf(tipo, texto.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(campo + " inválido: " + texto.trim());
        }
    }

    private static String paraJson(ListarImpressoras.Item item) {
        ImpressoraDao.ItemPainel p = item.impressora();

        List<String> materiais = new ArrayList<>();
        for (Material m : item.materiais()) {
            materiais.add(Json.objeto()
                    .campo("codigo", m.name())
                    .campo("rotulo", m.getRotulo())
                    .build());
        }

        String empresa = Json.objeto()
                .campo("id", p.empresaId())
                .campo("nome", p.empresa())
                .build();

        return Json.objeto()
                .campo("id", p.id())
                .campo("modelo", p.modelo())
                .campo("disponibilidade", p.disponibilidade().name())
                .campo("ativo", p.ativo())
                .campoJson("empresa", empresa)
                .campoJson("materiais", Json.lista(materiais))
                .build();
    }
}