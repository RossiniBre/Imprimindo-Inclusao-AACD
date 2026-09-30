package aacd.service;

import aacd.model.Usuario;

public class ExcluirConta {

    public void executar(Usuario ator, int usuarioId) {
        if (ator == null || !"ADMIN".equals(ator.getPerfil()) || !ator.isAtivo()) {
            throw new IllegalStateException("Apenas o admin pode excluir contas!");
        }

        // espera UsuarioDao
    }
}