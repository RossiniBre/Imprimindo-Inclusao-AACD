package aacd.service;

import aacd.dao.*;
import aacd.dao.ExclusaoContaDao.SolicitacaoApagada;
import aacd.model.Usuario;
import aacd.storage.ArmazenamentoArquivo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ExcluirContaTest {

    private static final String MONGO_A = "a".repeat(24);
    private static final String MONGO_B = "b".repeat(24);

    private UsuarioDao usuarioDao;
    private ExclusaoContaDao exclusaoDao;
    private ConteudoSolicitacaoDao conteudoDao;
    private SolicitacaoEventosDao eventosDao;
    private ArmazenamentoArquivo armazenamento;
    private GerenciadorSessoes sessoes;
    private Connection conn;
    private ExcluirConta.FornecedorConexao conexoes;
    private ExcluirConta servico;

    @BeforeEach
    void preparar() throws Exception {
        usuarioDao = mock(UsuarioDao.class);
        exclusaoDao = mock(ExclusaoContaDao.class);
        conteudoDao = mock(ConteudoSolicitacaoDao.class);
        eventosDao = mock(SolicitacaoEventosDao.class);
        armazenamento = mock(ArmazenamentoArquivo.class);
        sessoes = new GerenciadorSessoes();
        conn = mock(Connection.class);
        conexoes = mock(ExcluirConta.FornecedorConexao.class);
        when(conexoes.abrir()).thenReturn(conn);

        servico = new ExcluirConta(usuarioDao, exclusaoDao, conteudoDao,
                eventosDao, armazenamento, sessoes, conexoes, new ImpressoraMateriaisDao());
    }

    private Usuario usuario(int id, String perfil, String nome) {
        return new Usuario(id, nome, "login" + id, "hash", perfil, true);
    }

    @Test
    void empresa_apagaNaOrdemDoBancoEFazCommit() throws Exception {
        when(usuarioDao.buscarPorId(5)).thenReturn(usuario(5, "EMPRESA", "Acme"));
        when(exclusaoDao.buscarEmpresaId(conn, 5)).thenReturn(10);
        when(exclusaoDao.listarSolicitacoesDaEmpresa(conn, 10)).thenReturn(List.of());

        servico.executar(5);

        InOrder ordem = inOrder(exclusaoDao, conn);
        ordem.verify(exclusaoDao).anularCanceladoPor(conn, 5);
        ordem.verify(exclusaoDao).apagarSolicitacoesDaEmpresa(conn, 10);
        ordem.verify(exclusaoDao).apagarDoacoesDaEmpresa(conn, 10);
        ordem.verify(exclusaoDao).apagarImpressorasDaEmpresa(conn, 10);
        ordem.verify(exclusaoDao).apagarEmpresa(conn, 10);
        ordem.verify(exclusaoDao).apagarUsuario(conn, 5);
        ordem.verify(conn).commit();
        verify(conn, never()).rollback();
    }

    @Test
    void empresa_limpaMongoDasSolicitacoesApagadas() throws Exception {
        when(usuarioDao.buscarPorId(5)).thenReturn(usuario(5, "EMPRESA", "Acme"));
        when(exclusaoDao.buscarEmpresaId(conn, 5)).thenReturn(10);
        when(exclusaoDao.listarSolicitacoesDaEmpresa(conn, 10))
                .thenReturn(List.of(new SolicitacaoApagada(1, MONGO_A),
                        new SolicitacaoApagada(2, MONGO_B)));

        servico.executar(5);

        verify(conteudoDao).apagar(MONGO_A);
        verify(conteudoDao).apagar(MONGO_B);
        verify(eventosDao).apagar(1);
        verify(eventosDao).apagar(2);
    }

    @Test
    void funcionario_guardaNomeAntesDeApagarESemTocarNoMongo() throws Exception {
        when(usuarioDao.buscarPorId(7)).thenReturn(usuario(7, "FUNCIONARIO", "Maria"));
        when(exclusaoDao.buscarFuncionarioId(conn, 7)).thenReturn(20);

        servico.executar(7);

        InOrder ordem = inOrder(exclusaoDao, conn);
        ordem.verify(exclusaoDao).anularCanceladoPor(conn, 7);
        ordem.verify(exclusaoDao).guardarNomeDoCriador(conn, 20, "Maria");
        ordem.verify(exclusaoDao).apagarFuncionario(conn, 20);
        ordem.verify(exclusaoDao).apagarUsuario(conn, 7);
        ordem.verify(conn).commit();

        verify(exclusaoDao, never()).apagarSolicitacoesDaEmpresa(any(), anyInt());
        verifyNoInteractions(conteudoDao, eventosDao);
    }

    @Test
    void falhaNoMeio_fazRollbackEPreservaSessaoEMongo() throws Exception {
        when(usuarioDao.buscarPorId(5)).thenReturn(usuario(5, "EMPRESA", "Acme"));
        when(exclusaoDao.buscarEmpresaId(conn, 5)).thenReturn(10);
        when(exclusaoDao.listarSolicitacoesDaEmpresa(conn, 10))
                .thenReturn(List.of(new SolicitacaoApagada(1, MONGO_A)));
        doThrow(new SQLException("fk")).when(exclusaoDao).apagarEmpresa(conn, 10);
        String token = sessoes.criar(5, "EMPRESA");

        assertThrows(SQLException.class, () -> servico.executar(5));

        verify(conn).rollback();
        verify(conn, never()).commit();
        verify(exclusaoDao, never()).apagarUsuario(any(), anyInt());
        verifyNoInteractions(conteudoDao, eventosDao);
        assertTrue(sessoes.buscar(token).isPresent());
    }

    @Test
    void sucesso_destroiSessoesDaContaExcluida() throws Exception {
        when(usuarioDao.buscarPorId(7)).thenReturn(usuario(7, "FUNCIONARIO", "Maria"));
        when(exclusaoDao.buscarFuncionarioId(conn, 7)).thenReturn(20);
        String tokenAlvo = sessoes.criar(7, "FUNCIONARIO");
        String tokenOutro = sessoes.criar(8, "FUNCIONARIO");

        servico.executar(7);

        assertTrue(sessoes.buscar(tokenAlvo).isEmpty());
        assertTrue(sessoes.buscar(tokenOutro).isPresent());
    }

    @Test
    void falhaNoMongo_naoDesfazAExclusaoEContinuaNasOutras() throws Exception {
        when(usuarioDao.buscarPorId(5)).thenReturn(usuario(5, "EMPRESA", "Acme"));
        when(exclusaoDao.buscarEmpresaId(conn, 5)).thenReturn(10);
        when(exclusaoDao.listarSolicitacoesDaEmpresa(conn, 10))
                .thenReturn(List.of(new SolicitacaoApagada(1, MONGO_A),
                        new SolicitacaoApagada(2, MONGO_B)));
        doThrow(new RuntimeException("mongo fora")).when(conteudoDao).buscarPorId(MONGO_A);

        assertDoesNotThrow(() -> servico.executar(5));

        verify(conn).commit();
        verify(conteudoDao).apagar(MONGO_B);
        verify(eventosDao).apagar(2);
    }

    @Test
    void admin_naoPodeSerExcluidoENemAbreConexao() throws Exception {
        when(usuarioDao.buscarPorId(1)).thenReturn(usuario(1, "ADMIN", "Root"));

        assertThrows(IllegalArgumentException.class, () -> servico.executar(1));
        verifyNoInteractions(conexoes, exclusaoDao);
    }

    @Test
    void contaInexistenteOuIdInvalido_lancaIllegalState() throws Exception {
        when(usuarioDao.buscarPorId(99)).thenReturn(null);

        assertThrows(IllegalStateException.class, () -> servico.executar(99));
        assertThrows(IllegalStateException.class, () -> servico.executar(0));
        verifyNoInteractions(conexoes);
    }
}