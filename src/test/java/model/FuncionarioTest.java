package model;

import aacd.model.Funcionario;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FuncionarioTest {

    @Test
    void cargoESetor_fazemTrim() {
        Funcionario f = new Funcionario(1, "  Analista ", " TI ");
        assertEquals("Analista", f.getCargo());
        assertEquals("TI", f.getSetor());
    }

    @Test
    void cargoESetor_vazioViraNulo() {
        Funcionario f = new Funcionario(1, "  ", null);
        assertNull(f.getCargo());
        assertNull(f.getSetor());
    }

    @Test
    void cargo_aceita45eRecusa46() {
        Funcionario f = new Funcionario(1, "a", "b");
        f.setCargo("a".repeat(45));
        assertThrows(IllegalArgumentException.class, () -> f.setCargo("a".repeat(46)));
    }

    @Test
    void setor_recusaMaisDe45() {
        Funcionario f = new Funcionario(1, "a", "b");
        assertThrows(IllegalArgumentException.class, () -> f.setSetor("a".repeat(46)));
    }

    @Test
    void usuarioIdInvalidoRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new Funcionario(0, "a", "b"));
    }
}
