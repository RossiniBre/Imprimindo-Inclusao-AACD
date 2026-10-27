package aacd.http;

import aacd.dao.EmpresaDao;
import aacd.dao.SolicitacaoDao;
import aacd.dao.UsuarioDao;
import aacd.model.Empresa;
import aacd.model.Sessao;
import aacd.model.Usuario;
import aacd.service.CriarSolicitacao;
import aacd.service.GerenciadorSessoes;
import aacd.storage.ArmazenamentoException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import org.apache.commons.fileupload.FileItemIterator;
import org.apache.commons.fileupload.FileItemStream;
import org.apache.commons.fileupload.FileUpload;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.RequestContext;
import org.apache.commons.fileupload.util.Streams;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.sql.SQLException;
import java.util.*;

public class SolicitacaoHandler implements HttpHandler {

    private static final long TAMANHO_ARQUIVO_MAX = 50L * 1024 * 1024;       // 50 MB
    private static final long TAMANHO_REQUISICAO_MAX = TAMANHO_ARQUIVO_MAX + 1024 * 1024;

    private final GerenciadorSessoes sessoes;
    private final CriarSolicitacao criarSolicitacao;
    private final EmpresaDao empresaDao = new EmpresaDao();
    private final SolicitacaoDao solicitacaoDao = new SolicitacaoDao();
    private final UsuarioDao usuarioDao = new UsuarioDao();

    public SolicitacaoHandler(GerenciadorSessoes sessoes, CriarSolicitacao criarSolicitacao) {
        this.sessoes = sessoes;
        this.criarSolicitacao = criarSolicitacao;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        String metodo = ex.getRequestMethod();

        if ("GET".equals(metodo)) {
            listar(ex);
            return;
        }
        if (!"POST".equals(metodo)) {
            ex.getResponseHeaders().set("Allow", "GET, POST");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "FUNCIONARIO", "ADMIN");
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
            Http.erro(ex, 400, "Envie o formulário como multipart/form-data.");
            return;
        }

        long tamanho;
        try {
            tamanho = Long.parseLong(ex.getRequestHeaders().getFirst("Content-Length"));
        } catch (NumberFormatException e) {
            Http.erro(ex, 411, "Content-Length obrigatório.");
            return;
        }
        if (tamanho > TAMANHO_REQUISICAO_MAX) {
            Http.erro(ex, 413, "Requisição maior que o limite.");
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
                    Http.erro(ex, 400, "Arquivo não enviado.");
                    return;
                }

                int quantidade;
                int impressoraId;
                try {
                    quantidade = Integer.parseInt(campos.getOrDefault("quantidade", "").trim());
                    impressoraId = Integer.parseInt(campos.getOrDefault("impressoraId", "").trim());
                } catch (NumberFormatException e) {
                    Http.erro(ex, 400, "Quantidade e impressora devem ser números.");
                    return;
                }

                Usuario ator = usuarioDao.buscarPorId(sessao.get().getUsuarioId());
                if (ator == null) {
                    Http.erro(ex, 401, "Não autenticado.");
                    return;
                }

                limitado = new Limitado(item.openStream(), TAMANHO_ARQUIVO_MAX);
                int id;
                if ("ADMIN".equals(ator.getPerfil())) {
                    id = criarSolicitacao.criarComoAdmin(ator, impressoraId,
                            campos.get("titulo"), campos.get("descricao"),
                            quantidade, item.getName(), limitado);
                } else {
                    id = criarSolicitacao.criar(ator.getId(), impressoraId,
                            campos.get("titulo"), campos.get("descricao"),
                            quantidade, item.getName(), limitado);
                }

                Http.json(ex, 201, Json.objeto().campo("id", id).build());
                return;
            }
            Http.erro(ex, 400, "Arquivo não enviado.");

        } catch (IllegalArgumentException e) {
            Http.erro(ex, 400, e.getMessage());
        } catch (ArmazenamentoException e) {
            if (limitado != null && limitado.excedeu()) {
                Http.erro(ex, 413, "Arquivo maior que 50 MB.");
            } else {
                Http.erro(ex, 500, "Erro interno.");
            }
        } catch (FileUploadException | SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }

    private void listar(HttpExchange ex) throws IOException {
        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "FUNCIONARIO", "ADMIN", "EMPRESA");
        if (sessao.isEmpty()) {
            return;
        }

        try {
            Usuario ator = usuarioDao.buscarPorId(sessao.get().getUsuarioId());
            if (ator == null) {
                Http.erro(ex, 401, "Não autenticado.");
                return;
            }

            Integer empresaId = null;
            if ("EMPRESA".equals(ator.getPerfil())) {
                Empresa empresa = empresaDao.buscarPorUsuarioId(ator.getId());
                if (empresa == null) {
                    Http.erro(ex, 404, "Empresa não encontrada.");
                    return;
                }
                empresaId = empresa.getId();
            }

            List<String> itens = new ArrayList<>();
            for (SolicitacaoDao.ItemLista s : solicitacaoDao.listar(empresaId)) {
                itens.add(Json.objeto()
                        .campo("id", s.id())
                        .campo("titulo", s.titulo())
                        .campo("status", s.status())
                        .campo("empresa", s.empresa())
                        .campo("criadoPor", s.criadoPor())
                        .campo("impressora", s.impressora())
                        .campo("criadoEm", s.criadoEm())
                        .campo("decididoEm", s.decididoEm())
                        .campo("finalizadoEm", s.finalizadoEm())
                        .campo("justificativa", s.justificativa())
                        .campo("expiraEm", s.expiraEm())
                        .build());
            }
            Http.json(ex, 200, Json.lista(itens));

        } catch (SQLException e) {
            Http.erro(ex, 500, "Erro interno.");
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