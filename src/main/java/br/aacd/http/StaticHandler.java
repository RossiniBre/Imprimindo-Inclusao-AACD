package br.aacd.http;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

/** Serve os arquivos estáticos do frontend (HTML, CSS, JS, imagens). */
public class StaticHandler implements HttpHandler {

    private static final Map<String, String> TIPOS = Map.of(
            "html", "text/html; charset=utf-8",
            "css", "text/css; charset=utf-8",
            "js", "text/javascript; charset=utf-8",
            "json", "application/json; charset=utf-8",
            "svg", "image/svg+xml",
            "png", "image/png",
            "jpg", "image/jpeg",
            "ico", "image/x-icon"
    );

    private final Path raiz;

    public StaticHandler(Path raiz) {
        this.raiz = raiz.toAbsolutePath().normalize();
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        String caminho = ex.getRequestURI().getPath();
        if (caminho.equals("/")) {
            caminho = "/index.html";
        }

        // normalize + startsWith impede acessar arquivos fora da pasta public (ex.: /../pom.xml)
        Path arquivo = raiz.resolve(caminho.substring(1)).normalize();
        if (!arquivo.startsWith(raiz) || !Files.isRegularFile(arquivo)) {
            Http.json(ex, 404, "{\"erro\":\"não encontrado\"}");
            return;
        }

        String nome = arquivo.getFileName().toString();
        int ponto = nome.lastIndexOf('.');
        String extensao = ponto >= 0 ? nome.substring(ponto + 1).toLowerCase() : "";

        Http.enviar(ex, 200, TIPOS.getOrDefault(extensao, "application/octet-stream"), Files.readAllBytes(arquivo));
    }
}