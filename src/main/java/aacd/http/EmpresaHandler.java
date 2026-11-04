package aacd.http;

import aacd.service.CadastrarEmpresa;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;

public class EmpresaHandler implements HttpHandler {

    private final CadastrarEmpresa cadastro;

    public EmpresaHandler(CadastrarEmpresa cadastro) {
        this.cadastro = cadastro;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Map<String, String>> formulario = Http.lerFormulario(ex);
        if (formulario.isEmpty()) {
            return;
        }
        Map<String, String> campos = formulario.get();

        try {
            cadastro.executar(
                    campos.get("nome"), campos.get("cnpj"), campos.get("senha"),
                    campos.get("email"), campos.get("telefone"),
                    campos.get("cep"), campos.get("rua"), campos.get("numero"),
                    campos.get("bairro"), campos.get("cidade"), campos.get("uf"));
            Http.json(ex, 201, Json.objeto().campo("mensagem", "Empresa cadastrada.").build());

        } catch (IllegalStateException e) {
            Http.erro(ex, 409, e.getMessage());
        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }
}