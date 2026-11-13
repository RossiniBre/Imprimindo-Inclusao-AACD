package aacd.bdd.steps;

import aacd.config.ConnectionFactory;
import aacd.dao.ImpressoraDao;
import aacd.dao.SolicitacaoDao;
import aacd.dao.SolicitacaoEventosDao;
import aacd.model.Impressora;
import aacd.model.Solicitacao;
import aacd.model.StatusSolicitacao;
import aacd.model.Usuario;
import aacd.service.PermissaoImpressora;
import aacd.service.ResponderSolicitacao;
import io.cucumber.java.After;
import io.cucumber.java.pt.Dado;
import io.cucumber.java.pt.Quando;
import io.cucumber.java.pt.Então;
import org.mockito.MockedStatic;

import java.sql.Connection;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class RespostaSolicitacaoSteps {

    private static final int SOLICITACAO_ID = 10;
    private static final int IMPRESSORA_ID = 5;
    private static final int ATOR_ID = 7;
    private static final String JUSTIFICATIVA = "Sem filamento disponível no momento";

    private final SolicitacaoDao solicitacaoDao = mock(SolicitacaoDao.class);
    private final SolicitacaoEventosDao eventosDao = mock(SolicitacaoEventosDao.class);
    private final ImpressoraDao impressoraDao = mock(ImpressoraDao.class);
    private final PermissaoImpressora permissao = mock(PermissaoImpressora.class);
    private final Connection conn = mock(Connection.class);
    private final Usuario empresa = mock(Usuario.class);
    private final Solicitacao solicitacao = mock(Solicitacao.class);
    private final Impressora impressora = mock(Impressora.class);

    private MockedStatic<ConnectionFactory> fabrica;
    private ResponderSolicitacao service;
    private Exception erro;

    @Dado("uma solicitação pendente para a empresa")
    public void solicitacaoPendente() throws Exception {
        // O mock estático só é aberto aqui, então os cenários de login não são afetados
        fabrica = mockStatic(ConnectionFactory.class);
        fabrica.when(ConnectionFactory::getConnection).thenReturn(conn);

        when(empresa.getPerfil()).thenReturn("EMPRESA");
        when(empresa.isAtivo()).thenReturn(true);
        when(empresa.getId()).thenReturn(ATOR_ID);

        when(solicitacao.getStatus()).thenReturn(StatusSolicitacao.PENDENTE);
        when(solicitacao.getImpressoraId()).thenReturn(IMPRESSORA_ID);

        when(solicitacaoDao.buscarSolicitacaoPorId(conn, SOLICITACAO_ID)).thenReturn(solicitacao);
        when(impressoraDao.buscarPorId(conn, IMPRESSORA_ID)).thenReturn(impressora);
        when(solicitacaoDao.responder(eq(conn), eq(SOLICITACAO_ID), any(), any())).thenReturn(true);

        service = new ResponderSolicitacao(solicitacaoDao, eventosDao, impressoraDao, permissao);
    }

    @Quando("a empresa tenta recusar sem informar justificativa")
    public void recusarSemJustificativa() throws Exception {
        try {
            service.recusar(empresa, SOLICITACAO_ID, "   ");
        } catch (IllegalArgumentException e) {
            erro = e;
        }
    }

    @Quando("a empresa recusa informando uma justificativa")
    public void recusarComJustificativa() throws Exception {
        try {
            service.recusar(empresa, SOLICITACAO_ID, JUSTIFICATIVA);
        } catch (IllegalArgumentException e) {
            erro = e;
        }
    }

    @Então("a recusa é rejeitada")
    public void recusaRejeitada() {
        assertNotNull(erro);
        assertEquals("Informe a justificativa para recusar!", erro.getMessage());
    }

    @Então("a solicitação continua pendente")
    public void continuaPendente() throws Exception {
        fabrica.verify(ConnectionFactory::getConnection, never());
        verify(solicitacaoDao, never()).responder(any(), anyInt(), any(), any());
        verifyNoInteractions(eventosDao);
    }

    @Então("a solicitação passa para o status recusada")
    public void statusRecusada() throws Exception {
        assertNull(erro);
        verify(solicitacaoDao).responder(conn, SOLICITACAO_ID, StatusSolicitacao.RECUSADA, JUSTIFICATIVA);
        verify(conn).commit();
        verify(conn, never()).rollback();
    }

    @Então("a justificativa fica registrada")
    public void justificativaRegistrada() throws Exception {
        verify(solicitacaoDao).responder(conn, SOLICITACAO_ID, StatusSolicitacao.RECUSADA, JUSTIFICATIVA);
        verify(eventosDao).registrarEvento(eq(SOLICITACAO_ID), eq(StatusSolicitacao.PENDENTE),
                eq(StatusSolicitacao.RECUSADA), eq(ATOR_ID), eq(JUSTIFICATIVA), isNull());
    }

    @After
    public void fecharMockEstatico() {
        if (fabrica != null) {
            fabrica.close();
        }
    }
}