package aacd.service;

import aacd.dao.EmpresaDao;
import aacd.model.Empresa;
import aacd.model.Impressora;
import aacd.model.Usuario;

import java.sql.SQLException;

public class PermissaoImpressora {

    private final EmpresaDao empresaDao = new EmpresaDao();

    public void validar(Usuario ator, Impressora impressora) throws SQLException {
        if ("ADMIN".equals(ator.getPerfil())) {
            return;
        }
        if ("EMPRESA".equals(ator.getPerfil())) {
            Empresa empresa = empresaDao.buscarPorUsuarioId(ator.getId());
            if (empresa != null && empresa.getId() == impressora.getEmpresaId()) {
                return;
            }
        }
        throw new IllegalStateException("Sem permissão para alterar esta impressora!");
    }
}
