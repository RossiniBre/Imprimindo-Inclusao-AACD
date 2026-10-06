package model;

import aacd.model.Usuario;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class UsuarioTest {

    private Usuario novo() {
        return new Usuario("Maria", "maria", "hash", "FUNCIONARIO");
    }

    @Test
    void setNome_fazTrim() {
        Usuario u = novo();
        u.setNome("  Joana  ");
        assertEquals("Joana", u.getNome());
    }

    @Test
    void setNome_recusaVazioENulo() {
        Usuario u = novo();
        assertThrows(IllegalArgumentException.class, () -> u.setNome("   "));
        assertThrows(IllegalArgumentException.class, () -> u.setNome(null));
    }

    @Test
    void setNome_aceita45eRecusa46() {
        Usuario u = novo();
        u.setNome("a".repeat(45));
        assertEquals(45, u.getNome().length());
        assertThrows(IllegalArgumentException.class, () -> u.setNome("a".repeat(46)));
    }

    @Test
    void setNome_trimAntesDeMedir() {
        Usuario u = novo();
        u.setNome("a".repeat(45) + " ");
        assertEquals(45, u.getNome().length());
    }

    @Test
    void setNome_invalidoNaoAlteraValorAnterior() {
        Usuario u = novo();
        assertThrows(IllegalArgumentException.class, () -> u.setNome(""));
        assertEquals("Maria", u.getNome());
    }

    @Test
    void setIdentificador_normalizaParaMinusculas() {
        Usuario u = novo();
        u.setIdentificador("  JoAo.Silva ");
        assertEquals("joao.silva", u.getIdentificador());
    }

    @Test
    void setIdentificador_recusaVazio() {
        Usuario u = novo();
        assertThrows(IllegalArgumentException.class, () -> u.setIdentificador(" "));
        assertThrows(IllegalArgumentException.class, () -> u.setIdentificador(null));
    }

    @Test
    void setIdentificador_recusaMaisDe45() {
        Usuario u = novo();
        assertThrows(IllegalArgumentException.class,
                () -> u.setIdentificador("a".repeat(46)));
    }

    @Test
    void construtor_recusaPerfilInvalido() {
        assertThrows(IllegalArgumentException.class,
                () -> new Usuario("Maria", "maria", "hash", "GERENTE"));
    }
}