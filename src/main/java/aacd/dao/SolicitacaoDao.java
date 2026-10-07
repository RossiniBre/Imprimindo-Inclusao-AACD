package aacd.dao;

import aacd.model.SolicitacaoImpressao;
import aacd.model.StatusSolicitacao;

import java.sql.*;

public class SolicitacaoDao {

    public boolean existeAbertaPorImpressora(Connection conn, int impressoraId) throws SQLException {
        String sql = "SELECT 1 FROM solicitacao_impressao "
                + "WHERE impressora_id = ? AND status IN ('PENDENTE', 'EM_ANDAMENTO') LIMIT 1";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, impressoraId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    public int inserir(Connection conn, SolicitacaoImpressao solicitacao) throws SQLException {
        String sql = "INSERT INTO solicitacao_impressao"
                + "(empresa_id, criado_por, impressora_id, titulo, mongo_id, status) "
                + "VALUES (?, ?, ?, ?, ?, ?)";

        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, solicitacao.getEmpresaId());
            ps.setInt(2, solicitacao.getCriadoPor());
            ps.setObject(3, solicitacao.getImpressoraId(), Types.INTEGER);
            ps.setString(4, solicitacao.getTitulo());
            ps.setString(5, solicitacao.getMongoId());
            ps.setString(6, solicitacao.getStatus().name());
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    int id = rs.getInt(1);
                    solicitacao.setSolicitacaoId(id);
                    return id;
                }
            }
            throw new SQLException("Não foi possível obter o id da solicitação inserida.");
        }
    }

    public SolicitacaoImpressao buscarPorId(Connection conn, int id) throws SQLException {
        String sql = "SELECT idsolicitacao_impressao, empresa_id, criado_por, impressora_id, "
                + "titulo, mongo_id, status, justificativa, cancelado_por, "
                + "data_criacao, data_decisao, data_finalizacao "
                + "FROM solicitacao_impressao WHERE idsolicitacao_impressao = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    return null;
                }
                return new SolicitacaoImpressao(
                        rs.getInt("idsolicitacao_impressao"),
                        rs.getInt("empresa_id"),
                        rs.getInt("criado_por"),
                        rs.getObject("impressora_id", Integer.class),
                        rs.getString("titulo"),
                        rs.getString("mongo_id"),
                        StatusSolicitacao.valueOf(rs.getString("status")),
                        rs.getString("justificativa"),
                        rs.getObject("cancelado_por", Integer.class),
                        rs.getTimestamp("data_criacao"),
                        rs.getTimestamp("data_decisao"),
                        rs.getTimestamp("data_finalizacao"));
            }
        }
    }
}