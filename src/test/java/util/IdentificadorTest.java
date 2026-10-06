package util;

import aacd.util.Identificador;
import org.junit.jupiter.api.Test;

import static com.mongodb.assertions.Assertions.assertFalse;
import static com.mongodb.internal.connection.tlschannel.util.Util.assertTrue;
import static org.junit.jupiter.api.Assertions.*;

class IdentificadorTest {

    @Test
    void normalizar_cnpjFormatadoViraPuro() {
        assertEquals("12345678000195", Identificador.normalizar("12.345.678/0001-95"));
    }

    @Test
    void normalizar_loginComumViraMinusculo() {
        assertEquals("joao.silva", Identificador.normalizar("  Joao.Silva "));
    }

    @Test
    void pareceCnpj_detectaFormatadoEPuro() {
        assertTrue(Identificador.pareceCnpj("12.345.678/0001-95"));
        assertTrue(Identificador.pareceCnpj("12345678000195"));
    }

    @Test
    void pareceCnpj_loginComumNaoEhCnpj() {
        assertFalse(Identificador.pareceCnpj("joao.silva"));
    }
}