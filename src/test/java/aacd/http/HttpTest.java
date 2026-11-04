package aacd.http;

import aacd.model.Sessao;
import aacd.service.GerenciadorSessoes;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class HttpTest {

    // ---------- erro ----------

    @Test
    void erro_escreveJsonUtf8() throws Exception {
        FakeExchange ex = new FakeExchange("GET", "/x");
        Http.erro(ex, 404, "Não encontrada.");
        assertEquals(404, ex.status());
        assertEquals("application/json; charset=utf-8", ex.cabecalho("Content-Type"));
        assertEquals("{\"erro\":\"Não encontrada.\"}", ex.resposta());
    }

    @Test
    void erro_mensagemNulaViraTextoPadrao() throws Exception {
        FakeExchange ex = new FakeExchange("GET", "/x");
        Http.erro(ex, 500, null);
        assertEquals("{\"erro\":\"Erro.\"}", ex.resposta());
    }

    @Test
    void erro_mensagemComAspasContinuaJsonValido() throws Exception {
        FakeExchange ex = new FakeExchange("GET", "/x");
        Http.erro(ex, 400, "Valor \"x\" inválido\n");
        assertEquals("{\"erro\":\"Valor \\\"x\\\" inválido\\n\"}", ex.resposta());
    }

    // ---------- lerId ----------

    @Test
    void lerId_usaPadraoQuandoAusenteOuVazio() {
        assertEquals(7, Http.lerId(Map.of(), "id", 7));
        assertEquals(7, Http.lerId(Map.of("id", "  "), "id", 7));
    }

    @Test
    void lerId_converteNumeroComEspacos() {
        assertEquals(12, Http.lerId(Map.of("id", " 12 "), "id", 0));
    }

    @Test
    void lerId_naoNumericoLancaMensagemFixa() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> Http.lerId(Map.of("id", "abc"), "id", 0));
        assertEquals("Id inválido!", e.getMessage());
    }

    @Test
    void lerId_numeroGiganteTambemRecusa() {
        assertThrows(IllegalArgumentException.class,
                () -> Http.lerId(Map.of("id", "99999999999"), "id", 0));
    }

    // ---------- lerFormulario ----------

    @Test
    void lerFormulario_decodificaAcentosMaisEIgual() throws Exception {
        FakeExchange ex = new FakeExchange("POST", "/x",
                "nome=Jo%C3%A3o+Silva&senha=a%3Db&vazio=");
        Optional<Map<String, String>> r = Http.lerFormulario(ex);
        assertTrue(r.isPresent());
        assertEquals("João Silva", r.get().get("nome"));
        assertEquals("a=b", r.get().get("senha"));
        assertEquals("", r.get().get("vazio"));
    }

    @Test
    void lerFormulario_aceitaExatamente4096Bytes() throws Exception {
        String corpo = "a=" + "x".repeat(4094);
        assertEquals(4096, corpo.length());
        Optional<Map<String, String>> r = Http.lerFormulario(new FakeExchange("POST", "/x", corpo));
        assertTrue(r.isPresent());
    }

    @Test
    void lerFormulario_acimaDoLimiteResponde413() throws Exception {
        String corpo = "a=" + "x".repeat(4095);
        FakeExchange ex = new FakeExchange("POST", "/x", corpo);
        assertTrue(Http.lerFormulario(ex).isEmpty());
        assertEquals(413, ex.status());
        assertTrue(ex.resposta().contains("erro"));
    }

    @Test
    void lerFormulario_malformadoResponde400ComMensagemFixa() throws Exception {
        FakeExchange ex = new FakeExchange("POST", "/x", "senha=ab%zz");
        assertTrue(Http.lerFormulario(ex).isEmpty());
        assertEquals(400, ex.status());
        assertEquals("{\"erro\":\"Formulário malformado.\"}", ex.resposta());
    }

    // ---------- lerQuery ----------

    @Test
    void lerQuery_semQueryDevolveMapaVazio() {
        assertTrue(Http.lerQuery(new FakeExchange("GET", "/x")).isEmpty());
    }

    @Test
    void lerQuery_decodificaParametros() {
        Map<String, String> q = Http.lerQuery(new FakeExchange("GET", "/x?id=3&nome=a%20b"));
        assertEquals("3", q.get("id"));
        assertEquals("a b", q.get("nome"));
    }

    // ---------- lerCookie ----------

    @Test
    void lerCookie_encontraEntreVarios() {
        FakeExchange ex = new FakeExchange("GET", "/x").comCookie("a=1; SESSAO=tok; b=2");
        assertEquals("tok", Http.lerCookie(ex, "SESSAO"));
    }

    @Test
    void lerCookie_ausenteOuVazioDevolveNull() {
        assertNull(Http.lerCookie(new FakeExchange("GET", "/x"), "SESSAO"));
        assertNull(Http.lerCookie(new FakeExchange("GET", "/x").comCookie("SESSAO="), "SESSAO"));
    }

    // ---------- exigirPerfil ----------

    private static FakeExchange comSessao(GerenciadorSessoes sessoes, int usuarioId, String perfil)
            throws Exception {
        String token = sessoes.criar(usuarioId, perfil);
        return new FakeExchange("GET", "/x").comCookie("SESSAO=" + token);
    }

    @Test
    void exigirPerfil_semCookieResponde401() throws Exception {
        FakeExchange ex = new FakeExchange("GET", "/x");
        assertTrue(Http.exigirPerfil(ex, new GerenciadorSessoes(), "EMPRESA").isEmpty());
        assertEquals(401, ex.status());
    }

    @Test
    void exigirPerfil_perfilPermitidoDevolveSessao() throws Exception {
        GerenciadorSessoes sessoes = new GerenciadorSessoes();
        FakeExchange ex = comSessao(sessoes, 4, "FUNCIONARIO");
        Optional<Sessao> s = Http.exigirPerfil(ex, sessoes, "FUNCIONARIO", "ADMIN");
        assertTrue(s.isPresent());
        assertEquals(4, s.get().getUsuarioId());
    }

    @Test
    void exigirPerfil_perfilErradoResponde403() throws Exception {
        GerenciadorSessoes sessoes = new GerenciadorSessoes();
        FakeExchange ex = comSessao(sessoes, 4, "EMPRESA");
        assertTrue(Http.exigirPerfil(ex, sessoes, "ADMIN").isEmpty());
        assertEquals(403, ex.status());
    }
}