package aacd.service;

import aacd.dao.UsuarioDao;
import aacd.model.Usuario;
import aacd.util.EmailValidador;
import aacd.util.Identificador;
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

        String entrada = identificador.trim();
        Usuario usuario = entrada.contains("@")
                ? usuarioDao.buscarPorEmail(EmailValidador.normalizar(entrada))
                : usuarioDao.buscarPorIdentificador(Identificador.normalizar(entrada));

        if (usuario == null || !Senha.confere(senha, usuario.getSenhaHash())) {
            return Optional.empty();
        }

        if (!usuario.isAtivo()) {
            if (usuario.isBloqueadaPelaAacd()) {
                throw new ContaBloqueadaException("Conta desativada pela AACD.");
            }
            usuarioDao.atualizarSituacao(usuario.getId(), true, false); // empresa se reativa
            usuario.setAtivo(true);
        }
        return Optional.of(usuario);
    }
}