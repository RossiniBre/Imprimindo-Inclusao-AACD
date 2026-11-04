package aacd.http;

import aacd.dao.UsuarioDao;
import aacd.service.CadastrarFuncionario;
import aacd.service.GerenciadorSessoes;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FuncionarioHandlerTest {

    private final GerenciadorSessoes sessoes = new GerenciadorSessoes();
    private final FuncionarioHandler handler =
            new FuncionarioHandler(sessoes, new UsuarioDao(), new CadastrarFuncionario());

    private FakeExchange requisicao(String metodo, String caminho, String perfil) throws Exception {
        FakeExchange ex = new FakeExchange(metodo, caminho);
        if (perfil != null) {
            ex.comCookie("SESSAO=" + sessoes.criar(1, perfil));
        }
        return ex;
    }

    @Test
    void metodoNaoSuportadoResponde405ComAllow() throws Exception {
        FakeExchange ex = requisicao("PUT", "/api/funcionarios", "ADMIN");
        handler.handle(ex);
        assertEquals(405, ex.status());
        assertEquals("GET, POST", ex.cabecalho("Allow"));
    }

    @Test
    void listarSemSessaoResponde401() throws Exception {
        FakeExchange ex = requisicao("GET", "/api/funcionarios", null);
        handler.handle(ex);
        assertEquals(401, ex.status());
    }

    @Test
    void empresaNaoListaFuncionarios() throws Exception {
        FakeExchange ex = requisicao("GET", "/api/funcionarios", "EMPRESA");
        handler.handle(ex);
        assertEquals(403, ex.status());
    }

    @Test
    void funcionarioNaoListaFuncionarios() throws Exception {
        FakeExchange ex = requisicao("GET", "/api/funcionarios", "FUNCIONARIO");
        handler.handle(ex);
        assertEquals(403, ex.status());
    }

    @Test
    void cadastrarSemSessaoResponde401() throws Exception {
        FakeExchange ex = requisicao("POST", "/api/funcionarios", null);
        handler.handle(ex);
        assertEquals(401, ex.status());
    }

    @Test
    void empresaNaoCadastraFuncionario() throws Exception {
        FakeExchange ex = requisicao("POST", "/api/funcionarios", "EMPRESA");
        handler.handle(ex);
        assertEquals(403, ex.status());
    }
}