package aacd.dao;

import aacd.config.ConnectionFactory;
import aacd.model.Funcionario;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class FuncionarioDao {

    public int inserir(Connection conn, Funcionario funcionario) throws SQLException {
        String sql = "INSERT INTO funcionario (usuario_id, cargo, setor) VALUES (?, ?, ?)";

        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, funcionario.getUsuarioId());
            ps.setString(2, funcionario.getCargo());
            ps.setString(3, funcionario.getSetor());
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    int id = rs.getInt(1);
                    funcionario.setId(id);
                    return id;
                }
            }
            throw new SQLException("Não foi possível obter o id do funcionário inserido.");
        }
    }

    public Funcionario buscarPorUsuarioId(int usuarioId) throws SQLException {
        String sql = "SELECT idfuncionario, usuario_id, cargo, setor "
                + "FROM funcionario WHERE usuario_id = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, usuarioId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Funcionario(
                            rs.getInt("idfuncionario"),
                            rs.getInt("usuario_id"),
                            rs.getString("cargo"),
                            rs.getString("setor"));
                }
                return null;
            }
        }
    }

    public boolean atualizar(Connection conn, Funcionario funcionario) throws SQLException {
        String sql = "UPDATE funcionario SET cargo = ?, setor = ? WHERE usuario_id = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, funcionario.getCargo());
            ps.setString(2, funcionario.getSetor());
            ps.setInt(3, funcionario.getUsuarioId());
            return ps.executeUpdate() > 0;
        }
    }
}