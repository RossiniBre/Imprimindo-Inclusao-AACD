package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.ConteudoSolicitacaoDao;
import aacd.dao.SolicitacaoDao;
import aacd.dao.SolicitacaoEventosDao;
import aacd.model.SolicitacaoParaExcluir;
import aacd.model.StatusSolicitacao;
import aacd.storage.ArmazenamentoArquivo;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

public class LimparSolicitacoes {

    public static final int SISTEMA = 0;
    public static final String MOTIVO_EXPIRACAO = "Expirada por falta de resposta";

    private static final Logger LOG = Logger.getLogger(LimparSolicitacoes.class.getName());

    public static final class Resultado {
        public final int canceladas;
        public final int apagadas;

        public Resultado(int canceladas, int apagadas) {
            this.canceladas = canceladas;
            this.apagadas = apagadas;
        }
    }

    private final SolicitacaoDao solicitacaoDao;
    private final SolicitacaoEventosDao eventosDao;
    private final ConteudoSolicitacaoDao conteudoDao;
    private final ArmazenamentoArquivo armazenamento;
    private final CriarSolicitacao.ProvedorConexao conexoes;
    private final ApagadorSolicitacao apagador;

    public LimparSolicitacoes(ConteudoSolicitacaoDao conteudoDao, ArmazenamentoArquivo armazenamento) {
        this(new SolicitacaoDao(), new SolicitacaoEventosDao(), conteudoDao, armazenamento,
                ConnectionFactory::getConnection);
    }

    public LimparSolicitacoes(SolicitacaoDao solicitacaoDao, SolicitacaoEventosDao eventosDao,
                              ConteudoSolicitacaoDao conteudoDao, ArmazenamentoArquivo armazenamento,
                              CriarSolicitacao.ProvedorConexao conexoes) {
        this.solicitacaoDao = solicitacaoDao;
        this.eventosDao = eventosDao;
        this.conteudoDao = conteudoDao;
        this.armazenamento = armazenamento;
        this.conexoes = conexoes;
        this.apagador = new ApagadorSolicitacao(solicitacaoDao, eventosDao, conteudoDao, armazenamento);
    }

    public Resultado executar(int pendenteDias, int finalizadaDias) throws SQLException {
        try (Connection conn = conexoes.abrir()) {
            conn.setAutoCommit(false);
            int canceladas = cancelarPendentes(conn, pendenteDias);
            int apagadas = apagarFinalizadas(conn, finalizadaDias);
            return new Resultado(canceladas, apagadas);
        }
    }

    private int cancelarPendentes(Connection conn, int dias) throws SQLException {
        List<Integer> ids = solicitacaoDao.listarPendentesExpiradas(conn, dias);
        conn.commit();

        int canceladas = 0;
        for (int id : ids) {
            try {
                if (!solicitacaoDao.cancelarPorExpiracao(conn, id, MOTIVO_EXPIRACAO)) {
                    conn.rollback();
                    continue;
                }
                eventosDao.registrarEvento(id, StatusSolicitacao.PENDENTE,
                        StatusSolicitacao.CANCELADA, SISTEMA, MOTIVO_EXPIRACAO, null);
                conn.commit();
                canceladas++;
            } catch (Exception e) {
                desfazer(conn);
                LOG.log(Level.SEVERE, "Falha ao cancelar solicitação expirada " + id, e);
            }
        }
        return canceladas;
    }

    private int apagarFinalizadas(Connection conn, int dias) throws SQLException {
        List<SolicitacaoParaExcluir> lista = solicitacaoDao.listarFinalizadasExpiradas(conn, dias);
        conn.commit();

        int apagadas = 0;
        for (SolicitacaoParaExcluir s : lista) {
            try {
                if (apagador.apagar(conn, s.getId(), s.getMongoId())) {
                    apagadas++;
                }
                conn.commit();
            } catch (Exception e) {
                desfazer(conn);
                LOG.log(Level.SEVERE, "Falha ao apagar solicitação " + s.getId(), e);
            }
        }
        return apagadas;
    }

    private void desfazer(Connection conn) {
        try {
            conn.rollback();
        } catch (SQLException e) {
            LOG.log(Level.WARNING, "Falha no rollback", e);
        }
    }
}