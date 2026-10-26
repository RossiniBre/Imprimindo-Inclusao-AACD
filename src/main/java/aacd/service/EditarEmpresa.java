package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.EmpresaDao;
import aacd.dao.UsuarioDao;
import aacd.model.Empresa;
import aacd.model.Endereco;
import aacd.model.Usuario;
import aacd.util.EmailValidador;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.SQLIntegrityConstraintViolationException;

public class EditarEmpresa {

    private final UsuarioDao usuarioDao = new UsuarioDao();
    private final EmpresaDao empresaDao = new EmpresaDao();

    public void executar(Usuario ator, String nome, String email, String telefone,
                         String cep, String rua, String numero,
                         String bairro, String cidade, String uf)
            throws SQLException {

        if (ator == null || !"EMPRESA".equals(ator.getPerfil()) || !ator.isAtivo()) {
            throw new IllegalStateException("Apenas a própria empresa pode editar seus dados!");
        }

        int usuarioId = ator.getId();

        Empresa empresa = empresaDao.buscarPorUsuarioId(usuarioId);
        if (empresa == null) {
            throw new IllegalArgumentException("Empresa não encontrada!");
        }

        String erroEmail = EmailValidador.validar(email);
        if (erroEmail != null) {
            throw new IllegalArgumentException(erroEmail);
        }
        String emailNormalizado = EmailValidador.normalizar(email);

        ator.setNome(nome);
        empresa.setEmail(emailNormalizado);
        empresa.setTelefone(telefone);
        empresa.setEndereco(new Endereco(cep, rua, numero, bairro, cidade, uf));

        if (usuarioDao.existePorEmailExceto(emailNormalizado, usuarioId)) {
            throw new IllegalArgumentException("Email já cadastrado!");
        }

        try (Connection conn = ConnectionFactory.getConnection()) {
            try {
                conn.setAutoCommit(false);

                boolean nomeOk = usuarioDao.atualizarNome(conn, usuarioId, ator.getNome());
                boolean empresaOk = empresaDao.atualizar(conn, empresa);

                if (!nomeOk || !empresaOk) {
                    throw new IllegalStateException("Não foi possível atualizar a conta.");
                }

                conn.commit();
            } catch (SQLIntegrityConstraintViolationException e) {
                conn.rollback();
                throw new IllegalArgumentException("Email já cadastrado!");
            } catch (SQLException | RuntimeException e) {
                conn.rollback();
                throw e;
            }
        }
    }
}