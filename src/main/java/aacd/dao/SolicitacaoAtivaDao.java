package aacd.dao;

import aacd.config.ConnectionFactory;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SolicitacaoAtivaDao {
    
    private static final List<String> STATUS_ATIVOS = List.of("EM_ANDAMENTO");

    public record PedidoAtivo(int id, int impressoraId, String titulo, String solicitante) {}

    public Map<Integer, List<PedidoAtivo>> buscarPorImpressoras(Collection<Integer> ids)
            throws SQLException {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }

        String sql = "SELECT idsolicitacao_impressao, impressora_id, titulo, criado_por_nome "
                + "FROM solicitacao_impressao "
                + "WHERE status IN (" + marcadores(STATUS_ATIVOS.size()) + ") "
                + "AND impressora_id IN (" + marcadores(ids.size()) + ") "
                + "ORDER BY data_criacao, idsolicitacao_impressao";

        Map<Integer, List<PedidoAtivo>> mapa = new HashMap<>();
        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            int n = 1;
            for (String status : STATUS_ATIVOS) ps.setString(n++, status);
            for (Integer id : ids) ps.setInt(n++, id);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int impressoraId = rs.getInt("impressora_id");
                    mapa.computeIfAbsent(impressoraId, k -> new ArrayList<>()).add(
                            new PedidoAtivo(
                                    rs.getInt("idsolicitacao_impressao"),
                                    impressoraId,
                                    rs.getString("titulo"),
                                    rs.getString("criado_por_nome")));
                }
            }
        }
        return mapa;
    }

    public boolean existeAtivo(Connection conn, int impressoraId) throws SQLException {
        String sql = "SELECT 1 FROM solicitacao_impressao "
                + "WHERE impressora_id = ? AND status IN (" + marcadores(STATUS_ATIVOS.size()) + ") "
                + "LIMIT 1";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, impressoraId);
            int n = 2;
            for (String status : STATUS_ATIVOS) ps.setString(n++, status);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static String marcadores(int quantidade) {
        return String.join(",", Collections.nCopies(quantidade, "?"));
    }
}