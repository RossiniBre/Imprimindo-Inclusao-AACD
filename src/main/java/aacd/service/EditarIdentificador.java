package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.UsuarioDao;
import aacd.model.Usuario;
import aacd.util.Identificador;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.SQLIntegrityConstraintViolationException;

public class EditarIdentificador {

    private final UsuarioDao usuarioDao = new UsuarioDao();

    public void executar(Usuario ator, int usuarioId, String identificador)
            throws SQLException {

        if (ator == null || !ator.isAtivo()) {
            throw new IllegalStateException("Usuário sem permissão para editar identificadores!");
        }

        Usuario alvo = usuarioDao.buscarPorId(usuarioId);
        if (alvo == null) {
            throw new IllegalArgumentException("Usuário não encontrado!");
        }

        boolean ehAdmin = "ADMIN".equals(ator.getPerfil());
        boolean ehProprio = ator.getId() == usuarioId;
        boolean alvoEhAdmin = "ADMIN".equals(alvo.getPerfil());
        boolean alvoEhFuncionario = "FUNCIONARIO".equals(alvo.getPerfil());

        boolean permitido = (ehProprio && (alvoEhAdmin || alvoEhFuncionario))
                || (ehAdmin && alvoEhFuncionario);

        if (!permitido) {
            throw new IllegalStateException("Você não pode editar o identificador desta conta!");
        }

        // Valida e normaliza no objeto vindo do banco.
        alvo.setIdentificador(identificador);
        String novo = alvo.getIdentificador();

        if (Identificador.pareceCnpj(novo)) {
            throw new IllegalArgumentException("Identificador não pode ter formato de CNPJ!");
        }

        if (usuarioDao.existePorIdentificadorExceto(novo, usuarioId)) {
            throw new IllegalArgumentException("Identificador já está em uso!");
        }

        try (Connection conn = ConnectionFactory.getConnection()) {
            if (!usuarioDao.atualizarIdentificador(conn, usuarioId, novo)) {
                throw new IllegalStateException("Não foi possível atualizar o identificador.");
            }
        } catch (SQLIntegrityConstraintViolationException e) {
            throw new IllegalArgumentException("Identificador já está em uso!");
        }

        if (ehProprio) {
            ator.setIdentificador(novo); // só depois de gravar
        }
    }
}