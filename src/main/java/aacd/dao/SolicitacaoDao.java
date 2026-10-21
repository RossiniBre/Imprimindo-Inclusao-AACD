package aacd.dao;

import aacd.config.ConnectionFactory;
import aacd.model.Solicitacao;
import aacd.model.SolicitacaoImpressao;
import aacd.model.SolicitacaoParaExcluir;
import aacd.model.StatusSolicitacao;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class SolicitacaoDao {

    public Solicitacao buscarSolicitacaoPorId(Connection conn, int id) throws SQLException {
    String sql = "SELECT idsolicitacao_impressao, empresa_id, impressora_id, titulo, "
            + "status, justificativa "
            + "FROM solicitacao_impressao WHERE idsolicitacao_impressao = ?";

    try (PreparedStatement ps = conn.prepareStatement(sql)) {
        ps.setInt(1, id);
        try (ResultSet rs = ps.executeQuery()) {
            if (!rs.next()) return null;

            int impId = rs.getInt("impressora_id");
            Integer impressoraId = rs.wasNull() ? null : impId;

            return new Solicitacao(
                    rs.getInt("idsolicitacao_impressao"),
                    rs.getInt("empresa_id"),
                    impressoraId,
                    rs.getString("titulo"),
                    StatusSolicitacao.valueOf(rs.getString("status")),
                    rs.getString("justificativa"));
        }
    }
}
public boolean responder(Connection conn, int id, StatusSolicitacao novoStatus,
                         String justificativa) throws SQLException {
    String sql = "UPDATE solicitacao_impressao "
            + "SET status = ?, justificativa = ?, data_decisao = NOW() "
            + "WHERE idsolicitacao_impressao = ? AND status = 'PENDENTE'";

    try (PreparedStatement ps = conn.prepareStatement(sql)) {
        ps.setString(1, novoStatus.name());
        if (justificativa == null) ps.setNull(2, Types.VARCHAR);
        else ps.setString(2, justificativa);
        ps.setInt(3, id);
        return ps.executeUpdate() > 0;
    }
}

public Solicitacao buscarPorId(int id) throws SQLException {
    try (Connection conn = ConnectionFactory.getConnection()) {
        return buscarSolicitacaoPorId(conn, id);
    }
}


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
                + "data_criacao, data_decisao, data_finalizacao, criado_por_nome "
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
                        rs.getTimestamp("data_finalizacao"),
                        rs.getString("criado_por_nome"));
            }
        }
    }

    public boolean cancelar(Connection conn, int id, StatusSolicitacao statusEsperado,
                            String justificativa, int canceladoPor) throws SQLException {
        String sql = "UPDATE solicitacao_impressao "
                + "SET status = 'CANCELADA', justificativa = ?, cancelado_por = ?, "
                + "data_finalizacao = NOW() "
                + "WHERE idsolicitacao_impressao = ? AND status = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            if (justificativa == null) ps.setNull(1, Types.VARCHAR);
            else ps.setString(1, justificativa);
            ps.setInt(2, canceladoPor);
            ps.setInt(3, id);
            ps.setString(4, statusEsperado.name());
            return ps.executeUpdate() > 0;
        }
    }

    public List<Integer> listarPendentesExpiradas(Connection conn, int dias) throws SQLException {
        String sql = "SELECT idsolicitacao_impressao FROM solicitacao_impressao "
                + "WHERE status = 'PENDENTE' AND data_criacao < NOW() - INTERVAL ? DAY";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, dias);
            try (ResultSet rs = ps.executeQuery()) {
                List<Integer> ids = new ArrayList<>();
                while (rs.next()) ids.add(rs.getInt(1));
                return ids;
            }
        }
    }

    public boolean cancelarPorExpiracao(Connection conn, int id, String motivo) throws SQLException {
        String sql = "UPDATE solicitacao_impressao "
                + "SET status = 'CANCELADA', justificativa = ?, cancelado_por = NULL, "
                + "data_finalizacao = NOW() "
                + "WHERE idsolicitacao_impressao = ? AND status = 'PENDENTE'";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, motivo);
            ps.setInt(2, id);
            return ps.executeUpdate() > 0;
        }
    }

    public List<SolicitacaoParaExcluir> listarFinalizadasExpiradas(Connection conn, int dias)
            throws SQLException {
        String sql = "SELECT idsolicitacao_impressao, mongo_id FROM solicitacao_impressao "
                + "WHERE (status = 'RECUSADA' AND data_decisao < NOW() - INTERVAL ? DAY) "
                + "OR (status IN ('CANCELADA','CONCLUIDA','FALHOU') "
                + "AND data_finalizacao < NOW() - INTERVAL ? DAY)";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, dias);
            ps.setInt(2, dias);
            try (ResultSet rs = ps.executeQuery()) {
                List<SolicitacaoParaExcluir> lista = new ArrayList<>();
                while (rs.next()) {
                    lista.add(new SolicitacaoParaExcluir(rs.getInt(1), rs.getString(2)));
                }
                return lista;
            }
        }
    }

    public boolean excluir(Connection conn, int id) throws SQLException {
        String sql = "DELETE FROM solicitacao_impressao "
                + "WHERE idsolicitacao_impressao = ? "
                + "AND status IN ('RECUSADA','CANCELADA','CONCLUIDA','FALHOU')";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        }
    }
}