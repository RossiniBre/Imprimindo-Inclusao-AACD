package aacd.dao;

import aacd.model.Impressora;

import java.sql.*;

public class ImpressoraDao {

    public int inserir(Connection conn, Impressora impressora) throws SQLException {
        String sql = "INSERT INTO impressora(empresa_id, modelo, disponibilidade, ativo) VALUES (?, ?, ?, ?)";

        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, impressora.getEmpresaId());
            ps.setString(2, impressora.getModelo());
            ps.setString(3, impressora.getDisponibilidade().name());
            ps.setBoolean(4, impressora.isAtivo());
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    int id = rs.getInt(1);
                    impressora.setId(id);
                    return id;
                }
            }
            throw new SQLException("Não foi possível obter o id da impressora inserida.");
        }
    }
}
