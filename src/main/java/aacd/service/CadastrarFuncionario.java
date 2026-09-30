package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.FuncionarioDao;
import aacd.dao.UsuarioDao;
import aacd.model.Funcionario;
import aacd.model.Usuario;
import aacd.util.Senha;

import java.sql.Connection;
import java.sql.SQLException;

public class CadastrarFuncionario {

    private final UsuarioDao usuarioDao = new UsuarioDao();
    private final FuncionarioDao funcionarioDao = new FuncionarioDao();

    public void executar(Usuario ator, String nome, String identificador, String senha,
                         String cargo, String setor) throws SQLException {
        if (ator == null || !"ADMIN".equals(ator.getPerfil()) || !ator.isAtivo()) {
            throw new IllegalStateException("Apenas o admin pode cadastrar funcionários!");
        }
        if (senha == null || senha.isBlank()) {
            throw new IllegalArgumentException("Senha não pode estar vazia");
        }

        Usuario novo = new Usuario(nome, identificador, Senha.gerarHash(senha), "FUNCIONARIO");

        if (usuarioDao.buscarPorIdentificador(novo.getIdentificador()) != null) {
            throw new IllegalStateException("Login já em uso!");
        }

        try (Connection conn = ConnectionFactory.getConnection()) {
            conn.setAutoCommit(false);
            try {
                int usuarioId = usuarioDao.inserir(conn, novo);
                funcionarioDao.inserir(conn, new Funcionario(usuarioId, cargo, setor));
                conn.commit();
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            }
        }
    }
}