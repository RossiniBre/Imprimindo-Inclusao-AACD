package aacd.dao;

import aacd.config.ConnectionFactory;
import aacd.model.Empresa;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class EmpresaDao {

    public int inserir(Connection conn, Empresa empresa) throws SQLException {
        String sql = "INSERT INTO empresa (usuario_id, email, cnpj, telefone) VALUES (?, ?, ?, ?)";

        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, empresa.getUsuarioId());
            ps.setString(2, empresa.getEmail());
            ps.setString(3, empresa.getCnpj());
            ps.setString(4, empresa.getTelefone());
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    int id = rs.getInt(1);
                    empresa.setId(id);
                    return id;
                }
            }
            throw new SQLException("Não foi possível obter o id da empresa inserida.");
        }
    }

    public boolean existePorEmail(String email) throws SQLException {
        String sql = "SELECT 1 FROM empresa WHERE email = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, email);

            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    public Empresa buscarPorUsuarioId(int usuarioId) throws SQLException {
        String sql = "SELECT idempresa, usuario_id, email, telefone, cnpj "
                + "FROM empresa WHERE usuario_id = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, usuarioId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Empresa(
                            rs.getInt("idempresa"),
                            rs.getInt("usuario_id"),
                            rs.getString("email"),
                            rs.getString("telefone"),
                            rs.getString("cnpj"));
                }
                return null;
            }
        }
    }

    public boolean existePorEmailExceto(String email, int usuarioId) throws SQLException {
        String sql = "SELECT 1 FROM empresa WHERE email = ? AND usuario_id <> ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, email);
            ps.setInt(2, usuarioId);

            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    public boolean atualizar(Connection conn, Empresa empresa) throws SQLException {
        String sql = "UPDATE empresa SET email = ?, telefone = ? WHERE usuario_id = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, empresa.getEmail());
            ps.setString(2, empresa.getTelefone());
            ps.setInt(3, empresa.getUsuarioId());
            return ps.executeUpdate() > 0;
        }
    }
}