package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.EmpresaDao;
import aacd.dao.ImpressoraDao;
import aacd.model.Empresa;
import aacd.model.Impressora;
import aacd.model.Usuario;

import java.sql.Connection;
import java.sql.SQLException;

public class CadastrarImpressora {

    private final EmpresaDao empresaDao = new EmpresaDao();
    private final ImpressoraDao impressoraDao = new ImpressoraDao();

    public int executar(Usuario ator, String modelo) throws SQLException {
        if (ator == null || !"EMPRESA".equals(ator.getPerfil()) || !ator.isAtivo()) {
            throw new IllegalStateException("Apenas empresas podem cadastrar impressoras!");
        }

        Empresa empresa = empresaDao.buscarPorUsuarioId(ator.getId());
        if (empresa == null) {
            throw new IllegalStateException("Empresa não encontrada!");
        }

        Impressora impressora = new Impressora(empresa.getId(), modelo);

        try (Connection conn = ConnectionFactory.getConnection()) {
            return impressoraDao.inserir(conn, impressora);
        }
    }
}