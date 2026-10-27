package aacd.model;

import aacd.model.Endereco;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EnderecoTest {

    private Endereco comCep(String cep) {
        return new Endereco(cep, "Avenida Paulista", "1000", "Bela Vista", "São Paulo", "SP");
    }

    private Endereco comUf(String uf) {
        return new Endereco("01310100", "Avenida Paulista", "1000", "Bela Vista", "São Paulo", uf);
    }

    @Test
    void aceitaDadosValidos() {
        Endereco e = comCep("01310100");
        assertEquals("01310100", e.getCep());
        assertEquals("Avenida Paulista", e.getRua());
        assertEquals("SP", e.getUf());
    }

    @Test
    void cep_comHifenEhNormalizado() {
        assertEquals("01310100", comCep("01310-100").getCep());
    }

    @Test
    void cep_recusaTamanhoErradoVazioENulo() {
        assertThrows(IllegalArgumentException.class, () -> comCep("0131010"));
        assertThrows(IllegalArgumentException.class, () -> comCep("013101000"));
        assertThrows(IllegalArgumentException.class, () -> comCep(" "));
        assertThrows(IllegalArgumentException.class, () -> comCep(null));
    }

    @Test
    void uf_minusculaViraMaiuscula() {
        assertEquals("RJ", comUf("rj").getUf());
    }

    @Test
    void uf_recusaInexistenteVazioENulo() {
        assertThrows(IllegalArgumentException.class, () -> comUf("XX"));
        assertThrows(IllegalArgumentException.class, () -> comUf("S"));
        assertThrows(IllegalArgumentException.class, () -> comUf(" "));
        assertThrows(IllegalArgumentException.class, () -> comUf(null));
    }

    @Test
    void camposDeTextoSaoObrigatorios() {
        assertThrows(IllegalArgumentException.class,
                () -> new Endereco("01310100", " ", "1000", "Bela Vista", "São Paulo", "SP"));
        assertThrows(IllegalArgumentException.class,
                () -> new Endereco("01310100", "Avenida Paulista", null, "Bela Vista", "São Paulo", "SP"));
        assertThrows(IllegalArgumentException.class,
                () -> new Endereco("01310100", "Avenida Paulista", "1000", "", "São Paulo", "SP"));
        assertThrows(IllegalArgumentException.class,
                () -> new Endereco("01310100", "Avenida Paulista", "1000", "Bela Vista", null, "SP"));
    }
}