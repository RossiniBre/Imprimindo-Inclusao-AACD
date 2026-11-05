package aacd.http;

import aacd.dao.UsuarioDao;
import aacd.model.Usuario;
import aacd.service.AlterarEstadoConta;
import aacd.service.ExcluirConta;
import aacd.service.GerenciadorSessoes;
import aacd.util.Senha;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ContaHandlerTest {

    private HttpServer servidor;
    private HttpClient cliente;
    private String base;
    private GerenciadorSessoes sessoes;
    private UsuarioDao usuarioDao;
    private AlterarEstadoConta alterarEstado;
    private ExcluirConta excluirConta;
    private String tokenAdmin;

    @BeforeEach
    void subir() throws Exception {
        sessoes = new GerenciadorSessoes();
        usuarioDao = mock(UsuarioDao.class);
        alterarEstado = mock(AlterarEstadoConta.class);
        excluirConta = mock(ExcluirConta.class);

        // ajuste ao nome real do método que gera o hash na sua classe Senha
        Usuario admin = new Usuario(1, "Root", "root", Senha.gerarHash("senha123"), "ADMIN", true);
        when(usuarioDao.buscarPorId(1)).thenReturn(admin);
        tokenAdmin = sessoes.criar(1, "ADMIN");

        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/api/conta/",
                new ContaHandler(sessoes, usuarioDao, alterarEstado, excluirConta));
        servidor.start();
        base = "http://127.0.0.1:" + servidor.getAddress().getPort();
        cliente = HttpClient.newHttpClient();
    }

    @AfterEach
    void parar() {
        servidor.stop(0);
    }

    private HttpResponse<String> post(String caminho, String token, String corpo) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(base + caminho))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(corpo));
        if (token != null) b.header("Cookie", "SESSAO=" + token);
        return cliente.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void get_devolve405() throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(base + "/api/conta/desativar")).GET().build();
        assertEquals(405, cliente.send(req, HttpResponse.BodyHandlers.ofString()).statusCode());
    }

    @Test
    void semSessao_devolve401() throws Exception {
        assertEquals(401, post("/api/conta/desativar", null, "id=5").statusCode());
        verifyNoInteractions(alterarEstado);
    }

    @Test
    void empresaLogada_devolve403() throws Exception {
        String tokenEmpresa = sessoes.criar(5, "EMPRESA");
        assertEquals(403, post("/api/conta/desativar", tokenEmpresa, "id=6").statusCode());
        assertEquals(403, post("/api/conta/excluir", tokenEmpresa, "id=6&senha=x").statusCode());
        verifyNoInteractions(alterarEstado, excluirConta);
    }

    @Test
    void desativarEReativar_devolvem200() throws Exception {
        assertEquals(200, post("/api/conta/desativar", tokenAdmin, "id=5").statusCode());
        assertEquals(200, post("/api/conta/reativar", tokenAdmin, "id=5").statusCode());
        verify(alterarEstado).desativar(5);
        verify(alterarEstado).reativar(5);
    }

    @Test
    void excluir_senhaCerta_devolve200() throws Exception {
        assertEquals(200, post("/api/conta/excluir", tokenAdmin, "id=5&senha=senha123").statusCode());
        verify(excluirConta).executar(5);
    }

    @Test
    void excluir_senhaErradaOuAusente_devolve403SemExcluir() throws Exception {
        assertEquals(403, post("/api/conta/excluir", tokenAdmin, "id=5&senha=errada").statusCode());
        assertEquals(403, post("/api/conta/excluir", tokenAdmin, "id=5").statusCode());
        verifyNoInteractions(excluirConta);
    }

    @Test
    void mexerEmAdmin_devolve400() throws Exception {
        doThrow(new IllegalArgumentException("Contas de administrador não podem ser alteradas!"))
                .when(alterarEstado).desativar(1);
        assertEquals(400, post("/api/conta/desativar", tokenAdmin, "id=1").statusCode());
    }

    @Test
    void contaInexistente_devolve404() throws Exception {
        doThrow(new IllegalStateException("Conta não encontrada!")).when(alterarEstado).desativar(99);
        assertEquals(404, post("/api/conta/desativar", tokenAdmin, "id=99").statusCode());
    }

    @Test
    void idNaoNumerico_devolve400() throws Exception {
        assertEquals(400, post("/api/conta/desativar", tokenAdmin, "id=abc").statusCode());
    }

    @Test
    void erroDeBanco_devolve500() throws Exception {
        doThrow(new SQLException("x")).when(alterarEstado).desativar(5);
        assertEquals(500, post("/api/conta/desativar", tokenAdmin, "id=5").statusCode());
    }

    @Test
    void rotaDesconhecida_devolve404() throws Exception {
        assertEquals(404, post("/api/conta/outra", tokenAdmin, "id=5").statusCode());
    }
}