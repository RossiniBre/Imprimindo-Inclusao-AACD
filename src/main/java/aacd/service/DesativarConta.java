package aacd.service;

import aacd.dao.UsuarioDao;
import aacd.model.Usuario;

import java.sql.SQLException;

public class DesativarConta {

    private final UsuarioDao usuarioDao = new UsuarioDao();

    public void executar(Usuario ator, int usuarioId) throws SQLException {
        if (ator == null || !"ADMIN".equals(ator.getPerfil()) || !ator.isAtivo()) {
            throw new IllegalStateException("Apenas o admin pode desativar contas!");
        }

        Usuario alvo = usuarioDao.buscarPorId(usuarioId);
        if (alvo == null) {
            throw new IllegalArgumentException("Usuário não encontrado!");
        }
        if ("ADMIN".equals(alvo.getPerfil())) {
            throw new IllegalStateException("A conta de admin não pode ser desativada!");
        }

        usuarioDao.atualizarAtivo(usuarioId, false);
    }
}