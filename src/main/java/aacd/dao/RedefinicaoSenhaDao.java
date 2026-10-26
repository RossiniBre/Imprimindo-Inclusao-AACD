package aacd.dao;

import aacd.config.ConnectionFactory;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class RedefinicaoSenhaDao {

    public void salvar(int usuarioId, String codigoHash, int minutosValidade) throws SQLException {
        String sql = "INSERT INTO redefinicao_senha (usuario_id, codigo_hash, expira_em, criado_em, tentativas, usado) "
                + "VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW(), 0, FALSE) "
                + "ON DUPLICATE KEY UPDATE codigo_hash = VALUES(codigo_hash), "
                + "expira_em = VALUES(expira_em), criado_em = VALUES(criado_em), "
                + "tentativas = 0, usado = FALSE";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, usuarioId);
            ps.setString(2, codigoHash);
            ps.setInt(3, minutosValidade);
            ps.executeUpdate();
        }
    }

    public boolean pedidoRecente(int usuarioId, int segundos) throws SQLException {
        String sql = "SELECT 1 FROM redefinicao_senha "
                + "WHERE usuario_id = ? AND criado_em > DATE_SUB(NOW(), INTERVAL ? SECOND)";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, usuarioId);
            ps.setInt(2, segundos);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    public boolean registrarTentativa(int usuarioId, int maxTentativas) throws SQLException {
        String sql = "UPDATE redefinicao_senha SET tentativas = tentativas + 1 "
                + "WHERE usuario_id = ? AND usado = FALSE AND expira_em > NOW() AND tentativas < ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, usuarioId);
            ps.setInt(2, maxTentativas);
            return ps.executeUpdate() > 0;
        }
    }

    public String buscarHashValido(int usuarioId) throws SQLException {
        String sql = "SELECT codigo_hash FROM redefinicao_senha "
                + "WHERE usuario_id = ? AND usado = FALSE AND expira_em > NOW()";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, usuarioId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString("codigo_hash") : null;
            }
        }
    }

    public boolean marcarUsado(Connection conn, int usuarioId) throws SQLException {
        String sql = "UPDATE redefinicao_senha SET usado = TRUE WHERE usuario_id = ? AND usado = FALSE";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, usuarioId);
            return ps.executeUpdate() > 0;
        }
    }
}