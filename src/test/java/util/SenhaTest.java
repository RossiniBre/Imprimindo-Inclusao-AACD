package util;

import aacd.util.Senha;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SenhaTest {

    @Test
    void hash_confereComSenhaCorreta() {
        String hash = Senha.gerarHash("segredo123");
        assertTrue(Senha.confere("segredo123", hash));
    }

    @Test
    void hash_recusaSenhaErrada() {
        String hash = Senha.gerarHash("segredo123");
        assertFalse(Senha.confere("segredo124", hash));
    }

    @Test
    void hash_usaSaltAleatorio() {
        assertNotEquals(Senha.gerarHash("igual"), Senha.gerarHash("igual"));
    }

    @Test
    void hash_temTresPartesENaoGuardaSenhaPura() {
        String hash = Senha.gerarHash("segredo123");
        assertEquals(3, hash.split(":").length);
        assertFalse(hash.contains("segredo123"));
    }

    @Test
    void confere_formatoInvalidoRetornaFalso() {
        assertFalse(Senha.confere("x", "texto-sem-formato"));
    }
}
