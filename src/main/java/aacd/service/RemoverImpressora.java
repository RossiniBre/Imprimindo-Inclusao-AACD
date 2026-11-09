package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.ImpressoraDao;
import aacd.dao.ImpressoraMateriaisDao;
import aacd.dao.SolicitacaoAtivaDao;
import aacd.model.Impressora;
import aacd.model.Usuario;

import java.sql.Connection;
import java.sql.SQLException;

public class RemoverImpressora {

    private final ImpressoraDao impressoraDao = new ImpressoraDao();
    private final ImpressoraMateriaisDao materiaisDao = new ImpressoraMateriaisDao();
    private final PermissaoImpressora permissao = new PermissaoImpressora();
    private final SolicitacaoAtivaDao solicitacaoDao = new SolicitacaoAtivaDao();

    public void executar(Usuario ator, int impressoraId) throws SQLException {
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

            if (solicitacaoDao.existeAtivo(conn, impressoraId)) {
                throw new IllegalStateException(
                        "Impressora com impressão em andamento não pode ser removida.");
            }

            impressoraDao.apagar(conn, impressoraId);
            materiaisDao.apagar(impressoraId);
        }
    }
}