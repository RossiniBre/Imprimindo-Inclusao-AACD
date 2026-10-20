package aacd.model;

import aacd.model.Disponibilidade;
import aacd.model.Impressora;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ImpressoraTest {

    @Test
    void construtorSimples_usaPadroes() {
        Impressora i = new Impressora(3, "  Ender 3 ");
        assertEquals("Ender 3", i.getModelo());
        assertEquals(Disponibilidade.OCIOSA, i.getDisponibilidade());
        assertTrue(i.isAtivo());
        assertEquals(0, i.getId());
    }

    @Test
    void empresaInvalidaRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new Impressora(0, "Ender 3"));
    }

    @Test
    void modeloVazioOuNuloRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new Impressora(1, " "));
        assertThrows(IllegalArgumentException.class, () -> new Impressora(1, null));
    }

    @Test
    void disponibilidadeNulaRecusa() {
        assertThrows(IllegalArgumentException.class,
                () -> new Impressora(1, 1, "Ender 3", null, true));
    }

    @Test
    void setModelo_invalidoNaoAlteraValorAnterior() {
        Impressora i = new Impressora(1, "Ender 3");
        assertThrows(IllegalArgumentException.class, () -> i.setModelo(""));
        assertEquals("Ender 3", i.getModelo());
    }

    @Test
    void setId_recusaZero() {
        Impressora i = new Impressora(1, "Ender 3");
        assertThrows(IllegalArgumentException.class, () -> i.setId(0));
        i.setId(9);
        assertEquals(9, i.getId());
    }

    @Test
    void setAtivo_alterna() {
        Impressora i = new Impressora(1, "Ender 3");
        i.setAtivo(false);
        assertFalse(i.isAtivo());
    }

    @Test
    void materiais_comecamVazios() {
        Impressora i = new Impressora(1, "Ender 3");
        assertTrue(i.getMateriais().isEmpty());
    }

    @Test
    void setMateriais_guardaOConjunto() {
        Impressora i = new Impressora(1, "Ender 3");
        i.setMateriais(Set.of(Material.PLA, Material.ABS));
        assertEquals(Set.of(Material.PLA, Material.ABS), i.getMateriais());
    }

    @Test
    void setMateriais_recusaVazioENulo() {
        Impressora i = new Impressora(1, "Ender 3");
        assertThrows(IllegalArgumentException.class, () -> i.setMateriais(Set.of()));
        assertThrows(IllegalArgumentException.class, () -> i.setMateriais(null));
    }

    @Test
    void getMateriais_naoPermiteAlterarPorFora() {
        Impressora i = new Impressora(1, "Ender 3");
        i.setMateriais(Set.of(Material.PLA));
        assertThrows(UnsupportedOperationException.class, () -> i.getMateriais().add(Material.ABS));
    }
}
