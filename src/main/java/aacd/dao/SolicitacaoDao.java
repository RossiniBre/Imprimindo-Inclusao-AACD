package aacd.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class SolicitacaoDao {

    public boolean existeAbertaPorImpressora(Connection conn, int impressoraId) throws SQLException {
        String sql = "SELECT 1 FROM solicitacao_impressao "
                + "WHERE impressora_id = ? AND status IN ('PENDENTE', 'EM_ANDAMENTO') LIMIT 1";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, impressoraId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }
}