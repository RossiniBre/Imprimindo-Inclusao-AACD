package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.ConteudoSolicitacaoDao;
import aacd.dao.SolicitacaoDao;
import aacd.dao.SolicitacaoEventosDao;
import aacd.model.SolicitacaoImpressao;
import aacd.model.Usuario;
import aacd.storage.ArmazenamentoArquivo;
import aacd.storage.ArmazenamentoException;

import java.sql.Connection;
import java.sql.SQLException;

public class ExcluirSolicitacao {

    private final SolicitacaoDao solicitacaoDao;
    private final ApagadorSolicitacao apagador;
    private final CriarSolicitacao.ProvedorConexao conexoes;

    public ExcluirSolicitacao(ConteudoSolicitacaoDao conteudoDao, ArmazenamentoArquivo armazenamento) {
        this(new SolicitacaoDao(),
                new ApagadorSolicitacao(new SolicitacaoDao(), new SolicitacaoEventosDao(),
                        conteudoDao, armazenamento),
                ConnectionFactory::getConnection);
    }

    public ExcluirSolicitacao(SolicitacaoDao solicitacaoDao, ApagadorSolicitacao apagador,
                              CriarSolicitacao.ProvedorConexao conexoes) {
        this.solicitacaoDao = solicitacaoDao;
        this.apagador = apagador;
        this.conexoes = conexoes;
    }

    public void excluir(Usuario ator, int solicitacaoId) throws SQLException, ArmazenamentoException {
        if (ator == null || !ator.isAtivo()
                || (!"ADMIN".equals(ator.getPerfil()) && !"FUNCIONARIO".equals(ator.getPerfil()))) {
            throw new SecurityException("Seu perfil não pode apagar solicitações!");
        }

        try (Connection conn = conexoes.abrir()) {
            conn.setAutoCommit(false);
            try {
                SolicitacaoImpressao s = solicitacaoDao.buscarPorId(conn, solicitacaoId);
                if (s == null) throw new IllegalArgumentException("Solicitação não encontrada!");

                switch (s.getStatus()) {
                    case PENDENTE -> throw new IllegalStateException(
                            "Cancele a solicitação antes de apagar!");
                    case EM_ANDAMENTO -> throw new IllegalStateException(
                            "Solicitação em andamento não pode ser apagada!");
                    default -> { }
                }

                if (!apagador.apagar(conn, solicitacaoId, s.getMongoId())) {
                    throw new IllegalStateException("A solicitação não pôde ser apagada!");
                }
                conn.commit();
            } catch (SQLException | ArmazenamentoException | RuntimeException e) {
                try {
                    conn.rollback();
                } catch (SQLException ignorada) {
                    e.addSuppressed(ignorada);
                }
                throw e;
            }
        }
    }
}