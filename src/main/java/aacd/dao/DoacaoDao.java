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

    public int inserir(int empresaId, TipoDoacao tipo, String descricao, int quantidade) throws SQLException {
        String sql = "INSERT INTO doacao (empresa_id, tipo, descricao, quantidade) VALUES (?, ?, ?, ?)";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, empresaId);
            ps.setString(2, tipo.name());
            ps.setString(3, descricao);
            ps.setInt(4, quantidade);
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) return rs.getInt(1);
            }
            throw new SQLException("Não foi possível obter o id da doação inserida.");
        }
    }

    public List<DoacaoResumo> listar() throws SQLException {
        String sql = "SELECT d.iddoacao, d.tipo, d.descricao, d.quantidade, d.data_manifestacao, d.visualizada, "
                + "e.idempresa, u.nome, e.email, e.telefone "
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
                        rs.getInt("quantidade"),
                        data == null ? null : data.toInstant(),
                        rs.getBoolean("visualizada"),
                        rs.getInt("idempresa"),
                        rs.getString("nome"),
                        rs.getString("email"),
                        rs.getString("telefone")));
            }
            return lista;
        }
    }
}