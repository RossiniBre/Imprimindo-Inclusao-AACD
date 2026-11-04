package aacd.http;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;

class StaticHandlerTest {

    @TempDir
    Path tmp;

    private StaticHandler handler;

    @BeforeEach
    void preparar() throws Exception {
        Path publico = Files.createDirectory(tmp.resolve("public"));
        Files.writeString(publico.resolve("index.html"), "<h1>oi</h1>");
        Files.writeString(publico.resolve("estilo.css"), "body{}");
        Files.writeString(publico.resolve("dados.xyz"), "x");
        Files.createDirectory(publico.resolve("pasta"));
        Files.writeString(tmp.resolve("segredo.txt"), "segredo"); // fora de public
        handler = new StaticHandler(publico);
    }

    @Test
    void raizServeIndexHtml() throws Exception {
        FakeExchange ex = new FakeExchange("GET", "/");
        handler.handle(ex);
        assertEquals(200, ex.status());
        assertEquals("text/html; charset=utf-8", ex.cabecalho("Content-Type"));
        assertEquals("<h1>oi</h1>", ex.resposta());
    }

    @Test
    void cssTemContentTypeProprio() throws Exception {
        FakeExchange ex = new FakeExchange("GET", "/estilo.css");
        handler.handle(ex);
        assertEquals(200, ex.status());
        assertEquals("text/css; charset=utf-8", ex.cabecalho("Content-Type"));
    }

    @Test
    void extensaoDesconhecidaSaiComoOctetStream() throws Exception {
        FakeExchange ex = new FakeExchange("GET", "/dados.xyz");
        handler.handle(ex);
        assertEquals("application/octet-stream", ex.cabecalho("Content-Type"));
    }

    @Test
    void arquivoInexistenteResponde404() throws Exception {
        FakeExchange ex = new FakeExchange("GET", "/nao-existe.js");
        handler.handle(ex);
        assertEquals(404, ex.status());
    }

    @Test
    void diretorioResponde404() throws Exception {
        FakeExchange ex = new FakeExchange("GET", "/pasta");
        handler.handle(ex);
        assertEquals(404, ex.status());
    }

    @Test
    void pathTraversalResponde404() throws Exception {
        FakeExchange ex = new FakeExchange("GET", "/../segredo.txt");
        handler.handle(ex);
        assertEquals(404, ex.status());
    }

    @Test
    void pathTraversalCodificadoResponde404() throws Exception {
        FakeExchange ex = new FakeExchange("GET", "/%2e%2e/segredo.txt");
        handler.handle(ex);
        assertEquals(404, ex.status());
    }

    @Test
    void byteNuloResponde404EmVezDeLancarExcecao() throws Exception {
        FakeExchange ex = new FakeExchange("GET", "/index.html%00.png");
        handler.handle(ex);
        assertEquals(404, ex.status());
    }

    @Test
    void metodoDiferenteDeGetResponde405() throws Exception {
        FakeExchange ex = new FakeExchange("POST", "/index.html");
        handler.handle(ex);
        assertEquals(405, ex.status());
        assertEquals("GET", ex.cabecalho("Allow"));
    }
}