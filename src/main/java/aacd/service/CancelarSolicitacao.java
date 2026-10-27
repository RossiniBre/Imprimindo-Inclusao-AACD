package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.SolicitacaoDao;
import aacd.dao.SolicitacaoEventosDao;
import aacd.model.Solicitacao;
import aacd.model.StatusSolicitacao;
import aacd.model.Usuario;

import java.sql.Connection;
import java.sql.SQLException;

public class CancelarSolicitacao {

    private static final int MAX_JUSTIFICATIVA = 500;

    private final SolicitacaoDao solicitacaoDao;
    private final SolicitacaoEventosDao eventosDao;
    private final CriarSolicitacao.ProvedorConexao conexoes;

    public CancelarSolicitacao() {
        this(new SolicitacaoDao(), new SolicitacaoEventosDao(), ConnectionFactory::getConnection);
    }

    public CancelarSolicitacao(SolicitacaoDao solicitacaoDao, SolicitacaoEventosDao eventosDao,
                               CriarSolicitacao.ProvedorConexao conexoes) {
        this.solicitacaoDao = solicitacaoDao;
        this.eventosDao = eventosDao;
        this.conexoes = conexoes;
    }

    public void cancelar(Usuario ator, int solicitacaoId, String justificativa) throws SQLException {
        if (ator == null || !ator.isAtivo()
                || (!"ADMIN".equals(ator.getPerfil()) && !"FUNCIONARIO".equals(ator.getPerfil()))) {
            throw new SecurityException("Seu perfil não pode cancelar solicitações!");
        }
        boolean admin = "ADMIN".equals(ator.getPerfil());
        String motivo = lerJustificativa(justificativa);

        try (Connection conn = conexoes.abrir()) {
            conn.setAutoCommit(false);
            try {
                Solicitacao s = solicitacaoDao.buscarSolicitacaoPorId(conn, solicitacaoId);
                if (s == null) throw new IllegalArgumentException("Solicitação não encontrada!");

                StatusSolicitacao atual = s.getStatus();
                switch (atual) {
                    case PENDENTE -> { }
                    case EM_ANDAMENTO -> {
                        if (!admin) throw new SecurityException(
                                "Só o admin cancela solicitação em andamento!");
                        if (motivo == null) throw new IllegalArgumentException(
                                "Informe a justificativa para cancelar!");
                    }
                    default -> throw new IllegalStateException(
                            "Esta solicitação não pode mais ser cancelada!");
                }

                if (!solicitacaoDao.cancelar(conn, solicitacaoId, atual, motivo, ator.getId())) {
                    throw new IllegalStateException("O status da solicitação mudou. Tente novamente!");
                }

                eventosDao.registrarEvento(solicitacaoId, atual, StatusSolicitacao.CANCELADA,
                        ator.getId(), motivo != null ? motivo : "Cancelada pelo funcionário", null);
                conn.commit();
            } catch (SQLException | RuntimeException e) {
                try {
                    conn.rollback();
                } catch (SQLException ignorada) {
                    e.addSuppressed(ignorada);
                }
                throw e;
            }
        }
    }

    private String lerJustificativa(String texto) {
        if (texto == null || texto.isBlank()) return null;
        String valor = texto.trim();
        if (valor.length() > MAX_JUSTIFICATIVA) {
            throw new IllegalArgumentException(
                    "Justificativa deve ter no máximo " + MAX_JUSTIFICATIVA + " caracteres!");
        }
        return valor;
    }
}