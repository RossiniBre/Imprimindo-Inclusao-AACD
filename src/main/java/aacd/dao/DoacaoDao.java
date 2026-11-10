package aacd.dao;

import aacd.config.ConnectionFactory;
import aacd.model.DoacaoResumo;
import aacd.model.TipoDoacao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

public class DoacaoDao {

    public int inserir(int empresaId, TipoDoacao tipo, String descricao,
                       int qtdImpressoras, int qtdFilamento) throws SQLException {
        String sql = "INSERT INTO doacao (empresa_id, tipo, descricao, quantidade_impressoras, quantidade_filamento) "
                + "VALUES (?, ?, ?, ?, ?)";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, empresaId);
            ps.setString(2, tipo.name());
            ps.setString(3, descricao);
            ps.setInt(4, qtdImpressoras);
            ps.setInt(5, qtdFilamento);
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) return rs.getInt(1);
            }
            throw new SQLException("Não foi possível obter o id da doação inserida.");
        }
    }

    public List<DoacaoResumo> listar() throws SQLException {
        String sql = "SELECT d.iddoacao, d.tipo, d.descricao, d.quantidade_impressoras, d.quantidade_filamento, d.data_manifestacao, "
                + "e.idempresa, u.nome, u.ativo, e.email, e.telefone "
                + "FROM doacao d "
                + "JOIN empresa e ON e.idempresa = d.empresa_id "
                + "JOIN usuario u ON u.idusuario = e.usuario_id "
                + "ORDER BY d.data_manifestacao DESC";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            List<DoacaoResumo> lista = new ArrayList<>();
            while (rs.next()) {
                Timestamp data = rs.getTimestamp("data_manifestacao");
                lista.add(new DoacaoResumo(
                        rs.getInt("iddoacao"),
                        rs.getString("tipo"),
                        rs.getString("descricao"),
                        rs.getInt("quantidade_impressoras"),
                        rs.getInt("quantidade_filamento"),
                        data == null ? null : data.toInstant(),
                        rs.getInt("idempresa"),
                        rs.getString("nome"),
                        rs.getBoolean("ativo"),
                        rs.getString("email"),
                        rs.getString("telefone")));
            }
            return lista;
        }
    }

    public boolean excluir(int id) throws SQLException {
        String sql = "DELETE FROM doacao WHERE iddoacao = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        }
    }
}