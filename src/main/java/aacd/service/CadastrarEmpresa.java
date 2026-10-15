package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.EmpresaDao;
import aacd.dao.UsuarioDao;
import aacd.model.Empresa;
import aacd.model.Endereco;
import aacd.model.Usuario;
import aacd.util.Senha;

import java.sql.Connection;
import java.sql.SQLException;

public class CadastrarEmpresa {

    private final UsuarioDao usuarioDao = new UsuarioDao();
    private final EmpresaDao empresaDao = new EmpresaDao();

    public void executar(String nome, String cnpj, String senha,
                         String email, String telefone,
                         String cep, String rua, String numero,
                         String bairro, String cidade, String uf) throws SQLException{
        if (senha == null || senha.isBlank()) {
            throw new IllegalArgumentException("Senha não pode estar vazia");
        }

        Usuario novo = new Usuario(nome, cnpj, Senha.gerarHash(senha), "EMPRESA");
        Endereco endereco = new Endereco(cep, rua, numero, bairro, cidade, uf);

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
                empresaDao.inserir(conn, new Empresa(usuarioId, email, telefone, cnpj, endereco));
                conn.commit();
            } catch (SQLException | RuntimeException e) {
                conn.rollback();
                throw e;
            }
        }
    }
}