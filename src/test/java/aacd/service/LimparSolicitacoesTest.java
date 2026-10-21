package aacd.service;

import aacd.dao.ConteudoSolicitacaoDao;
import aacd.dao.SolicitacaoDao;
import aacd.dao.SolicitacaoEventosDao;
import aacd.model.ConteudoSolicitacao;
import aacd.model.SolicitacaoParaExcluir;
import aacd.model.StatusSolicitacao;
import aacd.storage.ArmazenamentoArquivo;
import aacd.storage.ArmazenamentoException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class LimparSolicitacoesTest {

    private static final int PENDENTE_DIAS = 30;
    private static final int FINALIZADA_DIAS = 90;
    private static final String MONGO_ID = "6ac6a60e2cc2f73b96ef0dff";
    private static final String ARQUIVO_ID = "arquivo-gridfs-1";

    private SolicitacaoDao solicitacaoDao;
    private SolicitacaoEventosDao eventosDao;
    private ConteudoSolicitacaoDao conteudoDao;
    private ArmazenamentoArquivo armazenamento;
    private Connection conn;
    private ConteudoSolicitacao conteudo;
    private LimparSolicitacoes service;

    @BeforeEach
    void preparar() throws Exception {
        solicitacaoDao = mock(SolicitacaoDao.class);
        eventosDao = mock(SolicitacaoEventosDao.class);
        conteudoDao = mock(ConteudoSolicitacaoDao.class);
        armazenamento = mock(ArmazenamentoArquivo.class);
        conn = mock(Connection.class);

        conteudo = mock(ConteudoSolicitacao.class);
        when(conteudo.getArquivoId()).thenReturn(ARQUIVO_ID);
        when(conteudoDao.buscarPorId(MONGO_ID)).thenReturn(Optional.of(conteudo));

        when(solicitacaoDao.listarPendentesExpiradas(eq(conn), anyInt())).thenReturn(List.of());
        when(solicitacaoDao.listarFinalizadasExpiradas(eq(conn), anyInt())).thenReturn(List.of());
        when(solicitacaoDao.cancelarPorExpiracao(eq(conn), anyInt(), anyString())).thenReturn(true);
        when(solicitacaoDao.excluir(eq(conn), anyInt())).thenReturn(true);

        service = new LimparSolicitacoes(solicitacaoDao, eventosDao, conteudoDao, armazenamento,
                () -> conn);
    }

    private LimparSolicitacoes.Resultado executar() throws Exception {
        return service.executar(PENDENTE_DIAS, FINALIZADA_DIAS);
    }

    private void pendentesExpiradas(Integer... ids) throws Exception {
        when(solicitacaoDao.listarPendentesExpiradas(conn, PENDENTE_DIAS)).thenReturn(List.of(ids));
    }

    private void finalizadasExpiradas(SolicitacaoParaExcluir... itens) throws Exception {
        when(solicitacaoDao.listarFinalizadasExpiradas(conn, FINALIZADA_DIAS)).thenReturn(List.of(itens));
    }

    // ---------- pendentes expiradas ----------

    @Test
    void cancelaPendenteExpiradaERegistraEventoDoSistema() throws Exception {
        pendentesExpiradas(5);

        LimparSolicitacoes.Resultado r = executar();

        assertEquals(1, r.canceladas);
        InOrder ordem = inOrder(solicitacaoDao, eventosDao, conn);
        ordem.verify(solicitacaoDao).cancelarPorExpiracao(conn, 5, LimparSolicitacoes.MOTIVO_EXPIRACAO);
        ordem.verify(eventosDao).registrarEvento(5, StatusSolicitacao.PENDENTE,
                StatusSolicitacao.CANCELADA, LimparSolicitacoes.SISTEMA,
                LimparSolicitacoes.MOTIVO_EXPIRACAO, null);
        ordem.verify(conn, atLeastOnce()).commit();
    }

    @Test
    void pendenteQueFoiRespondidaNoMeioNaoGeraEvento() throws Exception {
        pendentesExpiradas(5);
        when(solicitacaoDao.cancelarPorExpiracao(eq(conn), eq(5), anyString())).thenReturn(false);

        LimparSolicitacoes.Resultado r = executar();

        assertEquals(0, r.canceladas);
        verifyNoInteractions(eventosDao);
    }

    @Test
    void falhaNoMongoFazRollbackEContinuaAsOutras() throws Exception {
        pendentesExpiradas(5, 6);
        doThrow(new RuntimeException("mongo caiu")).when(eventosDao)
                .registrarEvento(eq(5), any(), any(), anyInt(), any(), any());

        LimparSolicitacoes.Resultado r = executar();

        assertEquals(1, r.canceladas);
        verify(conn).rollback();
        verify(eventosDao).registrarEvento(eq(6), any(), any(), anyInt(), any(), any());
    }

    @Test
    void repassaOsPrazosParaAsConsultas() throws Exception {
        executar();

        verify(solicitacaoDao).listarPendentesExpiradas(conn, PENDENTE_DIAS);
        verify(solicitacaoDao).listarFinalizadasExpiradas(conn, FINALIZADA_DIAS);
    }

    // ---------- finalizadas antigas ----------

    @Test
    void apagaFinalizadaNaOrdemCerta() throws Exception {
        finalizadasExpiradas(new SolicitacaoParaExcluir(8, MONGO_ID));

        LimparSolicitacoes.Resultado r = executar();

        assertEquals(1, r.apagadas);
        InOrder ordem = inOrder(conteudoDao, armazenamento, eventosDao, solicitacaoDao, conn);
        ordem.verify(conteudoDao).buscarPorId(MONGO_ID);
        ordem.verify(armazenamento).apagar(ARQUIVO_ID);
        ordem.verify(conteudoDao).apagar(MONGO_ID);
        ordem.verify(eventosDao).apagar(8);
        ordem.verify(solicitacaoDao).excluir(conn, 8);
        ordem.verify(conn, atLeastOnce()).commit();
    }

    @Test
    void falhaAoApagarArquivoNaoApagaMaisNadaDaquelaSolicitacao() throws Exception {
        finalizadasExpiradas(new SolicitacaoParaExcluir(8, MONGO_ID));
        doThrow(new ArmazenamentoException("gridfs", new RuntimeException()))
                .when(armazenamento).apagar(ARQUIVO_ID);

        LimparSolicitacoes.Resultado r = executar();

        assertEquals(0, r.apagadas);
        verify(conteudoDao, never()).apagar(any());
        verify(eventosDao, never()).apagar(anyInt());
        verify(solicitacaoDao, never()).excluir(any(), anyInt());
    }

    @Test
    void conteudoJaInexistenteApagaSoEventosELinha() throws Exception {
        finalizadasExpiradas(new SolicitacaoParaExcluir(8, MONGO_ID));
        when(conteudoDao.buscarPorId(MONGO_ID)).thenReturn(Optional.empty());

        LimparSolicitacoes.Resultado r = executar();

        assertEquals(1, r.apagadas);
        verify(armazenamento, never()).apagar(any());
        verify(eventosDao).apagar(8);
        verify(solicitacaoDao).excluir(conn, 8);
    }

    @Test
    void umaFalhaNaoImpedeAsDemaisFinalizadas() throws Exception {
        finalizadasExpiradas(new SolicitacaoParaExcluir(8, MONGO_ID),
                new SolicitacaoParaExcluir(9, "outro-mongo-id"));
        doThrow(new RuntimeException("mongo")).when(eventosDao).apagar(8);

        LimparSolicitacoes.Resultado r = executar();

        assertEquals(1, r.apagadas);
        verify(solicitacaoDao, never()).excluir(conn, 8);
        verify(solicitacaoDao).excluir(conn, 9);
        verify(conn).rollback();
    }

    // ---------- conexão ----------

    @Test
    void conexaoEhFechadaMesmoComFalhaNaConsulta() throws Exception {
        when(solicitacaoDao.listarPendentesExpiradas(eq(conn), anyInt()))
                .thenThrow(new SQLException("x"));

        assertThrows(SQLException.class, this::executar);

        verify(conn).close();
    }
}