package util;

import aacd.util.Identificador;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class IdentificadorExtraTest {

    @Test
    void normalizar_cnpjAlfanumericoFicaMaiusculo() {
        assertEquals("AB123456000199", Identificador.normalizar("ab.123.456/0001-99"));
    }

    @Test
    void normalizar_cnpjPuroMinusculoFicaMaiusculo() {
        assertEquals("AB123456000199", Identificador.normalizar("ab123456000199"));
    }

    @Test
    void normalizar_fazTrim() {
        assertEquals("maria", Identificador.normalizar("  MARIA  "));
    }

    @Test
    void pareceCnpj_recusaTamanhoErrado() {
        assertFalse(Identificador.pareceCnpj("1234567800019"));
        assertFalse(Identificador.pareceCnpj("123456780001955"));
    }
}
