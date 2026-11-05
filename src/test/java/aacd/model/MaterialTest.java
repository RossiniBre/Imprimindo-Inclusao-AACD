package aacd.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MaterialTest {

    @Test
    void todoMaterialTemRotulo() {
        for (Material m : Material.values()) {
            assertNotNull(m.getRotulo());
            assertFalse(m.getRotulo().isBlank());
        }
    }

    @Test
    void nomeInvalidoNaoVira​Material() {
        assertThrows(IllegalArgumentException.class, () -> Material.valueOf("INEXISTENTE"));
    }
}