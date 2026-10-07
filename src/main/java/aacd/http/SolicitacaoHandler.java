package aacd.http;

import aacd.model.Sessao;
import aacd.service.CriarSolicitacao;
import aacd.service.GerenciadorSessoes;
import aacd.storage.ArmazenamentoException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import org.apache.commons.fileupload.FileItemIterator;
import org.apache.commons.fileupload.FileItemStream;
import org.apache.commons.fileupload.FileUpload;
import org.apache.commons.fileupload.FileUploadBase;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.RequestContext;
import org.apache.commons.fileupload.util.Streams;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class SolicitacaoHandler implements HttpHandler {

    private static final long TAMANHO_ARQUIVO_MAX = 50L * 1024 * 1024;       // 50 MB
    private static final long TAMANHO_REQUISICAO_MAX = TAMANHO_ARQUIVO_MAX + 1024 * 1024;

    private final GerenciadorSessoes sessoes;
    private final CriarSolicitacao criarSolicitacao;

    public SolicitacaoHandler(GerenciadorSessoes sessoes, CriarSolicitacao criarSolicitacao) {
        this.sessoes = sessoes;
        this.criarSolicitacao = criarSolicitacao;
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

        RequestContext contexto = new RequestContext() {
            public String getCharacterEncoding() { return "UTF-8"; }
            public String getContentType() { return ex.getRequestHeaders().getFirst("Content-Type"); }
            public int getContentLength() { return -1; }
            public InputStream getInputStream() { return ex.getRequestBody(); }
        };

        String tipo = ex.getRequestHeaders().getFirst("Content-Type");
        if (tipo == null || !tipo.toLowerCase().startsWith("multipart/")) {
            Http.json(ex, 400, "{\"erro\":\"Envie o formulário como multipart/form-data.\"}");
            return;
        }

        long tamanho;
        try {
            tamanho = Long.parseLong(ex.getRequestHeaders().getFirst("Content-Length"));
        } catch (NumberFormatException e) {
            Http.json(ex, 411, "{\"erro\":\"Content-Length obrigatório.\"}");
            return;
        }
        if (tamanho > TAMANHO_REQUISICAO_MAX) {
            Http.json(ex, 413, "{\"erro\":\"Requisição maior que o limite.\"}");
            return;
        }

        Map<String, String> campos = new HashMap<>();
        Limitado limitado = null;

        try {
            FileItemIterator itens = new FileUpload().getItemIterator(contexto);
            while (itens.hasNext()) {
                FileItemStream item = itens.next();

                if (item.isFormField()) {
                    campos.put(item.getFieldName(), Streams.asString(item.openStream(), "UTF-8"));
                    continue;
                }

                if (!"arquivo".equals(item.getFieldName()) || item.getName() == null
                        || item.getName().isBlank()) {
                    Http.json(ex, 400, "{\"erro\":\"Arquivo não enviado.\"}");
                    return;
                }

                int quantidade;
                int impressoraId;
                try {
                    quantidade = Integer.parseInt(campos.getOrDefault("quantidade", "").trim());
                    impressoraId = Integer.parseInt(campos.getOrDefault("impressoraId", "").trim());
                } catch (NumberFormatException e) {
                    Http.json(ex, 400, "{\"erro\":\"Quantidade e impressora devem ser números.\"}");
                    return;
                }

                limitado = new Limitado(item.openStream(), TAMANHO_ARQUIVO_MAX);
                int id = criarSolicitacao.criar(
                        sessao.get().getUsuarioId(), impressoraId,
                        campos.get("titulo"), campos.get("descricao"),
                        quantidade, item.getName(), limitado);

                Http.json(ex, 201, "{\"id\":" + id + "}");
                return;
            }
            Http.json(ex, 400, "{\"erro\":\"Arquivo não enviado.\"}");

        } catch (IllegalArgumentException e) {
            Http.json(ex, 400, "{\"erro\":\"" + e.getMessage() + "\"}");
        } catch (ArmazenamentoException e) {
            if (limitado != null && limitado.excedeu()) {
                Http.json(ex, 413, "{\"erro\":\"Arquivo maior que 50 MB.\"}");
            } else {
                Http.json(ex, 500, "{\"erro\":\"Erro interno.\"}");
            }
        } catch (FileUploadException | SQLException e) {
            Http.json(ex, 500, "{\"erro\":\"Erro interno.\"}");
        }
    }

    private static class Limitado extends FilterInputStream {
        private final long max;
        private long lidos;
        private boolean excedeu;

        Limitado(InputStream in, long max) {
            super(in);
            this.max = max;
        }

        boolean excedeu() { return excedeu; }

        @Override
        public int read() throws IOException {
            int b = super.read();
            if (b >= 0) contar(1);
            return b;
        }

        @Override
        public int read(byte[] buf, int off, int len) throws IOException {
            int n = super.read(buf, off, len);
            if (n > 0) contar(n);
            return n;
        }

        private void contar(long n) throws IOException {
            lidos += n;
            if (lidos > max) {
                excedeu = true;
                throw new IOException("Arquivo maior que o limite");
            }
        }
    }
}