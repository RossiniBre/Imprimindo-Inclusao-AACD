package aacd.service;

import aacd.dao.ConteudoSolicitacaoDao;
import aacd.dao.SolicitacaoDao;
import aacd.dao.SolicitacaoEventosDao;
import aacd.model.ConteudoSolicitacao;
import aacd.storage.ArmazenamentoArquivo;
import aacd.storage.ArmazenamentoException;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Optional;

public class ApagadorSolicitacao {

    private final SolicitacaoDao solicitacaoDao;
    private final SolicitacaoEventosDao eventosDao;
    private final ConteudoSolicitacaoDao conteudoDao;
    private final ArmazenamentoArquivo armazenamento;

    public ApagadorSolicitacao(SolicitacaoDao solicitacaoDao, SolicitacaoEventosDao eventosDao,
                               ConteudoSolicitacaoDao conteudoDao, ArmazenamentoArquivo armazenamento) {
        this.solicitacaoDao = solicitacaoDao;
        this.eventosDao = eventosDao;
        this.conteudoDao = conteudoDao;
        this.armazenamento = armazenamento;
    }

    public boolean apagar(Connection conn, int solicitacaoId, String mongoId)
            throws SQLException, ArmazenamentoException {
        Optional<ConteudoSolicitacao> conteudo = conteudoDao.buscarPorId(mongoId);
        if (conteudo.isPresent()) {
            armazenamento.apagar(conteudo.get().getArquivoId());
            conteudoDao.apagar(mongoId);
        }
        eventosDao.apagar(solicitacaoId);
        return solicitacaoDao.excluir(conn, solicitacaoId);
    }
}