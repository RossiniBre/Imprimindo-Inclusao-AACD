package aacd.http;

import aacd.service.GerenciadorSessoes;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ParceiroHandlerTest {

    private final GerenciadorSessoes sessoes = new GerenciadorSessoes();
    private final ParceiroHandler handler = new ParceiroHandler(sessoes);

    private FakeExchange requisicao(String metodo, String caminho, String perfil) throws Exception {
        FakeExchange ex = new FakeExchange(metodo, caminho);
        if (perfil != null) {
            ex.comCookie("SESSAO=" + sessoes.criar(1, perfil));
        }
        return ex;
    }

    @Test
    void metodoDiferenteDeGetResponde405ComAllow() throws Exception {
        FakeExchange ex = requisicao("POST", "/api/parceiros", "ADMIN");
        handler.handle(ex);
        assertEquals(405, ex.status());
        assertEquals("GET", ex.cabecalho("Allow"));
    }

    @Test
    void semSessaoResponde401() throws Exception {
        FakeExchange ex = requisicao("GET", "/api/parceiros", null);
        handler.handle(ex);
        assertEquals(401, ex.status());
    }

    @Test
    void empresaNaoAcessaParceiros() throws Exception {
        FakeExchange ex = requisicao("GET", "/api/parceiros", "EMPRESA");
        handler.handle(ex);
        assertEquals(403, ex.status()); // falha enquanto exigirPerfil devolver 401
    }

    @Test
    void caminhoDesconhecidoResponde404() throws Exception {
        FakeExchange ex = requisicao("GET", "/api/parceiros/abc", "FUNCIONARIO");
        handler.handle(ex);
        assertEquals(404, ex.status());
    }

    @Test
    void idNaoNumericoNoCaminhoDasImpressorasResponde404() throws Exception {
        FakeExchange ex = requisicao("GET", "/api/parceiros/x/impressoras", "ADMIN");
        handler.handle(ex);
        assertEquals(404, ex.status());
    }
}