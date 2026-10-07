package aacd.http;

import aacd.model.Sessao;
import aacd.service.GerenciadorSessoes;
import aacd.storage.ArmazenamentoArquivo;
import aacd.storage.ArmazenamentoException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.Set;

public class ArquivoHandler implements HttpHandler {

    private static final long TAMANHO_MAX = 50L * 1024 * 1024; // 50 MB
    private static final Set<String> EXTENSOES = Set.of("stl", "obj", "3mf");

    private final GerenciadorSessoes sessoes;
    private final ArmazenamentoArquivo armazenamento;

    public ArquivoHandler(GerenciadorSessoes sessoes, ArmazenamentoArquivo armazenamento) {
        this.sessoes = sessoes;
        this.armazenamento = armazenamento;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "POST");
            Http.json(ex, 405, "{\"erro\":\"Método não permitido.\"}");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "FUNCIONARIO");
        if (sessao.isEmpty()) {
            return;
        }

        String nome = lerNome(ex.getRequestURI().getRawQuery());
        if (nome == null || nome.isBlank() || nome.length() > 255
                || nome.contains("/") || nome.contains("\\")) {
            Http.json(ex, 400, "{\"erro\":\"Nome do arquivo inválido.\"}");
            return;
        }
        int ponto = nome.lastIndexOf('.');
        String extensao = ponto < 0 ? "" : nome.substring(ponto + 1).toLowerCase();
        if (!EXTENSOES.contains(extensao)) {
            Http.json(ex, 400, "{\"erro\":\"Formato inválido. Aceitos: stl, obj, 3mf.\"}");
            return;
        }

        String tamanho = ex.getRequestHeaders().getFirst("Content-Length");
        long bytes;
        try {
            bytes = Long.parseLong(tamanho);
        } catch (NumberFormatException e) {
            Http.json(ex, 411, "{\"erro\":\"Content-Length obrigatório.\"}");
            return;
        }
        if (bytes <= 0 || bytes > TAMANHO_MAX) {
            Http.json(ex, 413, "{\"erro\":\"Arquivo vazio ou maior que 50 MB.\"}");
            return;
        }

        try {
            String arquivoId = armazenamento.salvar(nome, ex.getRequestBody());
            Http.json(ex, 201, "{\"arquivoId\":\"" + arquivoId + "\"}");
        } catch (ArmazenamentoException e) {
            Http.json(ex, 500, "{\"erro\":\"Erro interno.\"}");
        }
    }

    private static String lerNome(String query) {
        if (query == null) return null;
        for (String par : query.split("&")) {
            if (par.startsWith("nome=")) {
                return URLDecoder.decode(par.substring(5), StandardCharsets.UTF_8);
            }
        }
        return null;
    }
}