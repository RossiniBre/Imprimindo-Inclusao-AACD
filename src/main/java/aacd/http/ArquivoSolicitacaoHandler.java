package aacd.http;

import aacd.config.ConnectionFactory;
import aacd.dao.ConteudoSolicitacaoDao;
import aacd.dao.EmpresaDao;
import aacd.dao.SolicitacaoDao;
import aacd.model.ConteudoSolicitacao;
import aacd.model.Empresa;
import aacd.model.Sessao;
import aacd.model.SolicitacaoImpressao;
import aacd.service.GerenciadorSessoes;
import aacd.storage.ArmazenamentoArquivo;
import aacd.storage.ArmazenamentoException;
import aacd.storage.ArquivoNaoEncontradoException;
import com.mongodb.MongoException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Optional;

public class ArquivoSolicitacaoHandler implements HttpHandler {

    @FunctionalInterface
    interface FornecedorConexao {
        Connection abrir() throws SQLException;
    }

    private final GerenciadorSessoes sessoes;
    private final ConteudoSolicitacaoDao conteudoDao;
    private final ArmazenamentoArquivo armazenamento;
    private final SolicitacaoDao solicitacaoDao;
    private final EmpresaDao empresaDao;
    private final FornecedorConexao conexoes;

    public ArquivoSolicitacaoHandler(GerenciadorSessoes sessoes,
                                     ConteudoSolicitacaoDao conteudoDao,
                                     ArmazenamentoArquivo armazenamento) {
        this(sessoes, conteudoDao, armazenamento,
                new SolicitacaoDao(), new EmpresaDao(), ConnectionFactory::getConnection);
    }

    ArquivoSolicitacaoHandler(GerenciadorSessoes sessoes,
                              ConteudoSolicitacaoDao conteudoDao,
                              ArmazenamentoArquivo armazenamento,
                              SolicitacaoDao solicitacaoDao,
                              EmpresaDao empresaDao,
                              FornecedorConexao conexoes) {
        this.sessoes = sessoes;
        this.conteudoDao = conteudoDao;
        this.armazenamento = armazenamento;
        this.solicitacaoDao = solicitacaoDao;
        this.empresaDao = empresaDao;
        this.conexoes = conexoes;
    }

    @Override
    public void handle(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Allow", "GET");
            Http.erro(ex, 405, "Método não permitido.");
            return;
        }

        Optional<Sessao> sessao = Http.exigirPerfil(ex, sessoes, "ADMIN", "FUNCIONARIO", "EMPRESA");
        if (sessao.isEmpty()) return;

        try {
            int id;
            try {
                id = Http.lerId(Http.lerQuery(ex), "id", 0);
            } catch (IllegalArgumentException e) {
                Http.erro(ex, 400, e.getMessage());
                return;
            }

            SolicitacaoImpressao solicitacao;
            try (Connection conn = conexoes.abrir()) {
                solicitacao = solicitacaoDao.buscarPorId(conn, id);
            }
            if (solicitacao == null) {
                Http.erro(ex, 404, "Solicitação não encontrada.");
                return;
            }

            if ("EMPRESA".equals(sessao.get().getPerfil())) {
                Empresa empresa = empresaDao.buscarPorUsuarioId(sessao.get().getUsuarioId());
                if (empresa == null || empresa.getId() != solicitacao.getEmpresaId()) {
                    Http.erro(ex, 404, "Solicitação não encontrada.");
                    return;
                }
            }

            Optional<ConteudoSolicitacao> conteudo = conteudoDao.buscarPorId(solicitacao.getMongoId());
            if (conteudo.isEmpty() || conteudo.get().getArquivoId() == null) {
                Http.erro(ex, 404, "Arquivo não encontrado.");
                return;
            }

            try (InputStream arquivo = armazenamento.abrir(conteudo.get().getArquivoId())) {
                ex.getResponseHeaders().set("Content-Type", "application/octet-stream");
                ex.getResponseHeaders().set("Content-Disposition", disposicao(conteudo.get().getNomeArquivo()));
                ex.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
                ex.sendResponseHeaders(200, 0);
                try (var os = ex.getResponseBody()) {
                    arquivo.transferTo(os);
                }
            }

        } catch (IllegalArgumentException e) {
            Http.erro(ex, 500, "Erro interno.");
        } catch (ArquivoNaoEncontradoException e) {
            Http.erro(ex, 404, "Arquivo não encontrado.");
        } catch (ArmazenamentoException | SQLException | MongoException e) {
            Http.erro(ex, 500, "Erro interno.");
        }
    }

    private String disposicao(String nome) {
        String base = (nome == null || nome.isBlank()) ? "arquivo" : nome;
        String simples = base.replaceAll("[^A-Za-z0-9._-]", "_");
        String codificado = URLEncoder.encode(base, StandardCharsets.UTF_8).replace("+", "%20");
        return "attachment; filename=\"" + simples + "\"; filename*=UTF-8''" + codificado;
    }
}