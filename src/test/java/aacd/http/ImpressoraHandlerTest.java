package aacd.http;

import aacd.model.Disponibilidade;
import aacd.model.Impressora;
import aacd.model.Material;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ImpressoraHandlerTest {

    @Test
    void paraJson_semMateriais_trazListaVazia() {
        Impressora i = new Impressora(7, 3, "Ender 3", Disponibilidade.OCIOSA, true);
        Assertions.assertEquals(
                "{\"id\":7,\"modelo\":\"Ender 3\",\"disponibilidade\":\"OCIOSA\",\"ativo\":true,\"materiais\":[]}",
                ImpressoraHandler.paraJson(i, Set.of()));
    }

    @Test
    void paraJson_comMateriais_trazCodigoERotulo() {
        Impressora i = new Impressora(7, 3, "Ender 3", Disponibilidade.OCIOSA, true);
        Set<Material> materiais = EnumSet.of(Material.PLA, Material.PETG);
        assertEquals(
                "{\"id\":7,\"modelo\":\"Ender 3\",\"disponibilidade\":\"OCIOSA\",\"ativo\":true,"
                        + "\"materiais\":[{\"codigo\":\"PLA\",\"rotulo\":\"PLA\"},"
                        + "{\"codigo\":\"PETG\",\"rotulo\":\"PETG\"}]}",
                ImpressoraHandler.paraJson(i, materiais));
    }

    @Test
    void paraJson_escapaModeloComAspas() {
        Impressora i = new Impressora(1, 3, "Ender \"3\"", Disponibilidade.OCIOSA, false);
        assertEquals(
                "{\"id\":1,\"modelo\":\"Ender \\\"3\\\"\",\"disponibilidade\":\"OCIOSA\",\"ativo\":false,\"materiais\":[]}",
                ImpressoraHandler.paraJson(i, Set.of()));
    }
}