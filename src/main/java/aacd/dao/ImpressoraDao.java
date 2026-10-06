package aacd.dao;

import aacd.model.Disponibilidade;
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

    public Impressora buscarPorId(Connection conn, int id) throws SQLException {
        String sql = "SELECT idimpressora, empresa_id, modelo, disponibilidade, ativo "
                + "FROM impressora WHERE idimpressora = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    return null;
                }
                return new Impressora(
                        rs.getInt("idimpressora"),
                        rs.getInt("empresa_id"),
                        rs.getString("modelo"),
                        Disponibilidade.valueOf(rs.getString("disponibilidade")),
                        rs.getBoolean("ativo"));
            }
        }
    }

    public void atualizarAtivo(Connection conn, int id, boolean ativo) throws SQLException {
        String sql = "UPDATE impressora SET ativo = ? WHERE idimpressora = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setBoolean(1, ativo);
            ps.setInt(2, id);
            ps.executeUpdate();
        }
    }

    public void atualizarModelo(Connection conn, int id, String modelo) throws SQLException {
        String sql = "UPDATE impressora SET modelo = ? WHERE idimpressora = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, modelo);
            ps.setInt(2, id);
            ps.executeUpdate();
        }
    }
}