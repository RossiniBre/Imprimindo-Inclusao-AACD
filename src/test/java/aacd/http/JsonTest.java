package aacd.http;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class JsonTest {

    @Test
    void texto_nuloViraNullJson() {
        Assertions.assertEquals("null", Json.texto(null));
    }

    @Test
    void texto_escapaAspasBarraEQuebras() {
        assertEquals("\"a\\\"b\\\\c\\nd\\re\\tf\"", Json.texto("a\"b\\c\nd\re\tf"));
    }

    @Test
    void texto_escapaCaracterDeControle() {
        assertEquals("\"\\u0001\"", Json.texto("\u0001"));
    }

    @Test
    void texto_preservaAcentos() {
        assertEquals("\"Não autenticado.\"", Json.texto("Não autenticado."));
    }

    @Test
    void objeto_vazio() {
        assertEquals("{}", Json.objeto().build());
    }

    @Test
    void objeto_misturaTipos() {
        String json = Json.objeto()
                .campo("id", 7)
                .campo("nome", "Ana")
                .campo("ativo", true)
                .build();
        assertEquals("{\"id\":7,\"nome\":\"Ana\",\"ativo\":true}", json);
    }

    @Test
    void objeto_campoStringNuloViraNull() {
        String valor = null;
        assertEquals("{\"obs\":null}", Json.objeto().campo("obs", valor).build());
    }

    @Test
    void objeto_campoJsonNaoReescapa() {
        String interno = Json.objeto().campo("cep", "01310100").build();
        assertEquals("{\"endereco\":{\"cep\":\"01310100\"}}",
                Json.objeto().campoJson("endereco", interno).build());
    }

    @Test
    void lista_vaziaECheia() {
        assertEquals("[]", Json.lista(List.of()));
        assertEquals("[{\"a\":1},{\"a\":2}]", Json.lista(List.of("{\"a\":1}", "{\"a\":2}")));
    }
}