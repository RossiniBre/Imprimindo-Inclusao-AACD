package model;

import aacd.model.Empresa;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EmpresaTest {

    private static final String CNPJ_VALIDO = "11222333000181";

    private Empresa nova() {
        return new Empresa(1, "contato@empresa.com", "11999999999", CNPJ_VALIDO);
    }

    @Test
    void construtor_aceitaDadosValidos() {
        Empresa e = nova();
        assertEquals(CNPJ_VALIDO, e.getCnpj());
        assertEquals("contato@empresa.com", e.getEmail());
    }

    @Test
    void cnpj_formatadoEhNormalizado() {
        Empresa e = new Empresa(1, "a@b.com", "11999999999", "11.222.333/0001-81");
        assertEquals(CNPJ_VALIDO, e.getCnpj());
    }

    @Test
    void cnpj_digitoVerificadorErradoRecusa() {
        assertThrows(IllegalArgumentException.class,
                () -> new Empresa(1, "a@b.com", "11999999999", "11222333000182"));
    }

    @Test
    void cnpj_repetidoRecusa() {
        assertThrows(IllegalArgumentException.class,
                () -> new Empresa(1, "a@b.com", "11999999999", "00000000000000"));
    }

    @Test
    void cnpj_nuloOuMalFormadoRecusa() {
        Empresa e = nova();
        assertThrows(IllegalArgumentException.class, () -> e.setCnpj(null));
        assertThrows(IllegalArgumentException.class, () -> e.setCnpj("123"));
    }

    @Test
    void cnpj_invalidoNaoAlteraValorAnterior() {
        Empresa e = nova();
        assertThrows(IllegalArgumentException.class, () -> e.setCnpj("11222333000182"));
        assertEquals(CNPJ_VALIDO, e.getCnpj());
    }

    @Test
    void telefone_exige11Digitos() {
        Empresa e = nova();
        assertThrows(IllegalArgumentException.class, () -> e.setTelefone("1199999999"));
        assertThrows(IllegalArgumentException.class, () -> e.setTelefone("11999999999a"));
        assertThrows(IllegalArgumentException.class, () -> e.setTelefone(null));
    }

    @Test
    void email_fazTrimERecusaInvalidos() {
        Empresa e = nova();
        e.setEmail("  x@y.com ");
        assertEquals("x@y.com", e.getEmail());
        assertThrows(IllegalArgumentException.class, () -> e.setEmail(" "));
        assertThrows(IllegalArgumentException.class, () -> e.setEmail(null));
        assertThrows(IllegalArgumentException.class, () -> e.setEmail("sem-arroba"));
    }

    @Test
    void usuarioIdInvalidoRecusa() {
        assertThrows(IllegalArgumentException.class,
                () -> new Empresa(0, "a@b.com", "11999999999", CNPJ_VALIDO));
    }

    @Test
    void formatacao() {
        Empresa e = nova();
        assertEquals("11.222.333/0001-81", e.getCnpjFormatado());
        assertEquals("(11) 99999-9999", e.getTelefoneFormatado());
    }

    @Test
    void setId_recusaZeroENegativo() {
        Empresa e = nova();
        assertThrows(IllegalArgumentException.class, () -> e.setId(0));
        e.setId(5);
        assertEquals(5, e.getId());
    }
}
