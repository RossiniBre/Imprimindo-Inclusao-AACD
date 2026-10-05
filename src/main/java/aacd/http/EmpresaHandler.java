package aacd.http;

import aacd.service.CadastrarEmpresa;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;

public class EmpresaHandler implements HttpHandler {

    private final CadastrarEmpresa cadastro;

    public EmpresaHandler(CadastrarEmpresa cadastro) {
        this.cadastro = cadastro;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.json(ex, 405, "{\"erro\":\"Método não permitido.\"}");
            return;
        }

        Map<String, String> campos = Http.lerFormulario(ex);

        try {
            cadastro.executar(
                    campos.get("nome"), campos.get("cnpj"), campos.get("senha"),
                    campos.get("email"), campos.get("telefone"));
            Http.json(ex, 201, "{\"mensagem\":\"Empresa cadastrada.\"}");

        } catch (IllegalStateException e) {
            Http.json(ex, 409, "{\"erro\":\"" + e.getMessage() + "\"}");
        } catch (IllegalArgumentException e) {
            Http.json(ex, 400, "{\"erro\":\"" + e.getMessage() + "\"}");
        } catch (SQLException e) {
            Http.json(ex, 500, "{\"erro\":\"Erro interno.\"}");
        }
    }
}