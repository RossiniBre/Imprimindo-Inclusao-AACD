package aacd.service;

import aacd.model.Usuario;

public class CadastrarFuncionario {

    public void executar(Usuario ator, String nome, String identificador, String senha,
                         String cargo, String setor) {
        if (ator == null || !"ADMIN".equals(ator.getPerfil()) || !ator.isAtivo()) {
            throw new IllegalStateException("Apenas o admin pode cadastrar funcionários!");
        }

        // espera UsuarioDao
    }
}