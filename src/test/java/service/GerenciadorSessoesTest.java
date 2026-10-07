package service;

import aacd.model.Sessao;
import aacd.service.GerenciadorSessoes;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class GerenciadorSessoesTest {

    @Test
    void criarEBuscar_devolveSessaoComDados() {
        GerenciadorSessoes g = new GerenciadorSessoes();
        String token = g.criar(7, "EMPRESA");

        Optional<Sessao> s = g.buscar(token);
        assertTrue(s.isPresent());
        assertEquals(7, s.get().getUsuarioId());
        assertEquals("EMPRESA", s.get().getPerfil());
    }

    @Test
    void tokensSaoDiferentes() {
        GerenciadorSessoes g = new GerenciadorSessoes();
        assertNotEquals(g.criar(1, "ADMIN"), g.criar(1, "ADMIN"));
    }

    @Test
    void buscar_tokenNuloOuDesconhecido() {
        GerenciadorSessoes g = new GerenciadorSessoes();
        assertTrue(g.buscar(null).isEmpty());
        assertTrue(g.buscar("inexistente").isEmpty());
    }

    @Test
    void destruir_removeSessao() {
        GerenciadorSessoes g = new GerenciadorSessoes();
        String token = g.criar(1, "ADMIN");
        g.destruir(token);
        assertTrue(g.buscar(token).isEmpty());
        assertDoesNotThrow(() -> g.destruir(null));
    }

    @Test
    void sessaoExpirada() {
        Sessao s = new Sessao(1, "ADMIN", -1);
        assertTrue(s.expirada());
        s.renovar(60_000);
        assertFalse(s.expirada());
    }
}
