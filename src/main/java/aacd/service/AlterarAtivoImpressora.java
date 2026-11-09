package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.ImpressoraDao;
import aacd.dao.SolicitacaoAtivaDao;
import aacd.model.Impressora;
import aacd.model.Usuario;

import java.sql.Connection;
import java.sql.SQLException;

public class AlterarAtivoImpressora {

    private final ImpressoraDao impressoraDao = new ImpressoraDao();
    private final PermissaoImpressora permissao = new PermissaoImpressora();
    private final SolicitacaoAtivaDao solicitacaoDao = new SolicitacaoAtivaDao();

    public void executar(Usuario ator, int impressoraId, boolean ativo) throws SQLException {
        if (ator == null || !ator.isAtivo()) {
            throw new IllegalStateException("Usuário inválido!");
        }

        try (Connection conn = ConnectionFactory.getConnection()) {
            Impressora impressora = impressoraDao.buscarPorId(conn, impressoraId);
            if (impressora == null) {
                throw new IllegalStateException("Impressora não encontrada!");
            }

            try {
                permissao.validar(ator, impressora);
            } catch (IllegalStateException e) {
                throw new IllegalStateException("Impressora não encontrada!");
            }

            if (impressora.isAtivo() == ativo) {
                return;
            }

            if (!ativo && solicitacaoDao.existeAtivo(conn, impressoraId)) {
                throw new IllegalStateException(
                        "Impressora com impressão em andamento não pode ser desativada.");
            }

            impressoraDao.atualizarAtivo(conn, impressoraId, ativo);
        }
    }
}