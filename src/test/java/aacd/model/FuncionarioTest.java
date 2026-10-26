package aacd.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FuncionarioTest {

    private static final String EMAIL = "ana@aacd.com";

    // ---------- construtores ----------

    @Test
    void construtorSemId_iniciaComIdZero() {
        Funcionario f = new Funcionario(1, EMAIL, "Analista", "TI");
        assertEquals(0, f.getId());
        assertEquals(1, f.getUsuarioId());
        assertEquals(EMAIL, f.getEmail());
        assertEquals("Analista", f.getCargo());
        assertEquals("TI", f.getSetor());
    }

    @Test
    void construtorComId_guardaOId() {
        Funcionario f = new Funcionario(7, 1, EMAIL, "Analista", "TI");
        assertEquals(7, f.getId());
    }

    @Test
    void usuarioIdInvalidoRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new Funcionario(0, EMAIL, "a", "b"));
        assertThrows(IllegalArgumentException.class, () -> new Funcionario(-1, EMAIL, "a", "b"));
    }

    // ---------- id ----------

    @Test
    void setId_aceitaPositivo() {
        Funcionario f = new Funcionario(1, EMAIL, "a", "b");
        f.setId(5);
        assertEquals(5, f.getId());
    }

    @Test
    void setId_recusaZeroENegativo() {
        Funcionario f = new Funcionario(1, EMAIL, "a", "b");
        assertThrows(IllegalArgumentException.class, () -> f.setId(0));
        assertThrows(IllegalArgumentException.class, () -> f.setId(-3));
    }

    // ---------- email ----------

    @Test
    void emailInvalido_noConstrutorRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new Funcionario(1, "invalido", "a", "b"));
    }

    @Test
    void emailNulo_recusa() {
        assertThrows(IllegalArgumentException.class, () -> new Funcionario(1, null, "a", "b"));
    }

    @Test
    void setEmail_invalidoRecusaEMantemOAnterior() {
        Funcionario f = new Funcionario(1, EMAIL, "a", "b");
        assertThrows(IllegalArgumentException.class, () -> f.setEmail("invalido"));
        assertEquals(EMAIL, f.getEmail());
    }

    @Test
    void setEmail_validoAtualiza() {
        Funcionario f = new Funcionario(1, EMAIL, "a", "b");
        f.setEmail("outro@aacd.com");
        assertEquals("outro@aacd.com", f.getEmail());
    }

    // ---------- cargo e setor ----------

    @Test
    void cargoESetor_fazemTrim() {
        Funcionario f = new Funcionario(1, EMAIL, "  Analista ", " TI ");
        assertEquals("Analista", f.getCargo());
        assertEquals("TI", f.getSetor());
    }

    @Test
    void cargoESetor_vazioOuNuloViraNulo() {
        Funcionario f = new Funcionario(1, EMAIL, "  ", null);
        assertNull(f.getCargo());
        assertNull(f.getSetor());
    }

    @Test
    void cargo_aceita45eRecusa46() {
        Funcionario f = new Funcionario(1, EMAIL, "a", "b");
        f.setCargo("a".repeat(45));
        assertEquals(45, f.getCargo().length());
        assertThrows(IllegalArgumentException.class, () -> f.setCargo("a".repeat(46)));
    }

    @Test
    void setor_aceita45eRecusa46() {
        Funcionario f = new Funcionario(1, EMAIL, "a", "b");
        f.setSetor("a".repeat(45));
        assertEquals(45, f.getSetor().length());
        assertThrows(IllegalArgumentException.class, () -> f.setSetor("a".repeat(46)));
    }

    @Test
    void mensagemDeErro_citaOCampo() {
        Funcionario f = new Funcionario(1, EMAIL, "a", "b");
        Exception e = assertThrows(IllegalArgumentException.class, () -> f.setCargo("a".repeat(46)));
        assertTrue(e.getMessage().contains("Cargo"));
    }

    @Test
    void email_deOutroDominioRecusa() {
        assertThrows(IllegalArgumentException.class,
                () -> new Funcionario(1, "ana@teste.com", "a", "b"));
    }
}