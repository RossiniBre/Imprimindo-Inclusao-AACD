package aacd.service;

import aacd.dao.SolicitacaoDao;
import aacd.dao.SolicitacaoEventosDao;
import aacd.model.Solicitacao;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class CancelarSolicitacaoTest {

    private static final int USUARIO_ID = 10;
    private static final int SOLICITACAO_ID = 42;
    private static final String MOTIVO = "Impressora quebrou";

    private SolicitacaoDao solicitacaoDao;
    private SolicitacaoEventosDao eventosDao;
    private Connection conn;
    private CancelarSolicitacao service;

    @BeforeEach
    void preparar() throws Exception {
        solicitacaoDao = mock(SolicitacaoDao.class);
        eventosDao = mock(SolicitacaoEventosDao.class);
        conn = mock(Connection.class);
        when(solicitacaoDao.cancelar(eq(conn), anyInt(), any(), any(), anyInt())).thenReturn(true);
        service = new CancelarSolicitacao(solicitacaoDao, eventosDao, () -> conn);
    }

    private Usuario ator(String perfil, boolean ativo) {
        Usuario u = mock(Usuario.class);
        when(u.getId()).thenReturn(USUARIO_ID);
        when(u.getPerfil()).thenReturn(perfil);
        when(u.isAtivo()).thenReturn(ativo);
        return u;
    }

    private void solicitacaoEm(StatusSolicitacao status) throws Exception {
        when(solicitacaoDao.buscarSolicitacaoPorId(conn, SOLICITACAO_ID))
                .thenReturn(new Solicitacao(SOLICITACAO_ID, 7, 3, "Titulo", status, null));
    }

    private void cancelar(String perfil, String justificativa) throws Exception {
        service.cancelar(ator(perfil, true), SOLICITACAO_ID, justificativa);
    }

    private void assertNadaGravado() throws Exception {
        verify(solicitacaoDao, never()).cancelar(any(), anyInt(), any(), any(), anyInt());
        verifyNoInteractions(eventosDao);
        verify(conn, never()).commit();
    }

    // ---------- caminho feliz ----------

    @Test
    void funcionarioCancelaPendenteNaOrdemCerta() throws Exception {
        solicitacaoEm(StatusSolicitacao.PENDENTE);

        cancelar("FUNCIONARIO", null);

        InOrder ordem = inOrder(solicitacaoDao, eventosDao, conn);
        ordem.verify(solicitacaoDao).cancelar(conn, SOLICITACAO_ID, StatusSolicitacao.PENDENTE,
                null, USUARIO_ID);
        ordem.verify(eventosDao).registrarEvento(eq(SOLICITACAO_ID), eq(StatusSolicitacao.PENDENTE),
                eq(StatusSolicitacao.CANCELADA), eq(USUARIO_ID), any(), isNull());
        ordem.verify(conn).commit();
        verify(conn, never()).rollback();
        verify(conn).close();
    }

    @Test
    void adminCancelaPendenteSemJustificativa() throws Exception {
        solicitacaoEm(StatusSolicitacao.PENDENTE);

        cancelar("ADMIN", null);

        verify(solicitacaoDao).cancelar(conn, SOLICITACAO_ID, StatusSolicitacao.PENDENTE,
                null, USUARIO_ID);
        verify(conn).commit();
    }

    @Test
    void adminCancelaEmAndamentoComJustificativaAparada() throws Exception {
        solicitacaoEm(StatusSolicitacao.EM_ANDAMENTO);

        cancelar("ADMIN", "  " + MOTIVO + "  ");

        verify(solicitacaoDao).cancelar(conn, SOLICITACAO_ID, StatusSolicitacao.EM_ANDAMENTO,
                MOTIVO, USUARIO_ID);
        verify(eventosDao).registrarEvento(SOLICITACAO_ID, StatusSolicitacao.EM_ANDAMENTO,
                StatusSolicitacao.CANCELADA, USUARIO_ID, MOTIVO, null);
        verify(conn).commit();
    }

    // ---------- recusas ----------

    @Test
    void empresaNaoPodeCancelarENemAbreConexao() throws Exception {
        assertThrows(SecurityException.class, () -> cancelar("EMPRESA", MOTIVO));
        verifyNoInteractions(solicitacaoDao, eventosDao, conn);
    }

    @Test
    void usuarioInativoNaoPodeCancelar() throws Exception {
        assertThrows(SecurityException.class,
                () -> service.cancelar(ator("ADMIN", false), SOLICITACAO_ID, MOTIVO));
        verifyNoInteractions(solicitacaoDao, eventosDao, conn);
    }

    @Test
    void funcionarioNaoCancelaEmAndamento() throws Exception {
        solicitacaoEm(StatusSolicitacao.EM_ANDAMENTO);

        assertThrows(SecurityException.class, () -> cancelar("FUNCIONARIO", MOTIVO));

        assertNadaGravado();
        verify(conn).rollback();
    }

    @Test
    void adminNaoCancelaEmAndamentoSemJustificativa() throws Exception {
        solicitacaoEm(StatusSolicitacao.EM_ANDAMENTO);

        assertThrows(IllegalArgumentException.class, () -> cancelar("ADMIN", null));
        assertThrows(IllegalArgumentException.class, () -> cancelar("ADMIN", "   "));

        assertNadaGravado();
    }

    @Test
    void justificativaMuitoLongaEhRecusada() throws Exception {
        assertThrows(IllegalArgumentException.class, () -> cancelar("ADMIN", "x".repeat(501)));
        verifyNoInteractions(solicitacaoDao, eventosDao);
    }

    @Test
    void statusFinaisNaoPodemSerCancelados() throws Exception {
        StatusSolicitacao[] finais = {StatusSolicitacao.RECUSADA, StatusSolicitacao.CONCLUIDA,
                StatusSolicitacao.CANCELADA, StatusSolicitacao.FALHOU};

        for (StatusSolicitacao status : finais) {
            solicitacaoEm(status);
            for (String perfil : new String[]{"ADMIN", "FUNCIONARIO"}) {
                assertThrows(IllegalStateException.class, () -> cancelar(perfil, MOTIVO),
                        perfil + " não deveria cancelar " + status);
            }
        }
        assertNadaGravado();
    }

    @Test
    void solicitacaoInexistenteEhRecusada() throws Exception {
        when(solicitacaoDao.buscarSolicitacaoPorId(conn, 999)).thenReturn(null);

        assertThrows(IllegalArgumentException.class,
                () -> service.cancelar(ator("ADMIN", true), 999, MOTIVO));

        assertNadaGravado();
    }

    // ---------- concorrência e falhas ----------

    @Test
    void statusMudouNoMeioNaoRegistraEventoEFazRollback() throws Exception {
        solicitacaoEm(StatusSolicitacao.PENDENTE);
        when(solicitacaoDao.cancelar(eq(conn), anyInt(), any(), any(), anyInt())).thenReturn(false);

        assertThrows(IllegalStateException.class, () -> cancelar("FUNCIONARIO", null));

        verifyNoInteractions(eventosDao);
        verify(conn).rollback();
        verify(conn, never()).commit();
    }

    @Test
    void falhaNoMongoFazRollbackENaoEscondeOErro() throws Exception {
        solicitacaoEm(StatusSolicitacao.PENDENTE);
        RuntimeException erro = new RuntimeException("mongo caiu");
        doThrow(erro).when(eventosDao).registrarEvento(anyInt(), any(), any(), anyInt(), any(), any());

        RuntimeException lancada = assertThrows(RuntimeException.class,
                () -> cancelar("FUNCIONARIO", null));

        assertSame(erro, lancada);
        verify(conn).rollback();
        verify(conn, never()).commit();
    }

    @Test
    void falhaNoRollbackNaoEscondeOErroOriginal() throws Exception {
        solicitacaoEm(StatusSolicitacao.PENDENTE);
        SQLException erro = new SQLException("x");
        when(solicitacaoDao.cancelar(eq(conn), anyInt(), any(), any(), anyInt())).thenThrow(erro);
        doThrow(new SQLException("rollback falhou")).when(conn).rollback();

        SQLException lancada = assertThrows(SQLException.class,
                () -> cancelar("FUNCIONARIO", null));

        assertSame(erro, lancada);
    }

    @Test
    void conexaoEhFechadaMesmoComFalha() throws Exception {
        solicitacaoEm(StatusSolicitacao.PENDENTE);
        when(solicitacaoDao.cancelar(eq(conn), anyInt(), any(), any(), anyInt()))
                .thenThrow(new SQLException("x"));

        assertThrows(SQLException.class, () -> cancelar("FUNCIONARIO", null));

        verify(conn).close();
    }
}