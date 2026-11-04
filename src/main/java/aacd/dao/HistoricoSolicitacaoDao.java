package aacd.dao;

import aacd.model.StatusSolicitacao;
import java.sql.*;

public class HistoricoSolicitacaoDao {

    public void registrar(Connection conn, int solicitacaoId, StatusSolicitacao anterior,
                          StatusSolicitacao novo, Integer usuarioId, String justificativa)
            throws SQLException {
        String sql = "INSERT INTO historico_solicitacao "
                + "(solicitacao_id, status_anterior, status_novo, usuario_id, justificativa) "
                + "VALUES (?, ?, ?, ?, ?)";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, solicitacaoId);
            ps.setString(2, anterior == null ? null : anterior.name());
            ps.setString(3, novo.name());
            ps.setObject(4, usuarioId, Types.INTEGER);
            if (justificativa == null) ps.setNull(5, Types.VARCHAR);
            else ps.setString(5, justificativa);
            ps.executeUpdate();
        }
    }
}