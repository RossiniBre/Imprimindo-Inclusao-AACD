package aacd.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class ExclusaoContaDao {

    public record SolicitacaoApagada(int id, String mongoId) {}

    public Integer buscarEmpresaId(Connection conn, int usuarioId) throws SQLException {
        return buscarId(conn, "SELECT idempresa FROM empresa WHERE usuario_id = ?", usuarioId);
    }

    public Integer buscarFuncionarioId(Connection conn, int usuarioId) throws SQLException {
        return buscarId(conn, "SELECT idfuncionario FROM funcionario WHERE usuario_id = ?", usuarioId);
    }

    public List<SolicitacaoApagada> listarSolicitacoesDaEmpresa(Connection conn, int empresaId) throws SQLException {
        String sql = "SELECT idsolicitacao_impressao, mongo_id FROM solicitacao_impressao WHERE empresa_id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, empresaId);
            try (ResultSet rs = ps.executeQuery()) {
                List<SolicitacaoApagada> lista = new ArrayList<>();
                while (rs.next()) {
                    lista.add(new SolicitacaoApagada(rs.getInt(1), rs.getString(2)));
                }
                return lista;
            }
        }
    }

    public void guardarNomeDoCriador(Connection conn, int funcionarioId, String nome) throws SQLException {
        String sql = "UPDATE solicitacao_impressao SET criado_por_nome = ? WHERE criado_por = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, nome);
            ps.setInt(2, funcionarioId);
            ps.executeUpdate();
        }
    }

    public void anularCanceladoPor(Connection conn, int usuarioId) throws SQLException {
        executar(conn, "UPDATE solicitacao_impressao SET cancelado_por = NULL WHERE cancelado_por = ?", usuarioId);
    }

    public void apagarSolicitacoesDaEmpresa(Connection conn, int empresaId) throws SQLException {
        executar(conn, "DELETE FROM solicitacao_impressao WHERE empresa_id = ?", empresaId);
    }

    public void apagarDoacoesDaEmpresa(Connection conn, int empresaId) throws SQLException {
        executar(conn, "DELETE FROM doacao WHERE empresa_id = ?", empresaId);
    }

    public void apagarImpressorasDaEmpresa(Connection conn, int empresaId) throws SQLException {
        executar(conn, "DELETE FROM impressora WHERE empresa_id = ?", empresaId);
    }

    public void apagarEmpresa(Connection conn, int empresaId) throws SQLException {
        executar(conn, "DELETE FROM empresa WHERE idempresa = ?", empresaId);
    }

    public void apagarFuncionario(Connection conn, int funcionarioId) throws SQLException {
        executar(conn, "DELETE FROM funcionario WHERE idfuncionario = ?", funcionarioId);
    }

    public void apagarUsuario(Connection conn, int usuarioId) throws SQLException {
        executar(conn, "DELETE FROM usuario WHERE idusuario = ?", usuarioId);
    }

    private Integer buscarId(Connection conn, String sql, int parametro) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, parametro);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getInt(1) : null;
            }
        }
    }

    private void executar(Connection conn, String sql, int parametro) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, parametro);
            ps.executeUpdate();
        }
    }

    public void desativarImpressorasDaEmpresa(Connection conn, int empresaId) throws SQLException {
        executar(conn, "UPDATE impressora SET ativo = 0 WHERE empresa_id = ?", empresaId);
    }

    public List<Integer> listarImpressorasDaEmpresa(Connection conn, int empresaId) throws SQLException {
        String sql = "SELECT idimpressora FROM impressora WHERE empresa_id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, empresaId);
            try (ResultSet rs = ps.executeQuery()) {
                List<Integer> ids = new ArrayList<>();
                while (rs.next()) ids.add(rs.getInt(1));
                return ids;
            }
        }
    }
}