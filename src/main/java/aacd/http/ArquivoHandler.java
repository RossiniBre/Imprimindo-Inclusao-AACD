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
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "FUNCIONARIO");
        if (sessao.isEmpty()) {
            return;
        }

        String nome;
        try {
            nome = lerNome(ex.getRequestURI().getRawQuery());
        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, "Nome do arquivo inválido.");
            return;
        }
        if (nome == null || nome.isBlank() || nome.length() > 255
                || nome.contains("/") || nome.contains("\\")) {
            Http.erro(ex, 400, "Nome do arquivo inválido.");
            return;
        }
        int ponto = nome.lastIndexOf('.');
        String extensao = ponto < 0 ? "" : nome.substring(ponto + 1).toLowerCase();
        if (!EXTENSOES.contains(extensao)) {
            Http.erro(ex, 400, "Formato inválido. Aceitos: stl, obj, 3mf.");
            return;
        }

        String tamanho = ex.getRequestHeaders().getFirst("Content-Length");
        long bytes;
        try {
            bytes = Long.parseLong(tamanho);
        } catch (NumberFormatException e) {
            Http.erro(ex, 411, "Content-Length obrigatório.");
            return;
        }
        if (bytes <= 0 || bytes > TAMANHO_MAX) {
            Http.erro(ex, 413, "Arquivo vazio ou maior que 50 MB.");
            return;
        }

        try {
            String arquivoId = armazenamento.salvar(nome, ex.getRequestBody());
            Http.json(ex, 201, Json.objeto().campo("arquivoId", arquivoId).build());
        } catch (ArmazenamentoException e) {
            Http.erro(ex, 500, "Erro interno.");
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