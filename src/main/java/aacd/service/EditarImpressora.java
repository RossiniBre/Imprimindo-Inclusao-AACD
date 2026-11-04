package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.ImpressoraDao;
import aacd.dao.ImpressoraMateriaisDao;
import aacd.model.Impressora;
import aacd.model.Material;
import aacd.model.Usuario;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Set;

public class EditarImpressora {

    private final ImpressoraDao impressoraDao = new ImpressoraDao();
    private final PermissaoImpressora permissao = new PermissaoImpressora();
    private final ImpressoraMateriaisDao materiaisDao = new ImpressoraMateriaisDao();

    public void executar(Usuario ator, int impressoraId, String modelo, Set<Material> materiais)
            throws SQLException {
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

            impressora.setModelo(modelo);
            if (materiais != null) {
                impressora.setMateriais(materiais);   // recusa vazio, mesma regra do cadastro
            }
            impressoraDao.atualizarModelo(conn, impressoraId, impressora.getModelo());

            if (materiais != null) {
                materiaisDao.salvar(impressoraId, impressora.getMateriais());
            }
        }
    }
}
