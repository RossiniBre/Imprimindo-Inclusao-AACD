package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.EmpresaDao;
import aacd.dao.SolicitacaoDao;
import aacd.model.Empresa;
import aacd.model.SolicitacaoImpressao;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Optional;

public class SolicitacaoDaEmpresa {
    private final EmpresaDao empresaDao = new EmpresaDao();
    private final SolicitacaoDao solicitacaoDao = new SolicitacaoDao();

    public Optional<SolicitacaoImpressao> buscar(int usuarioId, int solicitacaoId) throws SQLException {
        Empresa empresa = empresaDao.buscarPorUsuarioId(usuarioId);
        if (empresa == null) return Optional.empty();

        try (Connection conn = ConnectionFactory.getConnection()) {
            SolicitacaoImpressao s = solicitacaoDao.buscarPorId(conn, solicitacaoId);
            if (s == null || s.getEmpresaId() != empresa.getId()) return Optional.empty();
            return Optional.of(s);
        }
    }
}