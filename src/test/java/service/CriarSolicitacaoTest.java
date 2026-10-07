package service;

import aacd.dao.ConteudoSolicitacaoDao;
import aacd.dao.FuncionarioDao;
import aacd.dao.ImpressoraDao;
import aacd.dao.SolicitacaoDao;
import aacd.model.ConteudoSolicitacao;
import aacd.model.Funcionario;
import aacd.model.Impressora;
import aacd.model.SolicitacaoImpressao;
import aacd.service.CriarSolicitacao;
import aacd.storage.ArmazenamentoArquivo;
import aacd.storage.ArmazenamentoException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class CriarSolicitacaoTest {

    private static final int USUARIO_ID = 10;
    private static final int FUNCIONARIO_ID = 5;
    private static final int IMPRESSORA_ID = 3;
    private static final int EMPRESA_ID = 7;
    private static final String ARQUIVO_ID = "arquivo-gridfs-1";
    private static final String MONGO_ID = "6ac6a60e2cc2f73b96ef0dff";
    private static final String NOME = "peca.stl";

    private FuncionarioDao funcionarioDao;
    private ImpressoraDao impressoraDao;
    private SolicitacaoDao solicitacaoDao;
    private ConteudoSolicitacaoDao conteudoDao;
    private ArmazenamentoArquivo armazenamento;
    private Connection conn;
    private Impressora impressora;
    private CriarSolicitacao service;

    @BeforeEach
    void preparar() throws Exception {
        funcionarioDao = mock(FuncionarioDao.class);
        impressoraDao = mock(ImpressoraDao.class);
        solicitacaoDao = mock(SolicitacaoDao.class);
        conteudoDao = mock(ConteudoSolicitacaoDao.class);
        armazenamento = mock(ArmazenamentoArquivo.class);
        conn = mock(Connection.class);

        Funcionario funcionario = mock(Funcionario.class);
        when(funcionario.getId()).thenReturn(FUNCIONARIO_ID);
        when(funcionarioDao.buscarPorUsuarioId(USUARIO_ID)).thenReturn(funcionario);

        impressora = mock(Impressora.class);
        when(impressora.isAtivo()).thenReturn(true);
        when(impressora.getEmpresaId()).thenReturn(EMPRESA_ID);
        when(impressoraDao.buscarPorId(conn, IMPRESSORA_ID)).thenReturn(impressora);

        when(armazenamento.salvar(eq(NOME), any())).thenReturn(ARQUIVO_ID);
        when(conteudoDao.inserir(any())).thenReturn(MONGO_ID);
        when(solicitacaoDao.inserir(eq(conn), any())).thenReturn(42);

        service = new CriarSolicitacao(funcionarioDao, impressoraDao, solicitacaoDao,
                conteudoDao, armazenamento, () -> conn);
    }

    private InputStream arquivo() {
        return new ByteArrayInputStream("solid teste".getBytes());
    }

    private int criar(int usuarioId, int impressoraId, String titulo, int quantidade, String nome)
            throws Exception {
        return service.criar(usuarioId, impressoraId, titulo, "Descricao", quantidade, nome, arquivo());
    }

    private void assertNadaGravado() throws Exception {
        verify(armazenamento, never()).salvar(any(), any());
        verifyNoInteractions(conteudoDao, solicitacaoDao);
    }

    // ---------- caminho feliz ----------

    @Test
    void criaSolicitacaoNaOrdemCerta() throws Exception {
        int id = criar(USUARIO_ID, IMPRESSORA_ID, "Titulo", 2, NOME);

        assertEquals(42, id);
        InOrder ordem = inOrder(armazenamento, conteudoDao, solicitacaoDao, conn);
        ordem.verify(armazenamento).salvar(eq(NOME), any());
        ordem.verify(conteudoDao).inserir(any());
        ordem.verify(solicitacaoDao).inserir(eq(conn), any());
        ordem.verify(conn).commit();
        verify(conn, never()).rollback();
        verify(armazenamento, never()).apagar(any());
        verify(conteudoDao, never()).apagar(any());
        verify(conn).close();
    }

    @Test
    void gravaOsDadosCertosNoMongoENoMysql() throws Exception {
        criar(USUARIO_ID, IMPRESSORA_ID, "Titulo", 2, NOME);

        ArgumentCaptor<ConteudoSolicitacao> conteudo = ArgumentCaptor.forClass(ConteudoSolicitacao.class);
        verify(conteudoDao).inserir(conteudo.capture());
        assertEquals("Titulo", conteudo.getValue().getTitulo());
        assertEquals(2, conteudo.getValue().getQuantidade());
        assertEquals(ARQUIVO_ID, conteudo.getValue().getArquivoId());
        assertEquals(NOME, conteudo.getValue().getNomeArquivo());

        ArgumentCaptor<SolicitacaoImpressao> sol = ArgumentCaptor.forClass(SolicitacaoImpressao.class);
        verify(solicitacaoDao).inserir(eq(conn), sol.capture());
        assertEquals(EMPRESA_ID, sol.getValue().getEmpresaId());
        assertEquals(FUNCIONARIO_ID, sol.getValue().getCriadoPor());
        assertEquals(IMPRESSORA_ID, sol.getValue().getImpressoraId());
        assertEquals(MONGO_ID, sol.getValue().getMongoId());
    }

    // ---------- recusas antes de gravar ----------

    @Test
    void usuarioQueNaoEFuncionarioEhRecusado() throws Exception {
        assertThrows(IllegalArgumentException.class,
                () -> criar(999, IMPRESSORA_ID, "Titulo", 1, NOME));
        assertNadaGravado();
    }

    @Test
    void impressoraInexistenteEhRecusada() throws Exception {
        when(impressoraDao.buscarPorId(conn, 999)).thenReturn(null);
        assertThrows(IllegalArgumentException.class,
                () -> criar(USUARIO_ID, 999, "Titulo", 1, NOME));
        assertNadaGravado();
    }

    @Test
    void impressoraInativaEhRecusada() throws Exception {
        when(impressora.isAtivo()).thenReturn(false);
        assertThrows(IllegalArgumentException.class,
                () -> criar(USUARIO_ID, IMPRESSORA_ID, "Titulo", 1, NOME));
        assertNadaGravado();
    }

    @Test
    void tituloVazioEhRecusadoAntesDeQualquerAcesso() throws Exception {
        assertThrows(IllegalArgumentException.class,
                () -> criar(USUARIO_ID, IMPRESSORA_ID, " ", 1, NOME));
        verifyNoInteractions(funcionarioDao, impressoraDao);
        assertNadaGravado();
    }

    @Test
    void quantidadeZeroEhRecusada() throws Exception {
        assertThrows(IllegalArgumentException.class,
                () -> criar(USUARIO_ID, IMPRESSORA_ID, "Titulo", 0, NOME));
        verifyNoInteractions(funcionarioDao, impressoraDao);
        assertNadaGravado();
    }

    @Test
    void extensaoInvalidaEhRecusada() throws Exception {
        assertThrows(IllegalArgumentException.class,
                () -> criar(USUARIO_ID, IMPRESSORA_ID, "Titulo", 1, "peca.exe"));
        verifyNoInteractions(funcionarioDao, impressoraDao);
        assertNadaGravado();
    }

    // ---------- falhas durante a gravação (compensação) ----------

    @Test
    void falhaAoSalvarArquivoNaoGravaMaisNada() throws Exception {
        when(armazenamento.salvar(eq(NOME), any()))
                .thenThrow(new ArmazenamentoException("falhou", new RuntimeException()));

        assertThrows(ArmazenamentoException.class,
                () -> criar(USUARIO_ID, IMPRESSORA_ID, "Titulo", 1, NOME));

        verifyNoInteractions(conteudoDao, solicitacaoDao);
        verify(armazenamento, never()).apagar(any());
    }

    @Test
    void falhaNoMongoApagaSoOArquivo() throws Exception {
        when(conteudoDao.inserir(any())).thenThrow(new RuntimeException("mongo caiu"));

        assertThrows(RuntimeException.class,
                () -> criar(USUARIO_ID, IMPRESSORA_ID, "Titulo", 1, NOME));

        verify(armazenamento).apagar(ARQUIVO_ID);
        verify(conteudoDao, never()).apagar(any());
        verifyNoInteractions(solicitacaoDao);
        verify(conn, never()).commit();
    }

    @Test
    void falhaNoMysqlFazRollbackEApagaDocumentoEArquivo() throws Exception {
        SQLException erro = new SQLException("fk");
        when(solicitacaoDao.inserir(eq(conn), any())).thenThrow(erro);

        SQLException lancada = assertThrows(SQLException.class,
                () -> criar(USUARIO_ID, IMPRESSORA_ID, "Titulo", 1, NOME));

        assertSame(erro, lancada);
        verify(conn).rollback();
        verify(conn, never()).commit();
        verify(conteudoDao).apagar(MONGO_ID);
        verify(armazenamento).apagar(ARQUIVO_ID);
    }

    @Test
    void falhaNaLimpezaNaoEscondeOErroOriginal() throws Exception {
        SQLException erro = new SQLException("fk");
        when(solicitacaoDao.inserir(eq(conn), any())).thenThrow(erro);
        doThrow(new SQLException("rollback falhou")).when(conn).rollback();
        doThrow(new RuntimeException("mongo")).when(conteudoDao).apagar(any());
        doThrow(new ArmazenamentoException("gridfs", new RuntimeException()))
                .when(armazenamento).apagar(any());

        SQLException lancada = assertThrows(SQLException.class,
                () -> criar(USUARIO_ID, IMPRESSORA_ID, "Titulo", 1, NOME));

        assertSame(erro, lancada);
    }

    @Test
    void conexaoEhFechadaMesmoComFalha() throws Exception {
        when(solicitacaoDao.inserir(eq(conn), any())).thenThrow(new SQLException("x"));

        assertThrows(SQLException.class,
                () -> criar(USUARIO_ID, IMPRESSORA_ID, "Titulo", 1, NOME));

        verify(conn).close();
    }
}