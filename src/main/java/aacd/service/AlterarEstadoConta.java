package aacd.service;

import aacd.dao.ExclusaoContaDao;
import aacd.dao.UsuarioDao;
import aacd.model.Usuario;

import java.sql.Connection;
import java.sql.SQLException;

public class AlterarEstadoConta {

    private final UsuarioDao usuarioDao;
    private final GerenciadorSessoes sessoes;
    private final ExclusaoContaDao contaDao;
    private final ExcluirConta.FornecedorConexao conexoes;

    public AlterarEstadoConta(UsuarioDao usuarioDao, ExclusaoContaDao contaDao,
                              GerenciadorSessoes sessoes, ExcluirConta.FornecedorConexao conexoes) {
        this.usuarioDao = usuarioDao;
        this.contaDao = contaDao;
        this.sessoes = sessoes;
        this.conexoes = conexoes;
    }

    public void desativar(int alvoId) throws SQLException {
        desativarConta(buscarAlvo(alvoId), true);
    }

    public void desativarPropria(int usuarioId) throws SQLException {
        Usuario conta = buscarAlvo(usuarioId);
        if (!"EMPRESA".equals(conta.getPerfil())) {
            throw new IllegalArgumentException("Só a empresa pode desativar a própria conta!");
        }
        desativarConta(conta, false);
    }

    public void reativar(int alvoId) throws SQLException {
        Usuario alvo = buscarAlvo(alvoId);
        try (Connection conn = conexoes.abrir()) {
            usuarioDao.atualizarSituacao(conn, alvo.getId(), true, false);
        }
    }

    private void desativarConta(Usuario alvo, boolean bloqueadaPelaAacd) throws SQLException {
        try (Connection conn = conexoes.abrir()) {
            conn.setAutoCommit(false);
            try {
                usuarioDao.atualizarSituacao(conn, alvo.getId(), false, bloqueadaPelaAacd);
                if ("EMPRESA".equals(alvo.getPerfil())) {
                    Integer empresaId = contaDao.buscarEmpresaId(conn, alvo.getId());
                    if (empresaId != null) {
                        contaDao.desativarImpressorasDaEmpresa(conn, empresaId);
                    }
                }
                conn.commit();
            } catch (SQLException | RuntimeException e) {
                conn.rollback();
                throw e;
            }
        }
        sessoes.destruirDoUsuario(alvo.getId());
    }

    private Usuario buscarAlvo(int id) throws SQLException {
        Usuario alvo = id > 0 ? usuarioDao.buscarPorId(id) : null;
        if (alvo == null) {
            throw new IllegalStateException("Conta não encontrada!");
        }
        if ("ADMIN".equals(alvo.getPerfil())) {
            throw new IllegalArgumentException("Contas de administrador não podem ser alteradas!");
        }
        return alvo;
    }
}