package aacd.http;

import aacd.model.Disponibilidade;
import aacd.model.Impressora;
import aacd.model.Material;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ImpressoraHandlerTest {

    @Test
    void paraJson_semMateriais_trazListaVazia() {
        Impressora i = new Impressora(7, 3, "Ender 3", Disponibilidade.OCIOSA, true, 220, 220, 250);
        assertEquals(
                "{\"id\":7,\"modelo\":\"Ender 3\",\"disponibilidade\":\"OCIOSA\",\"ativo\":true,"
                        + "\"comprimentoMm\":220,\"larguraMm\":220,\"alturaMm\":250,"
                        + "\"materiais\":[],\"solicitacoesAtivas\":[]}",
                ImpressoraHandler.paraJson(i, Set.of()));
    }

    @Test
    void paraJson_comMateriais_trazCodigoERotulo() {
        Impressora i = new Impressora(7, 3, "Ender 3", Disponibilidade.OCIOSA, true, 220, 220, 250);
        Set<Material> materiais = EnumSet.of(Material.PLA, Material.PETG);
        assertEquals(
                "{\"id\":7,\"modelo\":\"Ender 3\",\"disponibilidade\":\"OCIOSA\",\"ativo\":true,"
                        + "\"comprimentoMm\":220,\"larguraMm\":220,\"alturaMm\":250,"
                        + "\"materiais\":[{\"codigo\":\"PLA\",\"rotulo\":\"PLA\"},"
                        + "{\"codigo\":\"PETG\",\"rotulo\":\"PETG\"}],\"solicitacoesAtivas\":[]}",
                ImpressoraHandler.paraJson(i, materiais));
    }

    @Test
    void paraJson_escapaModeloComAspas() {
        Impressora i = new Impressora(1, 3, "Ender \"3\"", Disponibilidade.OCIOSA, false, 220, 220, 250);
        assertEquals(
                "{\"id\":1,\"modelo\":\"Ender \\\"3\\\"\",\"disponibilidade\":\"OCIOSA\",\"ativo\":false,"
                        + "\"comprimentoMm\":220,\"larguraMm\":220,\"alturaMm\":250,"
                        + "\"materiais\":[],\"solicitacoesAtivas\":[]}",
                ImpressoraHandler.paraJson(i, Set.of()));
    }
}