package aacd;

import aacd.config.MongoFactory;
import aacd.dao.ConteudoSolicitacaoDao;
import aacd.dao.UsuarioDao;
import aacd.http.*;
import aacd.service.*;
import aacd.storage.ArmazenamentoGridFs;
import com.sun.net.httpserver.HttpServer;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.file.Path;
import java.util.concurrent.Executors;

public class Main {

    public static void main(String[] args) throws Exception {
        int porta = Integer.parseInt(System.getenv().getOrDefault("PORTA", "8080"));

        //só localhost
        HttpServer servidor = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), porta), 0);
        servidor.setExecutor(Executors.newFixedThreadPool(8));

        UsuarioDao usuarioDao = new UsuarioDao();
        AutenticacaoService autenticacao = new AutenticacaoService(usuarioDao);
        GerenciadorSessoes sessoes = new GerenciadorSessoes();
        ArmazenamentoGridFs armazenamento = new ArmazenamentoGridFs(MongoFactory.getDatabase());
        ConteudoSolicitacaoDao conteudoDao = new ConteudoSolicitacaoDao(MongoFactory.getDatabase());
        sessoes.iniciarLimpezaPeriodica(600);

        // Rotas da API ficam sob /api (as próximas entram aqui)
        servidor.createContext("/api/health", ex -> Http.json(ex, 200, "{\"status\":\"ok\"}"));
        servidor.createContext("/api/login", new LoginHandler(autenticacao, sessoes));
        servidor.createContext("/api/logout", new LogoutHandler(sessoes));
        servidor.createContext("/api/me", new MeHandler(sessoes));
        servidor.createContext("/api/empresas", new EmpresaHandler(new CadastrarEmpresa()));
        servidor.createContext("/api/impressoras", new ImpressoraHandler(sessoes, usuarioDao, new CadastrarImpressora()));
        servidor.createContext("/api/empresa/editar", new EditarEmpresaHandler(sessoes));
        servidor.createContext("/api/usuario/nome", new EditarNomeHandler(sessoes));
        servidor.createContext("/api/usuario/identificador", new EditarIdentificadorHandler(sessoes));
        servidor.createContext("/api/funcionario/editar", new EditarFuncionarioHandler(sessoes));
        servidor.createContext("/api/impressora/editar", new EditarImpressoraHandler(sessoes));
        servidor.createContext("/api/solicitacoes",
                new SolicitacaoHandler(sessoes, new CriarSolicitacao(conteudoDao, armazenamento)));

        servidor.createContext("/", new StaticHandler(Path.of("public")));

        servidor.start();
        System.out.println("Servidor no ar: http://localhost:" + porta);
    }
}