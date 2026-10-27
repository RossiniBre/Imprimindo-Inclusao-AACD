package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.FuncionarioDao;
import aacd.dao.UsuarioDao;
import aacd.model.Funcionario;
import aacd.model.Usuario;
import aacd.util.EmailValidador;
import aacd.util.Identificador;
import aacd.util.Senha;

import java.sql.Connection;
import java.sql.SQLException;

public class CadastrarFuncionario {

    private final UsuarioDao usuarioDao = new UsuarioDao();
    private final FuncionarioDao funcionarioDao = new FuncionarioDao();

    public void executar(Usuario ator, String nome, String identificador, String email,
                         String senha, String cargo, String setor) throws SQLException {
        if (ator == null || !"ADMIN".equals(ator.getPerfil()) || !ator.isAtivo()) {
            throw new IllegalStateException("Apenas o admin pode cadastrar funcionários!");
        }
        if (identificador == null || identificador.isBlank()) {
            throw new IllegalArgumentException("Login não pode estar vazio");
        }
        if (Identificador.contemArroba(identificador)) {
            throw new IllegalArgumentException("O login não pode conter @.");
        }
        String erroEmail = EmailValidador.validar(email);
        if (erroEmail != null) {
            throw new IllegalArgumentException(erroEmail);
        }
        if (senha == null || senha.isBlank()) {
            throw new IllegalArgumentException("Senha não pode estar vazia");
        }

        String emailNormalizado = EmailValidador.normalizar(email);
        Usuario novo = new Usuario(nome, identificador, Senha.gerarHash(senha), "FUNCIONARIO");

        if (usuarioDao.buscarPorIdentificador(novo.getIdentificador()) != null) {
            throw new IllegalStateException("Login já em uso!");
        }
        if (usuarioDao.existePorEmailExceto(emailNormalizado, 0)) {
            throw new IllegalStateException("E-mail já em uso!");
        }

        try (Connection conn = ConnectionFactory.getConnection()) {
            conn.setAutoCommit(false);
            try {
                int usuarioId = usuarioDao.inserir(conn, novo);
                funcionarioDao.inserir(conn, new Funcionario(usuarioId, emailNormalizado, cargo, setor));
                conn.commit();
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            }
        }
    }
}