package aacd.service;

import aacd.dao.DoacaoDao;
import aacd.dao.EmpresaDao;
import aacd.model.Empresa;
import aacd.model.TipoDoacao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ManifestarDoacaoTest {

    private static final int USUARIO_ID = 10;
    private static final int EMPRESA_ID = 7;
    private static final int DOACAO_ID = 42;
    private static final String DESCRICAO = "PLA branco, rolos fechados";

    private EmpresaDao empresaDao;
    private DoacaoDao doacaoDao;
    private ManifestarDoacao service;

    @BeforeEach
    void preparar() throws Exception {
        empresaDao = mock(EmpresaDao.class);
        doacaoDao = mock(DoacaoDao.class);

        Empresa empresa = mock(Empresa.class);
        when(empresa.getId()).thenReturn(EMPRESA_ID);
        when(empresaDao.buscarPorUsuarioId(USUARIO_ID)).thenReturn(empresa);

        when(doacaoDao.inserir(anyInt(), any(), anyString(), anyInt(), anyInt())).thenReturn(DOACAO_ID);

        service = new ManifestarDoacao(empresaDao, doacaoDao);
    }

    private int manifestar(String tipo, String descricao, String qtdImpressoras, String qtdFilamento) throws Exception {
        return service.executar(USUARIO_ID, tipo, descricao, qtdImpressoras, qtdFilamento);
    }

    private void assertNadaGravado() throws Exception {
        verifyNoInteractions(empresaDao, doacaoDao);
    }

    // ---------- caminho feliz ----------

    @Test
    void manifestaDoacaoERetornaOIdGerado() throws Exception {
        int id = manifestar("FILAMENTO", DESCRICAO, null, "2");

        assertEquals(DOACAO_ID, id);
        verify(doacaoDao).inserir(EMPRESA_ID, TipoDoacao.FILAMENTO, DESCRICAO, 0, 2);
    }

    @Test
    void doacaoDeImpressoraGravaSoAQuantidadeDeImpressoras() throws Exception {
        manifestar("IMPRESSORA", DESCRICAO, "3", null);

        verify(doacaoDao).inserir(EMPRESA_ID, TipoDoacao.IMPRESSORA, DESCRICAO, 3, 0);
    }

    @Test
    void doacaoDeAmbosGravaAsDuasQuantidades() throws Exception {
        manifestar("AMBOS", DESCRICAO, "3", "5");

        verify(doacaoDao).inserir(EMPRESA_ID, TipoDoacao.AMBOS, DESCRICAO, 3, 5);
    }

    @Test
    void empresaVemDoUsuarioDaSessao() throws Exception {
        manifestar("IMPRESSORA", DESCRICAO, "1", null);

        verify(empresaDao).buscarPorUsuarioId(USUARIO_ID);
        verify(doacaoDao).inserir(eq(EMPRESA_ID), any(), anyString(), anyInt(), anyInt());
    }

    @Test
    void quantidadeNulaVale1() throws Exception {
        manifestar("FILAMENTO", DESCRICAO, null, null);

        verify(doacaoDao).inserir(EMPRESA_ID, TipoDoacao.FILAMENTO, DESCRICAO, 0, 1);
    }

    @Test
    void quantidadeEmBrancoVale1() throws Exception {
        manifestar("FILAMENTO", DESCRICAO, null, "   ");

        verify(doacaoDao).inserir(EMPRESA_ID, TipoDoacao.FILAMENTO, DESCRICAO, 0, 1);
    }

    @Test
    void ambosSemQuantidadesValem1ParaCada() throws Exception {
        manifestar("AMBOS", DESCRICAO, null, "  ");

        verify(doacaoDao).inserir(EMPRESA_ID, TipoDoacao.AMBOS, DESCRICAO, 1, 1);
    }

    @Test
    void quantidadeDoTipoNaoSelecionadoEhIgnorada() throws Exception {
        manifestar("FILAMENTO", DESCRICAO, "abc", "2");
        manifestar("IMPRESSORA", DESCRICAO, "4", "999999");

        verify(doacaoDao).inserir(EMPRESA_ID, TipoDoacao.FILAMENTO, DESCRICAO, 0, 2);
        verify(doacaoDao).inserir(EMPRESA_ID, TipoDoacao.IMPRESSORA, DESCRICAO, 4, 0);
    }

    @Test
    void tipoEmMinusculoEComEspacosEhAceito() throws Exception {
        manifestar("  ambos ", DESCRICAO, "3", "2");

        verify(doacaoDao).inserir(EMPRESA_ID, TipoDoacao.AMBOS, DESCRICAO, 3, 2);
    }

    @Test
    void descricaoEhGravadaSemEspacosNasPontas() throws Exception {
        manifestar("IMPRESSORA", "   Ender 3 usada   ", "1", null);

        verify(doacaoDao).inserir(EMPRESA_ID, TipoDoacao.IMPRESSORA, "Ender 3 usada", 1, 0);
    }

    @Test
    void limitesDeQuantidadeSaoAceitos() throws Exception {
        manifestar("FILAMENTO", DESCRICAO, null, "1");
        manifestar("FILAMENTO", DESCRICAO, null, "10000");

        verify(doacaoDao).inserir(EMPRESA_ID, TipoDoacao.FILAMENTO, DESCRICAO, 0, 1);
        verify(doacaoDao).inserir(EMPRESA_ID, TipoDoacao.FILAMENTO, DESCRICAO, 0, 10000);
    }

    @Test
    void descricaoComExatamente1000CaracteresEhAceita() throws Exception {
        String limite = "a".repeat(1000);

        manifestar("FILAMENTO", limite, null, "1");

        verify(doacaoDao).inserir(EMPRESA_ID, TipoDoacao.FILAMENTO, limite, 0, 1);
    }

    // ---------- recusas antes de qualquer acesso ----------

    @Test
    void tipoNuloEhRecusado() throws Exception {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> manifestar(null, DESCRICAO, "1", "1"));

        assertEquals("Tipo obrigatório!", e.getMessage());
        assertNadaGravado();
    }

    @Test
    void tipoEmBrancoEhRecusado() throws Exception {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> manifestar("   ", DESCRICAO, "1", "1"));

        assertEquals("Tipo obrigatório!", e.getMessage());
        assertNadaGravado();
    }

    @Test
    void tipoInvalidoEhRecusado() throws Exception {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> manifestar("PECAS", DESCRICAO, "1", "1"));

        assertTrue(e.getMessage().startsWith("Tipo inválido"));
        assertNadaGravado();
    }

    @Test
    void quantidadeNaoNumericaEhRecusada() throws Exception {
        IllegalArgumentException filamento = assertThrows(IllegalArgumentException.class,
                () -> manifestar("FILAMENTO", DESCRICAO, null, "abc"));
        IllegalArgumentException impressoras = assertThrows(IllegalArgumentException.class,
                () -> manifestar("IMPRESSORA", DESCRICAO, "abc", null));

        assertEquals("Quantidade de filamento inválida!", filamento.getMessage());
        assertEquals("Quantidade de impressoras inválida!", impressoras.getMessage());
        assertNadaGravado();
    }

    @Test
    void ambosRecusaQuantidadeInvalidaEmQualquerUmDosCampos() throws Exception {
        IllegalArgumentException impressoras = assertThrows(IllegalArgumentException.class,
                () -> manifestar("AMBOS", DESCRICAO, "abc", "1"));
        IllegalArgumentException filamento = assertThrows(IllegalArgumentException.class,
                () -> manifestar("AMBOS", DESCRICAO, "1", "abc"));

        assertEquals("Quantidade de impressoras inválida!", impressoras.getMessage());
        assertEquals("Quantidade de filamento inválida!", filamento.getMessage());
        assertNadaGravado();
    }

    @Test
    void quantidadeZeroEhRecusada() throws Exception {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> manifestar("FILAMENTO", DESCRICAO, null, "0"));

        assertEquals("Quantidade de filamento deve ficar entre 1 e 10000!", e.getMessage());
        assertNadaGravado();
    }

    @Test
    void quantidadeNegativaEhRecusada() throws Exception {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> manifestar("IMPRESSORA", DESCRICAO, "-5", null));

        assertEquals("Quantidade de impressoras deve ficar entre 1 e 10000!", e.getMessage());
        assertNadaGravado();
    }

    @Test
    void quantidadeAcimaDoMaximoEhRecusada() throws Exception {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> manifestar("FILAMENTO", DESCRICAO, null, "10001"));

        assertEquals("Quantidade de filamento deve ficar entre 1 e 10000!", e.getMessage());
        assertNadaGravado();
    }

    @Test
    void descricaoNulaEhRecusada() throws Exception {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> manifestar("FILAMENTO", null, null, "1"));

        assertEquals("Descrição obrigatória!", e.getMessage());
        assertNadaGravado();
    }

    @Test
    void descricaoEmBrancoEhRecusada() throws Exception {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> manifestar("FILAMENTO", "   ", null, "1"));

        assertEquals("Descrição obrigatória!", e.getMessage());
        assertNadaGravado();
    }

    @Test
    void descricaoAcimaDoLimiteEhRecusada() throws Exception {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> manifestar("FILAMENTO", "a".repeat(1001), null, "1"));

        assertTrue(e.getMessage().contains("no máximo"));
        assertNadaGravado();
    }

    // ---------- falhas na busca e na gravação ----------

    @Test
    void usuarioSemEmpresaEhRecusadoSemGravar() throws Exception {
        when(empresaDao.buscarPorUsuarioId(999)).thenReturn(null);

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> service.executar(999, "FILAMENTO", DESCRICAO, null, "1"));

        assertEquals("Empresa não encontrada!", e.getMessage());
        verifyNoInteractions(doacaoDao);
    }

    @Test
    void falhaNoBancoPropagaOErroOriginal() throws Exception {
        SQLException erro = new SQLException("banco caiu");
        when(doacaoDao.inserir(anyInt(), any(), anyString(), anyInt(), anyInt())).thenThrow(erro);

        SQLException lancada = assertThrows(SQLException.class,
                () -> manifestar("FILAMENTO", DESCRICAO, null, "1"));

        assertSame(erro, lancada);
    }
}