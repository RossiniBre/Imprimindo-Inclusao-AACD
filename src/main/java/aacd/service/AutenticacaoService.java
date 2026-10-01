package aacd.service;

import aacd.dao.UsuarioDao;
import aacd.model.Usuario;
import aacd.util.Senha;

import java.sql.SQLException;
import java.util.Optional;

import static aacd.util.Identificador.normalizar;

public class AutenticacaoService {

    private final UsuarioDao usuarioDao;

    public AutenticacaoService(UsuarioDao usuarioDao) {
        this.usuarioDao = usuarioDao;
    }

    public Optional<Usuario> autenticar(String identificador, String senha) throws SQLException {
        if (identificador == null || identificador.isBlank() || senha == null || senha.isEmpty()) {
            return Optional.empty();
        }

        Usuario usuario = usuarioDao.buscarPorIdentificador(normalizar(identificador));
        if (usuario == null || !Senha.confere(senha, usuario.getSenhaHash())) {
            return Optional.empty();
        }

        if (!usuario.isAtivo()) {
            usuarioDao.atualizarAtivo(usuario.getId(), true);
        }
        return Optional.of(usuario);
    }
}