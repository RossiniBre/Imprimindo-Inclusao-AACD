package aacd.service;

import aacd.dao.ExclusaoContaDao;
import aacd.dao.UsuarioDao;
import aacd.model.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.sql.Connection;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AlterarEstadoContaTest {

    private UsuarioDao usuarioDao;
    private GerenciadorSessoes sessoes;
    private AlterarEstadoConta servico;

    private ExclusaoContaDao contaDao;
    private Connection conn;

    @BeforeEach
    void preparar() throws Exception {
        usuarioDao = mock(UsuarioDao.class);
        contaDao = mock(ExclusaoContaDao.class);
        sessoes = new GerenciadorSessoes();
        conn = mock(Connection.class);
        ExcluirConta.FornecedorConexao conexoes = mock(ExcluirConta.FornecedorConexao.class);
        when(conexoes.abrir()).thenReturn(conn);
        servico = new AlterarEstadoConta(usuarioDao, contaDao, sessoes, conexoes);
    }

    @Test
    void desativarEmpresa_bloqueiaDesativaImpressorasEFazCommit() throws Exception {
        when(usuarioDao.buscarPorId(5)).thenReturn(usuario(5, "EMPRESA"));
        when(contaDao.buscarEmpresaId(conn, 5)).thenReturn(10);

        servico.desativar(5);

        InOrder ordem = inOrder(usuarioDao, contaDao, conn);
        ordem.verify(usuarioDao).atualizarSituacao(conn, 5, false, true);
        ordem.verify(contaDao).desativarImpressorasDaEmpresa(conn, 10);
        ordem.verify(conn).commit();
    }

    @Test
    void desativarFuncionario_naoMexeNasImpressoras() throws Exception {
        when(usuarioDao.buscarPorId(7)).thenReturn(usuario(7, "FUNCIONARIO"));

        servico.desativar(7);

        verify(usuarioDao).atualizarSituacao(conn, 7, false, true);
        verifyNoInteractions(contaDao);
    }

    @Test
    void desativarPropria_naoBloqueiaEDesativaImpressoras() throws Exception {
        when(usuarioDao.buscarPorId(5)).thenReturn(usuario(5, "EMPRESA"));
        when(contaDao.buscarEmpresaId(conn, 5)).thenReturn(10);

        servico.desativarPropria(5);

        verify(usuarioDao).atualizarSituacao(conn, 5, false, false);
        verify(contaDao).desativarImpressorasDaEmpresa(conn, 10);
    }

    @Test
    void desativarPropria_recusaFuncionarioEAdmin() throws Exception {
        when(usuarioDao.buscarPorId(7)).thenReturn(usuario(7, "FUNCIONARIO"));
        when(usuarioDao.buscarPorId(1)).thenReturn(usuario(1, "ADMIN"));

        assertThrows(IllegalArgumentException.class, () -> servico.desativarPropria(7));
        assertThrows(IllegalArgumentException.class, () -> servico.desativarPropria(1));
        verify(usuarioDao, never()).atualizarSituacao(any(), anyInt(), anyBoolean(), anyBoolean());
    }

    @Test
    void falhaNasImpressoras_fazRollbackEPreservaSessao() throws Exception {
        when(usuarioDao.buscarPorId(5)).thenReturn(usuario(5, "EMPRESA"));
        when(contaDao.buscarEmpresaId(conn, 5)).thenReturn(10);
        doThrow(new SQLException("x")).when(contaDao).desativarImpressorasDaEmpresa(conn, 10);
        String token = sessoes.criar(5, "EMPRESA");

        assertThrows(SQLException.class, () -> servico.desativar(5));

        verify(conn).rollback();
        verify(conn, never()).commit();
        assertTrue(sessoes.buscar(token).isPresent());
    }

    @Test
    void reativar_liberaContaSemTocarNasImpressoras() throws Exception {
        when(usuarioDao.buscarPorId(5)).thenReturn(usuario(5, "EMPRESA"));

        servico.reativar(5);

        verify(usuarioDao).atualizarSituacao(conn, 5, true, false);
        verifyNoInteractions(contaDao);
    }

    private Usuario usuario(int id, String perfil) {
        return new Usuario(id, "Conta " + id, "login" + id, "hash", perfil, true);
    }

    @Test
    void desativar_marcaInativoEDestroiSessoesSoDaquelaConta() throws Exception {
        when(usuarioDao.buscarPorId(5)).thenReturn(usuario(5, "EMPRESA"));
        String tokenAlvo = sessoes.criar(5, "EMPRESA");
        String tokenOutro = sessoes.criar(6, "EMPRESA");

        servico.desativar(5);

        verify(usuarioDao).atualizarSituacao(conn, 5, false, true);
        assertTrue(sessoes.buscar(tokenAlvo).isEmpty());
        assertTrue(sessoes.buscar(tokenOutro).isPresent());
    }

    @Test
    void reativar_marcaAtivoSemMexerNasSessoes() throws Exception {
        when(usuarioDao.buscarPorId(5)).thenReturn(usuario(5, "FUNCIONARIO"));
        String token = sessoes.criar(5, "FUNCIONARIO");

        servico.reativar(5);

        verify(usuarioDao).atualizarSituacao(conn, 5, true, false);
        assertTrue(sessoes.buscar(token).isPresent());
    }

    @Test
    void admin_naoPodeSerDesativadoNemReativado() throws Exception {
        when(usuarioDao.buscarPorId(1)).thenReturn(usuario(1, "ADMIN"));

        assertThrows(IllegalArgumentException.class, () -> servico.desativar(1));
        assertThrows(IllegalArgumentException.class, () -> servico.reativar(1));
        verify(usuarioDao, never()).atualizarSituacao(any(), anyInt(), anyBoolean(), anyBoolean());
    }

    @Test
    void contaInexistente_lancaIllegalState() throws Exception {
        when(usuarioDao.buscarPorId(99)).thenReturn(null);

        assertThrows(IllegalStateException.class, () -> servico.desativar(99));
        assertThrows(IllegalStateException.class, () -> servico.reativar(99));
    }

    @Test
    void idInvalido_naoConsultaOBanco() throws Exception {
        assertThrows(IllegalStateException.class, () -> servico.desativar(0));
        assertThrows(IllegalStateException.class, () -> servico.reativar(-3));
        verifyNoInteractions(usuarioDao);
    }
}