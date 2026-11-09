package aacd.dao;

import aacd.config.ConnectionFactory;
import aacd.model.Empresa;
import aacd.model.EmpresaResumo;
import aacd.model.Endereco;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class EmpresaDao {

    public int inserir(Connection conn, Empresa empresa) throws SQLException {
        String sql = "INSERT INTO empresa (usuario_id, email, responsavel, cnpj, telefone, "
                + "cep, rua, numero, complemento, bairro, cidade, uf) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, empresa.getUsuarioId());
            ps.setString(2, empresa.getEmail());
            ps.setString(3, empresa.getResponsavel());
            ps.setString(4, empresa.getCnpj());
            ps.setString(5, empresa.getTelefone());
            Endereco endereco = empresa.getEndereco();
            ps.setString(6, endereco.getCep());
            ps.setString(7, endereco.getRua());
            ps.setString(8, endereco.getNumero());
            ps.setString(9, endereco.getComplemento());
            ps.setString(10, endereco.getBairro());
            ps.setString(11, endereco.getCidade());
            ps.setString(12, endereco.getUf());

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
        String sql = "SELECT idempresa, usuario_id, email, responsavel, telefone, cnpj, "
                + "cep, rua, numero, complemento, bairro, cidade, uf "
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
                            rs.getString("complemento"),
                            rs.getString("bairro"),
                            rs.getString("cidade"),
                            rs.getString("uf"));

                    return new Empresa(
                            rs.getInt("idempresa"),
                            rs.getInt("usuario_id"),
                            rs.getString("email"),
                            rs.getString("responsavel"),
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
        String sql = "UPDATE empresa SET email = ?, responsavel = ?, telefone = ?, cep = ?, rua = ?, "
                + "numero = ?, complemento = ?, bairro = ?, cidade = ?, uf = ? "
                + "WHERE usuario_id = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, empresa.getEmail());
            ps.setString(2, empresa.getResponsavel());
            ps.setString(3, empresa.getTelefone());
            Endereco endereco = empresa.getEndereco();
            ps.setString(4, endereco.getCep());
            ps.setString(5, endereco.getRua());
            ps.setString(6, endereco.getNumero());
            ps.setString(7, endereco.getComplemento());
            ps.setString(8, endereco.getBairro());
            ps.setString(9, endereco.getCidade());
            ps.setString(10, endereco.getUf());
            ps.setInt(11, empresa.getUsuarioId());
            return ps.executeUpdate() > 0;
        }
    }

    public List<EmpresaResumo> listarAtivas() throws SQLException {
        String sql = "SELECT e.idempresa, u.nome, e.email, e.telefone, "
                + "e.cep, e.rua, e.numero, e.complemento, e.bairro, e.cidade, e.uf "
                + "FROM empresa e JOIN usuario u ON u.idusuario = e.usuario_id "
                + "WHERE u.ativo = TRUE ORDER BY u.nome";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            List<EmpresaResumo> lista = new ArrayList<>();
            while (rs.next()) {
                Endereco endereco = new Endereco(
                        rs.getString("cep"),
                        rs.getString("rua"),
                        rs.getString("numero"),
                        rs.getString("complemento"),
                        rs.getString("bairro"),
                        rs.getString("cidade"),
                        rs.getString("uf"));

                lista.add(new EmpresaResumo(
                        rs.getInt("idempresa"),
                        rs.getString("nome"),
                        rs.getString("email"),
                        rs.getString("telefone"),
                        endereco));
            }
            return lista;
        }
    }

    public boolean existeAtiva(int idEmpresa) throws SQLException {
        String sql = "SELECT 1 FROM empresa e JOIN usuario u ON u.idusuario = e.usuario_id "
                + "WHERE e.idempresa = ? AND u.ativo = TRUE";
        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idEmpresa);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }
}