package aacd.http;

import aacd.model.Disponibilidade;
import aacd.model.Impressora;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ImpressoraHandlerTest {

    @Test
    void paraJson_trazOsQuatroCampos() {
        Impressora i = new Impressora(7, 3, "Ender 3", Disponibilidade.OCIOSA, true);
        Assertions.assertEquals("{\"id\":7,\"modelo\":\"Ender 3\",\"disponibilidade\":\"OCIOSA\",\"ativo\":true}",
                ImpressoraHandler.paraJson(i));
    }

    @Test
    void paraJson_escapaModeloComAspas() {
        Impressora i = new Impressora(1, 3, "Ender \"3\"", Disponibilidade.OCIOSA, false);
        assertEquals("{\"id\":1,\"modelo\":\"Ender \\\"3\\\"\",\"disponibilidade\":\"OCIOSA\",\"ativo\":false}",
                ImpressoraHandler.paraJson(i));
    }
}