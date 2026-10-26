package aacd.service;

import aacd.model.Usuario;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AutorizacaoEdicaoTest {

    private Usuario usuario(int id, String perfil, boolean ativo) {
        return new Usuario(id, "Fulano", "fulano" + id, "hash", perfil, ativo);
    }

    private void editarEmpresa(Usuario ator) throws SQLException {
        new EditarEmpresa().executar(ator, "N", "a@b.com", "11999999999",
                "01310100", "Avenida Paulista", "1000",
                "Bela Vista", "São Paulo", "SP");
    }

    @Test
    void editarEmpresa_recusaAtorNuloOuOutroPerfil() {
        assertThrows(IllegalStateException.class, () -> editarEmpresa(null));
        assertThrows(IllegalStateException.class,
                () -> editarEmpresa(usuario(1, "FUNCIONARIO", true)));
        assertThrows(IllegalStateException.class,
                () -> editarEmpresa(usuario(1, "ADMIN", true)));
    }

    @Test
    void editarEmpresa_recusaEmpresaInativa() {
        assertThrows(IllegalStateException.class,
                () -> editarEmpresa(usuario(1, "EMPRESA", false)));
    }

    @Test
    void editarFuncionario_recusaFuncionarioEditandoOutro() {
        EditarFuncionario s = new EditarFuncionario();
        assertThrows(IllegalStateException.class,
                () -> s.executar(usuario(1, "FUNCIONARIO", true), 2, "ana@teste.com", "Analista", "TI"));
    }

    @Test
    void editarFuncionario_recusaEmpresaEInativo() {
        EditarFuncionario s = new EditarFuncionario();
        assertThrows(IllegalStateException.class,
                () -> s.executar(usuario(1, "EMPRESA", true), 1, "ana@teste.com", "Analista", "TI"));
        assertThrows(IllegalStateException.class,
                () -> s.executar(usuario(1, "FUNCIONARIO", false), 1, "ana@teste.com", "Analista", "TI"));
        assertThrows(IllegalStateException.class,
                () -> s.executar(null, 1, "ana@teste.com", "Analista", "TI"));
    }

    @Test
    void editarImpressora_recusaAtorNuloOuInativo() {
        EditarImpressora s = new EditarImpressora();
        assertThrows(IllegalStateException.class, () -> s.executar(null, 1, "Ender 3", null));
        assertThrows(IllegalStateException.class,
                () -> s.executar(usuario(1, "EMPRESA", false), 1, "Ender 3", null));
    }
}