package aacd.service;

import aacd.model.Usuario;

public class DesativarConta {

    public void executar(Usuario ator, int usuarioId) {
        if (ator == null || !"ADMIN".equals(ator.getPerfil()) || !ator.isAtivo()) {
            throw new IllegalStateException("Apenas o admin pode desativar contas!");
        }

        // espera UsuarioDao
    }
}