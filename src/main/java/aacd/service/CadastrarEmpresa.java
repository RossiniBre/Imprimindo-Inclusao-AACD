package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.EmpresaDao;
import aacd.dao.UsuarioDao;
import aacd.model.Empresa;
import aacd.model.Usuario;
import aacd.util.Senha;

import java.sql.Connection;
import java.sql.SQLException;

public class CadastrarEmpresa {

    private final UsuarioDao usuarioDao = new UsuarioDao();
    private final EmpresaDao empresaDao = new EmpresaDao();

    public void executar(String nome, String cnpj, String senha,
                         String email, String telefone) throws SQLException {
        if (senha == null || senha.isBlank()) {
            throw new IllegalArgumentException("Senha não pode estar vazia");
        }

        Usuario novo = new Usuario(nome, cnpj, Senha.gerarHash(senha), "EMPRESA");

        if (usuarioDao.buscarPorIdentificador(novo.getIdentificador()) != null) {
            throw new IllegalStateException("CNPJ já cadastrado!");
        }
        if (email != null && empresaDao.existePorEmail(email.trim())) {
            throw new IllegalStateException("Email já em uso!");
        }
        
        try (Connection conn = ConnectionFactory.getConnection()) {
            conn.setAutoCommit(false);
            try {
                int usuarioId = usuarioDao.inserir(conn, novo);
                empresaDao.inserir(conn, new Empresa(usuarioId, email, telefone, cnpj));
                conn.commit();
            } catch (SQLException | RuntimeException e) {
                conn.rollback();
                throw e;
            }
        }
    }
}