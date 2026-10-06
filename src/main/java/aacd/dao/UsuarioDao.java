package aacd.dao;

import aacd.config.ConnectionFactory;
import aacd.model.Usuario;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class UsuarioDao {

    public int inserir(Usuario usuario) throws SQLException {
        try (Connection conn = ConnectionFactory.getConnection()) {
            return inserir(conn, usuario);
        }
    }

    public int inserir(Connection conn, Usuario usuario) throws SQLException {
        String sql = "INSERT INTO usuario (nome, identificador, senha_hash, perfil, ativo) "
                + "VALUES (?, ?, ?, ?, ?)";

        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, usuario.getNome());
            ps.setString(2, usuario.getIdentificador());
            ps.setString(3, usuario.getSenhaHash());
            ps.setString(4, usuario.getPerfil());
            ps.setBoolean(5, usuario.isAtivo());
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    int id = rs.getInt(1);
                    usuario.setId(id);
                    return id;
                }
            }
            throw new SQLException("Não foi possível obter o id do usuário inserido.");
        }
    }

    public Usuario buscarPorIdentificador(String identificador) throws SQLException {
        String sql = "SELECT idusuario, nome, identificador, senha_hash, perfil, ativo "
                + "FROM usuario WHERE identificador = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, identificador);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Usuario(
                            rs.getInt("idusuario"),
                            rs.getString("nome"),
                            rs.getString("identificador"),
                            rs.getString("senha_hash"),
                            rs.getString("perfil"),
                            rs.getBoolean("ativo"));
                }
                return null;
            }
        }
    }

    public Usuario buscarPorId(int id) throws SQLException {
        String sql = "SELECT idusuario, nome, identificador, senha_hash, perfil, ativo "
                + "FROM usuario WHERE idusuario = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, id);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Usuario(
                            rs.getInt("idusuario"),
                            rs.getString("nome"),
                            rs.getString("identificador"),
                            rs.getString("senha_hash"),
                            rs.getString("perfil"),
                            rs.getBoolean("ativo"));
                }
                return null;
            }
        }
    }

    public void atualizarAtivo(int id, boolean ativo) throws SQLException {
        String sql = "UPDATE usuario SET ativo = ? WHERE idusuario = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setBoolean(1, ativo);
            ps.setInt(2, id);
            ps.executeUpdate();
        }
    }

    public void excluir(int id) throws SQLException {
        try (Connection conn = ConnectionFactory.getConnection()) {
            conn.setAutoCommit(false);
            try {
                apagar(conn, "DELETE FROM funcionario WHERE usuario_id = ?", id);
                apagar(conn, "DELETE FROM empresa WHERE usuario_id = ?", id);
                apagar(conn, "DELETE FROM usuario WHERE idusuario = ?", id);
                conn.commit();
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            }
        }
    }

    private void apagar(Connection conn, String sql, int id) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }

    public boolean atualizarNome(Connection conn, int id, String nome) throws SQLException {
        String sql = "UPDATE usuario SET nome = ? WHERE id = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)){
            ps.setString(1, nome);
            ps.setInt(2, id);
            return ps.executeUpdate() > 0;
        }
    }

    public boolean existePorIdentificadorExceto(String identificador, int usuarioId) throws SQLException {
        String sql = "SELECT 1 FROM usuario WHERE identificador = ? AND id <> ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, identificador);
            ps.setInt(2, usuarioId);

            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    public boolean atualizarIdentificador(Connection conn, int id, String identificador) throws SQLException {
        String sql = "UPDATE usuario SET identificador = ? WHERE id = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, identificador);
            ps.setInt(2, id);
            return ps.executeUpdate() > 0;
        }
    }
}