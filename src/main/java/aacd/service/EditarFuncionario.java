package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.FuncionarioDao;
import aacd.dao.UsuarioDao;
import aacd.model.Funcionario;
import aacd.model.Usuario;

import java.sql.Connection;
import java.sql.SQLException;

public class EditarFuncionario {

    private final FuncionarioDao funcionarioDao = new FuncionarioDao();
    private final UsuarioDao usuarioDao = new UsuarioDao();

    public void executar(Usuario ator, int usuarioId, String email, String login,
                     String cargo, String setor) throws SQLException {

        if (ator == null || !ator.isAtivo()) {
            throw new IllegalStateException("Usuário sem permissão para editar funcionários!");
        }

        boolean ehAdmin = "ADMIN".equals(ator.getPerfil());
        boolean ehProprio = "FUNCIONARIO".equals(ator.getPerfil()) && ator.getId() == usuarioId;

        if (!ehAdmin && !ehProprio) {
            throw new IllegalStateException("Você só pode editar os seus próprios dados!");
        }

        Funcionario funcionario = funcionarioDao.buscarPorUsuarioId(usuarioId);
        if (funcionario == null) {
            throw new IllegalArgumentException("Funcionário não encontrado!");
        }

        Usuario alvo = usuarioDao.buscarPorId(usuarioId);   // ajuste ao nome real do seu DAO
        if (alvo == null) {
            throw new IllegalArgumentException("Usuário não encontrado!");
        }
        boolean alvoEhAdmin = "ADMIN".equals(alvo.getPerfil());

        // Só mexe no e-mail se ele veio e é diferente do que já está salvo
        String emailNovo = email == null ? null : email.trim();
        boolean mudouEmail = emailNovo != null
                && !emailNovo.isEmpty()
                && !emailNovo.equalsIgnoreCase(funcionario.getEmail());

        if (mudouEmail) {
            if (!ehAdmin) {
                throw new IllegalStateException("Só a administração pode alterar o e-mail.");
            }
            funcionario.setEmail(emailNovo, alvoEhAdmin);
            if (usuarioDao.existePorEmailExceto(funcionario.getEmail(), usuarioId)) {
                throw new IllegalStateException("E-mail já em uso!");
            }
        }

        funcionario.setCargo(cargo);
        funcionario.setSetor(setor);

        try (Connection conn = ConnectionFactory.getConnection()) {
            if (!funcionarioDao.atualizar(conn, funcionario)) {
                throw new IllegalStateException("Não foi possível atualizar o funcionário.");
            }
        }
    }
}