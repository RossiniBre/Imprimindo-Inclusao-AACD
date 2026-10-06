package http;

import aacd.http.Http;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class HttpTest {

    @Test
    void lerId_usaPadraoQuandoAusenteOuVazio() {
        assertEquals(7, Http.lerId(Map.of(), "id", 7));
        assertEquals(7, Http.lerId(Map.of("id", "  "), "id", 7));
    }

    @Test
    void lerId_converteNumero() {
        assertEquals(12, Http.lerId(Map.of("id", " 12 "), "id", 7));
    }

    @Test
    void lerId_naoNumericoLancaMensagemFixa() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> Http.lerId(Map.of("id", "abc"), "id", 7));
        assertEquals("Id inválido!", e.getMessage());
    }
}