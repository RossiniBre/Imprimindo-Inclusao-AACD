package aacd.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

import java.sql.Connection;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

import com.mongodb.MongoException;

import aacd.config.ConnectionFactory;
import aacd.dao.ImpressoraDao;
import aacd.dao.SolicitacaoDao;
import aacd.dao.SolicitacaoEventosDao;
import aacd.model.Impressora;
import aacd.model.Solicitacao;
import aacd.model.StatusSolicitacao;
import aacd.model.Usuario;

class ResponderSolicitacaoFinalizacaoTest {

    private static final int SOLICITACAO_ID = 10;
    private static final int IMPRESSORA_ID = 5;
    private static final int ATOR_ID = 7;

    private SolicitacaoDao solicitacaoDao;
    private SolicitacaoEventosDao eventosDao;
    private ImpressoraDao impressoraDao;
    private PermissaoImpressora permissao;
    private Connection conn;
    private MockedStatic<ConnectionFactory> fabrica;
    private Usuario ator;
    private Solicitacao solicitacao;
    private Impressora impressora;
    private ResponderSolicitacao service;

    @BeforeEach
    void preparar() throws Exception {
        solicitacaoDao = mock(SolicitacaoDao.class);
        eventosDao = mock(SolicitacaoEventosDao.class);
        impressoraDao = mock(ImpressoraDao.class);
        permissao = mock(PermissaoImpressora.class);
        conn = mock(Connection.class);

        fabrica = mockStatic(ConnectionFactory.class);
        fabrica.when(ConnectionFactory::getConnection).thenReturn(conn);

        ator = mock(Usuario.class);
        when(ator.getPerfil()).thenReturn("EMPRESA");
        when(ator.isAtivo()).thenReturn(true);
        when(ator.getId()).thenReturn(ATOR_ID);

        solicitacao = mock(Solicitacao.class);
        when(solicitacao.getStatus()).thenReturn(StatusSolicitacao.EM_ANDAMENTO);
        when(solicitacao.getImpressoraId()).thenReturn(IMPRESSORA_ID);

        impressora = mock(Impressora.class);

        when(solicitacaoDao.buscarSolicitacaoPorId(conn, SOLICITACAO_ID)).thenReturn(solicitacao);
        when(impressoraDao.buscarPorId(conn, IMPRESSORA_ID)).thenReturn(impressora);
        when(solicitacaoDao.finalizar(eq(conn), eq(SOLICITACAO_ID), any())).thenReturn(true);

        service = new ResponderSolicitacao(solicitacaoDao, eventosDao, impressoraDao, permissao);
    }

    @AfterEach
    void limpar() {
        fabrica.close();
    }

    // ---------- concluir ----------

    @Test
    void concluirMudaStatusRegistraEventoEComita() throws Exception {
        service.concluir(ator, SOLICITACAO_ID);

        verify(solicitacaoDao).finalizar(conn, SOLICITACAO_ID, StatusSolicitacao.CONCLUIDA);
        verify(eventosDao).registrarEvento(eq(SOLICITACAO_ID), eq(StatusSolicitacao.EM_ANDAMENTO),
                eq(StatusSolicitacao.CONCLUIDA), eq(ATOR_ID), eq("Concluída pela empresa"), isNull());
        verify(conn).commit();
        verify(conn, never()).rollback();
    }

    @Test
    void concluirRejeitaAtorQueNaoEEmpresa() throws Exception {
        when(ator.getPerfil()).thenReturn("FUNCIONARIO");

        assertThrows(IllegalStateException.class, () -> service.concluir(ator, SOLICITACAO_ID));

        fabrica.verify(ConnectionFactory::getConnection, never());
        verifyNoInteractions(solicitacaoDao, eventosDao);
    }

    @Test
    void concluirRejeitaEmpresaInativa() throws Exception {
        when(ator.isAtivo()).thenReturn(false);

        assertThrows(IllegalStateException.class, () -> service.concluir(ator, SOLICITACAO_ID));

        verifyNoInteractions(solicitacaoDao, eventosDao);
    }

    @Test
    void concluirRejeitaAtorNulo() throws Exception {
        assertThrows(IllegalStateException.class, () -> service.concluir(null, SOLICITACAO_ID));

        verifyNoInteractions(solicitacaoDao, eventosDao);
    }

    @Test
    void concluirFalhaQuandoSolicitacaoNaoExiste() throws Exception {
        when(solicitacaoDao.buscarSolicitacaoPorId(conn, SOLICITACAO_ID)).thenReturn(null);

        assertThrows(IllegalArgumentException.class, () -> service.concluir(ator, SOLICITACAO_ID));

        verify(solicitacaoDao, never()).finalizar(any(), anyInt(), any());
        verify(conn).rollback();
        verify(conn, never()).commit();
    }

    @Test
    void concluirEscondeSolicitacaoDeOutraEmpresa() throws Exception {
        doThrow(new IllegalStateException("não é dona")).when(permissao).validar(ator, impressora);

        assertThrows(IllegalArgumentException.class, () -> service.concluir(ator, SOLICITACAO_ID));

        verify(solicitacaoDao, never()).finalizar(any(), anyInt(), any());
        verify(conn).rollback();
    }

    @Test
    void concluirFalhaSeNaoEstaEmAndamento() throws Exception {
        when(solicitacao.getStatus()).thenReturn(StatusSolicitacao.PENDENTE);

        assertThrows(IllegalStateException.class, () -> service.concluir(ator, SOLICITACAO_ID));

        verify(solicitacaoDao, never()).finalizar(any(), anyInt(), any());
        verifyNoInteractions(eventosDao);
        verify(conn).rollback();
        verify(conn, never()).commit();
    }

    @Test
    void concluirFalhaSeCancelamentoSimultaneoGanhouACorrida() throws Exception {
        when(solicitacaoDao.finalizar(eq(conn), eq(SOLICITACAO_ID), any())).thenReturn(false);

        assertThrows(IllegalStateException.class, () -> service.concluir(ator, SOLICITACAO_ID));

        verifyNoInteractions(eventosDao);
        verify(conn).rollback();
        verify(conn, never()).commit();
    }

    @Test
    void concluirDesfazAlteracaoSeMongoFalhar() throws Exception {
        doThrow(new MongoException("fora do ar")).when(eventosDao).registrarEvento(
                anyInt(), any(), any(), anyInt(), any(), any());

        assertThrows(MongoException.class, () -> service.concluir(ator, SOLICITACAO_ID));

        verify(conn).rollback();
        verify(conn, never()).commit();
    }

    // ---------- falhar ----------

    @Test
    void falharMudaStatusRegistraMotivoEComita() throws Exception {
        service.falhar(ator, SOLICITACAO_ID, "  filamento acabou  ");

        verify(solicitacaoDao).finalizar(conn, SOLICITACAO_ID, StatusSolicitacao.FALHOU);
        verify(eventosDao).registrarEvento(eq(SOLICITACAO_ID), eq(StatusSolicitacao.EM_ANDAMENTO),
                eq(StatusSolicitacao.FALHOU), eq(ATOR_ID), eq("filamento acabou"), isNull());
        verify(conn).commit();
    }

    @Test
    void falharSemMotivoUsaObservacaoPadrao() throws Exception {
        service.falhar(ator, SOLICITACAO_ID, "   ");

        verify(eventosDao).registrarEvento(eq(SOLICITACAO_ID), eq(StatusSolicitacao.EM_ANDAMENTO),
                eq(StatusSolicitacao.FALHOU), eq(ATOR_ID), eq("Falhou"), isNull());
        verify(conn).commit();
    }

    @Test
    void falharComMotivoNuloUsaObservacaoPadrao() throws Exception {
        service.falhar(ator, SOLICITACAO_ID, null);

        verify(eventosDao).registrarEvento(eq(SOLICITACAO_ID), eq(StatusSolicitacao.EM_ANDAMENTO),
                eq(StatusSolicitacao.FALHOU), eq(ATOR_ID), eq("Falhou"), isNull());
    }

    @Test
    void falharRejeitaMotivoMaiorQue500Caracteres() throws Exception {
        String longo = "x".repeat(501);

        assertThrows(IllegalArgumentException.class,
                () -> service.falhar(ator, SOLICITACAO_ID, longo));

        fabrica.verify(ConnectionFactory::getConnection, never());
        verifyNoInteractions(solicitacaoDao, eventosDao);
    }

    @Test
    void falharAceitaMotivoComExatamente500Caracteres() throws Exception {
        service.falhar(ator, SOLICITACAO_ID, "x".repeat(500));

        verify(conn).commit();
    }

    @Test
    void falharRejeitaAtorQueNaoEEmpresa() throws Exception {
        when(ator.getPerfil()).thenReturn("ADMIN");

        assertThrows(IllegalStateException.class,
                () -> service.falhar(ator, SOLICITACAO_ID, "motivo"));

        verifyNoInteractions(solicitacaoDao, eventosDao);
    }

    @Test
    void falharFalhaSeNaoEstaEmAndamento() throws Exception {
        when(solicitacao.getStatus()).thenReturn(StatusSolicitacao.CONCLUIDA);

        assertThrows(IllegalStateException.class,
                () -> service.falhar(ator, SOLICITACAO_ID, "motivo"));

        verify(solicitacaoDao, never()).finalizar(any(), anyInt(), any());
        verify(conn).rollback();
    }
}