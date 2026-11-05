package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.UsuarioDao;
import aacd.model.Usuario;

import java.sql.Connection;
import java.sql.SQLException;

public class EditarNome {

    private final UsuarioDao usuarioDao = new UsuarioDao();

    public void executar(Usuario ator, int usuarioId, String nome) throws SQLException {
        if (ator == null || !ator.isAtivo()) {
            throw new IllegalStateException("Usuário sem permissão para editar nomes!");
        }

        Usuario alvo = usuarioDao.buscarPorId(usuarioId);
        if (alvo == null) {
            throw new IllegalArgumentException("Usuário não encontrado!");
        }

        boolean ehAdmin = "ADMIN".equals(ator.getPerfil());
        boolean ehProprio = ator.getId() == usuarioId;
        boolean alvoEhFuncionario = "FUNCIONARIO".equals(alvo.getPerfil());
        boolean alvoEhAdmin = "ADMIN".equals(alvo.getPerfil());

        boolean permitido = (ehProprio && (alvoEhFuncionario || alvoEhAdmin))
                || (ehAdmin && alvoEhFuncionario);

        if (!permitido) {
            throw new IllegalStateException("Você não pode editar o nome desta conta!");
        }

        alvo.setNome(nome);
        try (Connection conn = ConnectionFactory.getConnection()) {
            if (!usuarioDao.atualizarNome(conn, usuarioId, alvo.getNome())) {
                throw new IllegalStateException("Não foi possível atualizar o nome.");
            }
        }

        if (ehProprio) {
            ator.setNome(alvo.getNome());
        }
    }
}
