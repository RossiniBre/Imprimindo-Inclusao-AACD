package aacd.dao;

import aacd.config.ConnectionFactory;
import aacd.model.Funcionario;
import aacd.model.FuncionarioResumo;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class FuncionarioDao {

    public int inserir(Connection conn, Funcionario funcionario) throws SQLException {
        String sql = "INSERT INTO funcionario (usuario_id, email, cargo, setor) VALUES (?, ?, ?, ?)";

        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, funcionario.getUsuarioId());
            ps.setString(2, funcionario.getEmail());
            ps.setString(3, funcionario.getCargo());
            ps.setString(4, funcionario.getSetor());
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
        String sql = "SELECT idfuncionario, usuario_id, email, cargo, setor "
                + "FROM funcionario WHERE usuario_id = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, usuarioId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Funcionario(
                            rs.getInt("idfuncionario"),
                            rs.getInt("usuario_id"),
                            rs.getString("email"),
                            rs.getString("cargo"),
                            rs.getString("setor"));
                }
                return null;
            }
        }
    }

    public boolean atualizar(Connection conn, Funcionario funcionario) throws SQLException {
        String sql = "UPDATE funcionario SET email = ?, cargo = ?, setor = ? WHERE usuario_id = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, funcionario.getEmail());
            ps.setString(2, funcionario.getCargo());
            ps.setString(3, funcionario.getSetor());
            ps.setInt(4, funcionario.getUsuarioId());
            return ps.executeUpdate() > 0;
        }
    }

    public List<FuncionarioResumo> listar() throws SQLException {
        String sql = "SELECT u.idusuario, u.nome, u.identificador, u.perfil, u.ativo, "
                + "f.email, f.cargo, f.setor "
                + "FROM funcionario f JOIN usuario u ON u.idusuario = f.usuario_id "
                + "ORDER BY u.nome";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            List<FuncionarioResumo> lista = new ArrayList<>();
            while (rs.next()) {
                lista.add(new FuncionarioResumo(
                        rs.getInt("idusuario"),
                        rs.getString("nome"),
                        rs.getString("identificador"),
                        rs.getString("email"),
                        rs.getString("perfil"),
                        rs.getString("cargo"),
                        rs.getString("setor"),
                        rs.getBoolean("ativo")));
            }
            return lista;
        }
    }
}