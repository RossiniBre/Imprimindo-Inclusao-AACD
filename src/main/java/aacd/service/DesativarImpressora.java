package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.EmpresaDao;
import aacd.dao.ImpressoraDao;
import aacd.model.Impressora;
import aacd.model.Usuario;

import java.sql.Connection;
import java.sql.SQLException;

public class DesativarImpressora {

    private final EmpresaDao empresaDao = new EmpresaDao();
    private final ImpressoraDao impressoraDao = new ImpressoraDao();
    private final PermissaoImpressora permissao = new PermissaoImpressora();

    public void executar(Usuario ator, int impressoraId) throws SQLException {
        if (ator == null || !ator.isAtivo()) {
            throw new IllegalStateException("Usuário inválido!");
        }

        try (Connection conn = ConnectionFactory.getConnection()) {
            Impressora impressora = impressoraDao.buscarPorId(conn, impressoraId);
            if (impressora == null) {
                throw new IllegalStateException("Impressora não encontrada!");
            }

            permissao.validar(ator, impressora);

            if (!impressora.isAtivo()) {
                throw new IllegalStateException("Impressora já está desativada!");
            }

            impressoraDao.atualizarAtivo(conn, impressoraId, false);
        }
    }
}