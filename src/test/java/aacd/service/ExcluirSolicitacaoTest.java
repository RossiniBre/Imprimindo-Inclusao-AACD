package aacd.service;

import aacd.dao.SolicitacaoDao;
import aacd.model.SolicitacaoImpressao;
import aacd.model.StatusSolicitacao;
import aacd.model.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.sql.Connection;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

class ExcluirSolicitacaoTest {

    private static final int SOLICITACAO_ID = 42;
    private static final String MONGO_ID = "6ac6a60e2cc2f73b96ef0dff";

    private SolicitacaoDao solicitacaoDao;
    private ApagadorSolicitacao apagador;
    private Connection conn;
    private ExcluirSolicitacao service;

    @BeforeEach
    void preparar() throws Exception {
        solicitacaoDao = mock(SolicitacaoDao.class);
        apagador = mock(ApagadorSolicitacao.class);
        conn = mock(Connection.class);
        when(apagador.apagar(conn, SOLICITACAO_ID, MONGO_ID)).thenReturn(true);
        service = new ExcluirSolicitacao(solicitacaoDao, apagador, () -> conn);
    }

    private Usuario ator(String perfil, boolean ativo) {
        Usuario u = mock(Usuario.class);
        when(u.getPerfil()).thenReturn(perfil);
        when(u.isAtivo()).thenReturn(ativo);
        return u;
    }

    private void solicitacaoEm(StatusSolicitacao status) throws Exception {
        SolicitacaoImpressao s = mock(SolicitacaoImpressao.class);
        when(s.getStatus()).thenReturn(status);
        when(s.getMongoId()).thenReturn(MONGO_ID);
        when(solicitacaoDao.buscarPorId(conn, SOLICITACAO_ID)).thenReturn(s);
    }

    private void excluir(String perfil) throws Exception {
        service.excluir(ator(perfil, true), SOLICITACAO_ID);
    }

    private void assertNadaApagado() throws Exception {
        verify(apagador, never()).apagar(any(), anyInt(), any());
        verify(conn, never()).commit();
    }

    // ---------- caminho feliz ----------

    @Test
    void adminApagaCanceladaNaOrdemCerta() throws Exception {
        solicitacaoEm(StatusSolicitacao.CANCELADA);

        excluir("ADMIN");

        InOrder ordem = inOrder(apagador, conn);
        ordem.verify(apagador).apagar(conn, SOLICITACAO_ID, MONGO_ID);
        ordem.verify(conn).commit();
        verify(conn, never()).rollback();
        verify(conn).close();
    }

    @Test
    void adminEFuncionarioApagamTodosOsStatusFinais() throws Exception {
        StatusSolicitacao[] finais = {StatusSolicitacao.RECUSADA, StatusSolicitacao.CANCELADA,
                StatusSolicitacao.CONCLUIDA, StatusSolicitacao.FALHOU};

        for (StatusSolicitacao status : finais) {
            solicitacaoEm(status);
            for (String perfil : new String[]{"ADMIN", "FUNCIONARIO"}) {
                assertDoesNotThrow(() -> excluir(perfil), perfil + " deveria apagar " + status);
            }
        }
        verify(apagador, times(8)).apagar(conn, SOLICITACAO_ID, MONGO_ID);
    }

    // ---------- recusas ----------

    @Test
    void pendenteNaoPodeSerApagadaSemCancelar() throws Exception {
        solicitacaoEm(StatusSolicitacao.PENDENTE);

        assertThrows(IllegalStateException.class, () -> excluir("ADMIN"));
        assertThrows(IllegalStateException.class, () -> excluir("FUNCIONARIO"));

        assertNadaApagado();
    }

    @Test
    void emAndamentoNaoPodeSerApagada() throws Exception {
        solicitacaoEm(StatusSolicitacao.EM_ANDAMENTO);

        assertThrows(IllegalStateException.class, () -> excluir("ADMIN"));
        assertThrows(IllegalStateException.class, () -> excluir("FUNCIONARIO"));

        assertNadaApagado();
    }

    @Test
    void empresaNaoPodeApagarENemAbreConexao() throws Exception {
        assertThrows(SecurityException.class, () -> excluir("EMPRESA"));
        verifyNoInteractions(solicitacaoDao, apagador, conn);
    }

    @Test
    void usuarioInativoNaoPodeApagar() throws Exception {
        assertThrows(SecurityException.class,
                () -> service.excluir(ator("ADMIN", false), SOLICITACAO_ID));
        verifyNoInteractions(solicitacaoDao, apagador, conn);
    }

    @Test
    void solicitacaoInexistenteEhRecusada() throws Exception {
        when(solicitacaoDao.buscarPorId(conn, 999)).thenReturn(null);

        assertThrows(IllegalArgumentException.class,
                () -> service.excluir(ator("ADMIN", true), 999));

        assertNadaApagado();
    }

    // ---------- falhas ----------

    @Test
    void linhaNaoApagadaFazRollback() throws Exception {
        solicitacaoEm(StatusSolicitacao.CANCELADA);
        when(apagador.apagar(conn, SOLICITACAO_ID, MONGO_ID)).thenReturn(false);

        assertThrows(IllegalStateException.class, () -> excluir("ADMIN"));

        verify(conn).rollback();
        verify(conn, never()).commit();
    }

    @Test
    void falhaAoApagarFazRollbackENaoEscondeOErro() throws Exception {
        solicitacaoEm(StatusSolicitacao.CANCELADA);
        RuntimeException erro = new RuntimeException("mongo caiu");
        when(apagador.apagar(conn, SOLICITACAO_ID, MONGO_ID)).thenThrow(erro);

        RuntimeException lancada = assertThrows(RuntimeException.class, () -> excluir("ADMIN"));

        assertSame(erro, lancada);
        verify(conn).rollback();
        verify(conn, never()).commit();
    }

    @Test
    void falhaNoRollbackNaoEscondeOErroOriginal() throws Exception {
        solicitacaoEm(StatusSolicitacao.CANCELADA);
        SQLException erro = new SQLException("x");
        when(apagador.apagar(conn, SOLICITACAO_ID, MONGO_ID)).thenThrow(erro);
        doThrow(new SQLException("rollback falhou")).when(conn).rollback();

        SQLException lancada = assertThrows(SQLException.class, () -> excluir("ADMIN"));

        assertSame(erro, lancada);
    }

    @Test
    void conexaoEhFechadaMesmoComFalha() throws Exception {
        solicitacaoEm(StatusSolicitacao.CANCELADA);
        when(apagador.apagar(conn, SOLICITACAO_ID, MONGO_ID)).thenThrow(new SQLException("x"));

        assertThrows(SQLException.class, () -> excluir("ADMIN"));

        verify(conn).close();
    }
}