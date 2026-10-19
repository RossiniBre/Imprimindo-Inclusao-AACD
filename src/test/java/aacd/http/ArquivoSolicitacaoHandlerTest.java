package aacd.http;

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
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ArquivoSolicitacaoHandlerTest {

    private static final int USUARIO_ID = 10;
    private static final int EMPRESA_ID = 7;
    private static final int SOLICITACAO_ID = 1;
    private static final String MONGO_ID = "6ac6a60e2cc2f73b96ef0dff";
    private static final String ARQUIVO_ID = "arquivo-gridfs-1";
    private static final String NOME = "peca.stl";
    private static final byte[] BYTES = "solid teste".getBytes(StandardCharsets.UTF_8);

    private GerenciadorSessoes sessoes;
    private ConteudoSolicitacaoDao conteudoDao;
    private ArmazenamentoArquivo armazenamento;
    private SolicitacaoDao solicitacaoDao;
    private EmpresaDao empresaDao;
    private Connection conn;
    private SolicitacaoImpressao solicitacao;
    private Empresa empresa;

    private HttpExchange ex;
    private Headers cabecalhosRequisicao;
    private Headers cabecalhosResposta;
    private ByteArrayOutputStream saida;

    private ArquivoSolicitacaoHandler handler;

    @BeforeEach
    void preparar() throws Exception {
        sessoes = mock(GerenciadorSessoes.class);
        conteudoDao = mock(ConteudoSolicitacaoDao.class);
        armazenamento = mock(ArmazenamentoArquivo.class);
        solicitacaoDao = mock(SolicitacaoDao.class);
        empresaDao = mock(EmpresaDao.class);
        conn = mock(Connection.class);

        solicitacao = mock(SolicitacaoImpressao.class);
        when(solicitacao.getEmpresaId()).thenReturn(EMPRESA_ID);
        when(solicitacao.getMongoId()).thenReturn(MONGO_ID);
        when(solicitacaoDao.buscarPorId(conn, SOLICITACAO_ID)).thenReturn(solicitacao);

        empresa = mock(Empresa.class);
        when(empresa.getId()).thenReturn(EMPRESA_ID);
        when(empresaDao.buscarPorUsuarioId(USUARIO_ID)).thenReturn(empresa);

        when(conteudoDao.buscarPorId(MONGO_ID)).thenReturn(Optional.of(conteudo(NOME)));
        when(armazenamento.abrir(ARQUIVO_ID)).thenReturn(new ByteArrayInputStream(BYTES));

        ex = mock(HttpExchange.class);
        cabecalhosRequisicao = new Headers();
        cabecalhosResposta = new Headers();
        saida = new ByteArrayOutputStream();
        when(ex.getRequestMethod()).thenReturn("GET");
        when(ex.getRequestHeaders()).thenReturn(cabecalhosRequisicao);
        when(ex.getResponseHeaders()).thenReturn(cabecalhosResposta);
        when(ex.getResponseBody()).thenReturn(saida);
        pedir("id=" + SOLICITACAO_ID);

        handler = new ArquivoSolicitacaoHandler(sessoes, conteudoDao, armazenamento,
                solicitacaoDao, empresaDao, () -> conn);
    }

    // ---------- apoio ----------

    private ConteudoSolicitacao conteudo(String nomeArquivo) {
        return new ConteudoSolicitacao(MONGO_ID, "Titulo", "Descricao", 1, ARQUIVO_ID, nomeArquivo);
    }

    private void pedir(String query) {
        String uri = "/api/solicitacao/arquivo" + (query.isEmpty() ? "" : "?" + query);
        when(ex.getRequestURI()).thenReturn(URI.create(uri));
    }

    private void logarComo(String perfil) {
        Sessao sessao = mock(Sessao.class);
        when(sessao.getPerfil()).thenReturn(perfil);
        when(sessao.getUsuarioId()).thenReturn(USUARIO_ID);
        when(sessoes.buscar("token")).thenReturn(Optional.of(sessao));
        cabecalhosRequisicao.add("Cookie", "SESSAO=token");
    }

    private String corpo() {
        return saida.toString(StandardCharsets.UTF_8);
    }

    private void assertErro(int status, String mensagem) throws Exception {
        verify(ex).sendResponseHeaders(eq(status), anyLong());
        assertTrue(corpo().contains(mensagem), "Corpo recebido: " + corpo());
        verify(armazenamento, never()).abrir(any());
    }

    private static <T> T any() {
        return org.mockito.ArgumentMatchers.any();
    }

    // ---------- método e autenticação ----------

    @Test
    void metodoDiferenteDeGetEhRecusado() throws Exception {
        when(ex.getRequestMethod()).thenReturn("POST");

        handler.handle(ex);

        verify(ex).sendResponseHeaders(eq(405), anyLong());
        assertEquals("GET", cabecalhosResposta.getFirst("Allow"));
        verifyNoInteractions(solicitacaoDao, armazenamento);
    }

    @Test
    void semSessaoRetorna401() throws Exception {
        handler.handle(ex);

        verify(ex).sendResponseHeaders(eq(401), anyLong());
        verifyNoInteractions(solicitacaoDao, armazenamento);
    }

    @Test
    void perfilNaoPermitidoRetorna403() throws Exception {
        logarComo("OUTRO");

        handler.handle(ex);

        verify(ex).sendResponseHeaders(eq(403), anyLong());
        verifyNoInteractions(solicitacaoDao, armazenamento);
    }

    // ---------- parâmetro id ----------

    @Test
    void idNaoNumericoRetorna400() throws Exception {
        logarComo("ADMIN");
        pedir("id=abc");

        handler.handle(ex);

        assertErro(400, "Id inválido!");
        verifyNoInteractions(solicitacaoDao);
    }

    @Test
    void idAusenteRetorna404() throws Exception {
        logarComo("ADMIN");
        pedir("");

        handler.handle(ex);

        assertErro(404, "Solicitação não encontrada.");
    }

    @Test
    void solicitacaoInexistenteRetorna404() throws Exception {
        logarComo("ADMIN");
        pedir("id=999");

        handler.handle(ex);

        assertErro(404, "Solicitação não encontrada.");
    }

    // ---------- download por perfil ----------

    @Test
    void adminBaixaOArquivo() throws Exception {
        logarComo("ADMIN");

        handler.handle(ex);

        verify(ex).sendResponseHeaders(200, 0L);
        assertArrayEquals(BYTES, saida.toByteArray());
        assertEquals("application/octet-stream", cabecalhosResposta.getFirst("Content-Type"));
        assertEquals("nosniff", cabecalhosResposta.getFirst("X-Content-Type-Options"));
        assertTrue(cabecalhosResposta.getFirst("Content-Disposition").startsWith("attachment;"));
        assertTrue(cabecalhosResposta.getFirst("Content-Disposition").contains("filename=\"peca.stl\""));
        verifyNoInteractions(empresaDao);
    }

    @Test
    void funcionarioBaixaOArquivo() throws Exception {
        logarComo("FUNCIONARIO");

        handler.handle(ex);

        verify(ex).sendResponseHeaders(200, 0L);
        assertArrayEquals(BYTES, saida.toByteArray());
        verifyNoInteractions(empresaDao);
    }

    @Test
    void empresaDestinatariaBaixaOArquivo() throws Exception {
        logarComo("EMPRESA");

        handler.handle(ex);

        verify(ex).sendResponseHeaders(200, 0L);
        assertArrayEquals(BYTES, saida.toByteArray());
        verify(empresaDao).buscarPorUsuarioId(USUARIO_ID);
    }

    @Test
    void empresaAlheiaRecebe404SemRevelarASolicitacao() throws Exception {
        when(empresa.getId()).thenReturn(EMPRESA_ID + 1);
        logarComo("EMPRESA");

        handler.handle(ex);

        assertErro(404, "Solicitação não encontrada.");
        verifyNoInteractions(conteudoDao);
    }

    @Test
    void usuarioEmpresaSemCadastroRecebe404() throws Exception {
        when(empresaDao.buscarPorUsuarioId(USUARIO_ID)).thenReturn(null);
        logarComo("EMPRESA");

        handler.handle(ex);

        assertErro(404, "Solicitação não encontrada.");
        verifyNoInteractions(conteudoDao);
    }

    // ---------- arquivo ----------

    @Test
    void conteudoAusenteNoMongoRetorna404() throws Exception {
        when(conteudoDao.buscarPorId(MONGO_ID)).thenReturn(Optional.empty());
        logarComo("ADMIN");

        handler.handle(ex);

        assertErro(404, "Arquivo não encontrado.");
    }

    @Test
    void arquivoAusenteNoGridFsRetorna404() throws Exception {
        when(armazenamento.abrir(ARQUIVO_ID)).thenThrow(new ArquivoNaoEncontradoException(ARQUIVO_ID));
        logarComo("ADMIN");

        handler.handle(ex);

        verify(ex).sendResponseHeaders(eq(404), anyLong());
        assertTrue(corpo().contains("Arquivo não encontrado."));
    }

    @Test
    void nomeComAcentoEEspacoGeraCabecalhoSeguro() throws Exception {
        when(conteudoDao.buscarPorId(MONGO_ID)).thenReturn(Optional.of(conteudo("peça final.stl")));
        logarComo("ADMIN");

        handler.handle(ex);

        String disposicao = cabecalhosResposta.getFirst("Content-Disposition");
        assertTrue(disposicao.contains("filename=\"pe_a_final.stl\""), disposicao);
        assertTrue(disposicao.contains("filename*=UTF-8''pe%C3%A7a%20final.stl"), disposicao);
    }

    @Test
    void fluxoDoArquivoEhFechadoDepoisDoEnvio() throws Exception {
        AtomicBoolean fechado = new AtomicBoolean(false);
        InputStream fluxo = new ByteArrayInputStream(BYTES) {
            @Override
            public void close() {
                fechado.set(true);
            }
        };
        when(armazenamento.abrir(ARQUIVO_ID)).thenReturn(fluxo);
        logarComo("ADMIN");

        handler.handle(ex);

        assertTrue(fechado.get());
    }

    // ---------- falhas internas ----------

    @Test
    void falhaNoMysqlRetorna500() throws Exception {
        when(solicitacaoDao.buscarPorId(conn, SOLICITACAO_ID)).thenThrow(new SQLException("banco caiu"));
        logarComo("ADMIN");

        handler.handle(ex);

        assertErro(500, "Erro interno.");
    }

    @Test
    void falhaNoArmazenamentoRetorna500() throws Exception {
        when(armazenamento.abrir(ARQUIVO_ID))
                .thenThrow(new ArmazenamentoException("falhou", new RuntimeException()));
        logarComo("ADMIN");

        handler.handle(ex);

        verify(ex).sendResponseHeaders(eq(500), anyLong());
        assertTrue(corpo().contains("Erro interno."));
    }

    @Test
    void conexaoEhFechadaMesmoComFalha() throws Exception {
        when(solicitacaoDao.buscarPorId(conn, SOLICITACAO_ID)).thenThrow(new SQLException("x"));
        logarComo("ADMIN");

        handler.handle(ex);

        verify(conn).close();
    }
}