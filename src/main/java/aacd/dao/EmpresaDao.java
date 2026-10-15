package aacd.dao;

import aacd.config.ConnectionFactory;
import aacd.model.Empresa;
import aacd.model.Endereco;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class EmpresaDao {

    public int inserir(Connection conn, Empresa empresa) throws SQLException {
        String sql = "INSERT INTO empresa (usuario_id, email, cnpj, telefone, cep, rua, numero, bairro, cidade, uf) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, empresa.getUsuarioId());
            ps.setString(2, empresa.getEmail());
            ps.setString(3, empresa.getCnpj());
            ps.setString(4, empresa.getTelefone());
            Endereco endereco = empresa.getEndereco();
            ps.setString(5, endereco.getCep());
            ps.setString(6, endereco.getRua());
            ps.setString(7, endereco.getNumero());
            ps.setString(8, endereco.getBairro());
            ps.setString(9, endereco.getCidade());
            ps.setString(10, endereco.getUf());
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
        String sql = "SELECT idempresa, usuario_id, email, telefone, cnpj, cep, rua, numero, bairro, cidade, uf "
                + "FROM empresa WHERE usuario_id = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, usuarioId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Endereco endereco = new Endereco(
                            rs.getString("cep"),
                            rs.getString("rua"),
                            rs.getString("numero"),
                            rs.getString("bairro"),
                            rs.getString("cidade"),
                            rs.getString("uf"));

                    return new Empresa(
                            rs.getInt("idempresa"),
                            rs.getInt("usuario_id"),
                            rs.getString("email"),
                            rs.getString("telefone"),
                            rs.getString("cnpj"),
                            endereco);
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
        String sql = "UPDATE empresa SET email = ?, telefone = ?, cep = ?, rua = ?, numero = ?, bairro = ?, cidade = ?, uf = ? "
                + "WHERE usuario_id = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, empresa.getEmail());
            ps.setString(2, empresa.getTelefone());
            Endereco endereco = empresa.getEndereco();
            ps.setString(3, endereco.getCep());
            ps.setString(4, endereco.getRua());
            ps.setString(5, endereco.getNumero());
            ps.setString(6, endereco.getBairro());
            ps.setString(7, endereco.getCidade());
            ps.setString(8, endereco.getUf());
            ps.setInt(9, empresa.getUsuarioId());
            return ps.executeUpdate() > 0;
        }
    }
}