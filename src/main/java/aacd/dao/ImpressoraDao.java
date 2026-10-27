package aacd.dao;

import aacd.config.ConnectionFactory;
import aacd.model.Disponibilidade;
import aacd.model.Impressora;

import java.sql.*;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

public class ImpressoraDao {

    public int inserir(Connection conn, Impressora impressora) throws SQLException {
        String sql = "INSERT INTO impressora(empresa_id, modelo, disponibilidade, ativo) VALUES (?, ?, ?, ?)";

        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, impressora.getEmpresaId());
            ps.setString(2, impressora.getModelo());
            ps.setString(3, impressora.getDisponibilidade().name());
            ps.setBoolean(4, impressora.isAtivo());
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    int id = rs.getInt(1);
                    impressora.setId(id);
                    return id;
                }
            }
            throw new SQLException("Não foi possível obter o id da impressora inserida.");
        }
    }

    public Impressora buscarPorId(Connection conn, int id) throws SQLException {
        String sql = "SELECT idimpressora, empresa_id, modelo, disponibilidade, ativo "
                + "FROM impressora WHERE idimpressora = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    return null;
                }
                return new Impressora(
                        rs.getInt("idimpressora"),
                        rs.getInt("empresa_id"),
                        rs.getString("modelo"),
                        Disponibilidade.valueOf(rs.getString("disponibilidade")),
                        rs.getBoolean("ativo"));
            }
        }
    }

    public void atualizarAtivo(Connection conn, int id, boolean ativo) throws SQLException {
        String sql = "UPDATE impressora SET ativo = ? WHERE idimpressora = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setBoolean(1, ativo);
            ps.setInt(2, id);
            ps.executeUpdate();
        }
    }

    public void atualizarModelo(Connection conn, int id, String modelo) throws SQLException {
        String sql = "UPDATE impressora SET modelo = ? WHERE idimpressora = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, modelo);
            ps.setInt(2, id);
            ps.executeUpdate();
        }
    }

    public List<Impressora> listarPorEmpresa(int empresaId) throws SQLException {
        String sql = "SELECT idimpressora, empresa_id, modelo, disponibilidade, ativo "
                + "FROM impressora WHERE empresa_id = ? ORDER BY idimpressora";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, empresaId);

            try (ResultSet rs = ps.executeQuery()) {
                List<Impressora> lista = new ArrayList<>();
                while (rs.next()) {
                    lista.add(new Impressora(
                            rs.getInt("idimpressora"),
                            rs.getInt("empresa_id"),
                            rs.getString("modelo"),
                            Disponibilidade.valueOf(rs.getString("disponibilidade")),
                            rs.getBoolean("ativo")));
                }
                return lista;
            }
        }
    }

    public void apagar(Connection conn, int id) throws SQLException {
        String sql = "DELETE FROM impressora WHERE idimpressora = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }

    public record ItemPainel(int id, int empresaId, String empresa, String modelo,
                             Disponibilidade disponibilidade, boolean ativo) {}

    public List<ItemPainel> listarPainel(Integer empresaId, Disponibilidade disponibilidade,
                                         Collection<Integer> ids) throws SQLException {
        if (ids != null && ids.isEmpty()) {
            return List.of();
        }

        StringBuilder sql = new StringBuilder("""
            SELECT i.idimpressora, i.empresa_id, ue.nome AS empresa_nome,
                   i.modelo, i.disponibilidade, i.ativo
            FROM impressora i
            JOIN empresa e ON e.idempresa = i.empresa_id
            JOIN usuario ue ON ue.idusuario = e.usuario_id
            WHERE 1 = 1
            """);
        List<Object> params = new ArrayList<>();

        if (empresaId != null) {
            sql.append("AND i.empresa_id = ? ");
            params.add(empresaId);
        }
        if (disponibilidade != null) {
            sql.append("AND i.disponibilidade = ? ");
            params.add(disponibilidade.name());
        }
        if (ids != null) {
            sql.append("AND i.idimpressora IN (")
                    .append(String.join(",", Collections.nCopies(ids.size(), "?")))
                    .append(") ");
            params.addAll(ids);
        }
        sql.append("ORDER BY ue.nome, i.modelo, i.idimpressora");

        List<ItemPainel> lista = new ArrayList<>();
        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql.toString())) {
            for (int i = 0; i < params.size(); i++) {
                ps.setObject(i + 1, params.get(i));
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    lista.add(new ItemPainel(
                            rs.getInt("idimpressora"),
                            rs.getInt("empresa_id"),
                            rs.getString("empresa_nome"),
                            rs.getString("modelo"),
                            Disponibilidade.valueOf(rs.getString("disponibilidade")),
                            rs.getBoolean("ativo")));
                }
            }
        }
        return lista;
    }
}