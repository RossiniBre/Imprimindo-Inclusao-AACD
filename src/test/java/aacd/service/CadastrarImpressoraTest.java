package aacd.service;

import aacd.dao.EmpresaDao;
import aacd.dao.ImpressoraDao;
import aacd.dao.ImpressoraMateriaisDao;
import aacd.model.Empresa;
import aacd.model.Endereco;
import aacd.model.Impressora;
import aacd.model.Material;
import aacd.model.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CadastrarImpressoraTest {

    private EmpresaDao empresaDao;
    private ImpressoraDao impressoraDao;
    private ImpressoraMateriaisDao materiaisDao;
    private ExcluirConta.FornecedorConexao conexoes;
    private Connection conn;
    private CadastrarImpressora servico;

    @BeforeEach
    void preparar() throws Exception {
        empresaDao = mock(EmpresaDao.class);
        impressoraDao = mock(ImpressoraDao.class);
        materiaisDao = mock(ImpressoraMateriaisDao.class);
        conn = mock(Connection.class);
        conexoes = mock(ExcluirConta.FornecedorConexao.class);
        when(conexoes.abrir()).thenReturn(conn);

        Empresa empresa = empresa();
        when(empresaDao.buscarPorUsuarioId(5)).thenReturn(empresa);
        when(impressoraDao.inserir(eq(conn), any(Impressora.class))).thenReturn(30);

        servico = new CadastrarImpressora(empresaDao, impressoraDao, materiaisDao, conexoes);
    }

    private Empresa empresa() {
        Endereco endereco = new Endereco("01001000", "Rua A", "10", "Centro", "São Paulo", "SP");
        return new Empresa(10, 5, "contato@acme.com", "11999999999", "11222333000181", endereco);
    }

    private Usuario usuario(int id, String perfil, boolean ativo) {
        return new Usuario(id, "Conta " + id, "login" + id, "hash", perfil, ativo);
    }

    @Test
    void cadastro_inserePrimeiroNoMysqlEDepoisGravaMateriaisNoMongo() throws Exception {
        Set<Material> materiais = Set.of(Material.PLA, Material.ABS);

        int id = servico.executar(usuario(5, "EMPRESA", true), "  Ender 3 ", materiais);

        assertEquals(30, id);
        InOrder ordem = inOrder(impressoraDao, materiaisDao);
        ordem.verify(impressoraDao).inserir(eq(conn), any(Impressora.class));
        ordem.verify(materiaisDao).salvar(30, materiais);
        verify(impressoraDao, never()).apagar(any(), anyInt());
    }

    @Test
    void cadastro_donoVemDaEmpresaDoUsuarioLogado() throws Exception {
        servico.executar(usuario(5, "EMPRESA", true), "  Ender 3 ", Set.of(Material.PLA));

        ArgumentCaptor<Impressora> captor = ArgumentCaptor.forClass(Impressora.class);
        verify(impressoraDao).inserir(eq(conn), captor.capture());
        assertEquals(10, captor.getValue().getEmpresaId());
        assertEquals("Ender 3", captor.getValue().getModelo());
        assertEquals(Set.of(Material.PLA), captor.getValue().getMateriais());
    }

    @Test
    void semMateriais_recusaSemTocarNosBancos() throws Exception {
        Usuario ator = usuario(5, "EMPRESA", true);

        assertThrows(IllegalArgumentException.class, () -> servico.executar(ator, "Ender 3", Set.of()));
        assertThrows(IllegalArgumentException.class, () -> servico.executar(ator, "Ender 3", null));

        verifyNoInteractions(impressoraDao, materiaisDao);
        verify(conexoes, never()).abrir();
    }

    @Test
    void modeloVazio_recusaSemTocarNosBancos() throws Exception {
        assertThrows(IllegalArgumentException.class,
                () -> servico.executar(usuario(5, "EMPRESA", true), "  ", Set.of(Material.PLA)));

        verifyNoInteractions(impressoraDao, materiaisDao);
    }

    @Test
    void perfilErradoOuContaInativa_recusa() throws Exception {
        Set<Material> materiais = Set.of(Material.PLA);

        assertThrows(IllegalStateException.class,
                () -> servico.executar(usuario(7, "FUNCIONARIO", true), "Ender 3", materiais));
        assertThrows(IllegalStateException.class,
                () -> servico.executar(usuario(5, "EMPRESA", false), "Ender 3", materiais));
        assertThrows(IllegalStateException.class,
                () -> servico.executar(null, "Ender 3", materiais));

        verifyNoInteractions(empresaDao, impressoraDao, materiaisDao);
    }

    @Test
    void empresaNaoEncontrada_recusa() throws Exception {
        when(empresaDao.buscarPorUsuarioId(5)).thenReturn(null);

        assertThrows(IllegalStateException.class,
                () -> servico.executar(usuario(5, "EMPRESA", true), "Ender 3", Set.of(Material.PLA)));

        verifyNoInteractions(impressoraDao, materiaisDao);
    }

    @Test
    void falhaNoMongo_desfazAImpressoraERelancaOErroOriginal() throws Exception {
        doThrow(new RuntimeException("mongo fora")).when(materiaisDao).salvar(anyInt(), any());

        RuntimeException erro = assertThrows(RuntimeException.class,
                () -> servico.executar(usuario(5, "EMPRESA", true), "Ender 3", Set.of(Material.PLA)));

        assertEquals("mongo fora", erro.getMessage());
        verify(impressoraDao).apagar(conn, 30);
    }

    @Test
    void falhaNoMongoEAoDesfazer_aindaRelancaOErroOriginal() throws Exception {
        doThrow(new RuntimeException("mongo fora")).when(materiaisDao).salvar(anyInt(), any());
        doThrow(new SQLException("sem conexão")).when(impressoraDao).apagar(conn, 30);

        RuntimeException erro = assertThrows(RuntimeException.class,
                () -> servico.executar(usuario(5, "EMPRESA", true), "Ender 3", Set.of(Material.PLA)));

        assertEquals("mongo fora", erro.getMessage());
    }
}