package aacd.model;

import aacd.model.Disponibilidade;
import aacd.model.Impressora;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ImpressoraTest {

    private static Impressora nova(int empresaId, String modelo) {
        return new Impressora(empresaId, modelo, 220, 220, 250);
    }

    @Test
    void construtorSimples_usaPadroes() {
        Impressora i = nova(3, "  Ender 3 ");
        assertEquals("Ender 3", i.getModelo());
        assertEquals(Disponibilidade.OCIOSA, i.getDisponibilidade());
        assertTrue(i.isAtivo());
        assertEquals(0, i.getId());
    }

    @Test
    void empresaInvalidaRecusa() {
        assertThrows(IllegalArgumentException.class, () -> nova(0, "Ender 3"));
    }

    @Test
    void modeloVazioOuNuloRecusa() {
        assertThrows(IllegalArgumentException.class, () -> nova(1, " "));
        assertThrows(IllegalArgumentException.class, () -> nova(1, null));
    }

    @Test
    void disponibilidadeNulaRecusa() {
        assertThrows(IllegalArgumentException.class,
                () -> new Impressora(1, 1, "Ender 3", null, true, 220, 220, 250));
    }

    @Test
    void setModelo_invalidoNaoAlteraValorAnterior() {
        Impressora i = nova(1, "Ender 3");
        assertThrows(IllegalArgumentException.class, () -> i.setModelo(""));
        assertEquals("Ender 3", i.getModelo());
    }

    @Test
    void setId_recusaZero() {
        Impressora i = nova(1, "Ender 3");
        assertThrows(IllegalArgumentException.class, () -> i.setId(0));
        i.setId(9);
        assertEquals(9, i.getId());
    }

    @Test
    void setAtivo_alterna() {
        Impressora i = nova(1, "Ender 3");
        i.setAtivo(false);
        assertFalse(i.isAtivo());
    }

    @Test
    void materiais_comecamVazios() {
        Impressora i = nova(1, "Ender 3");
        assertTrue(i.getMateriais().isEmpty());
    }

    @Test
    void setMateriais_guardaOConjunto() {
        Impressora i = nova(1, "Ender 3");
        i.setMateriais(Set.of(Material.PLA, Material.ABS));
        assertEquals(Set.of(Material.PLA, Material.ABS), i.getMateriais());
    }

    @Test
    void setMateriais_recusaVazioENulo() {
        Impressora i = nova(1, "Ender 3");
        assertThrows(IllegalArgumentException.class, () -> i.setMateriais(Set.of()));
        assertThrows(IllegalArgumentException.class, () -> i.setMateriais(null));
    }

    @Test
    void getMateriais_naoPermiteAlterarPorFora() {
        Impressora i = nova(1, "Ender 3");
        i.setMateriais(Set.of(Material.PLA));
        assertThrows(UnsupportedOperationException.class, () -> i.getMateriais().add(Material.ABS));
    }

    @Test
    void guardaAsMedidasDeCapacidade() {
        Impressora i = new Impressora(1, "Ender 3 V2", 220, 220, 250);

        assertEquals(220, i.getComprimentoMm());
        assertEquals(220, i.getLarguraMm());
        assertEquals(250, i.getAlturaMm());
    }

    @Test
    void recusaMedidaZeroOuNegativa() {
        assertThrows(IllegalArgumentException.class,
                () -> new Impressora(1, "Ender 3 V2", 0, 220, 250));
        assertThrows(IllegalArgumentException.class,
                () -> new Impressora(1, "Ender 3 V2", 220, -5, 250));
        assertThrows(IllegalArgumentException.class,
                () -> new Impressora(1, "Ender 3 V2", 220, 220, 0));
    }
}