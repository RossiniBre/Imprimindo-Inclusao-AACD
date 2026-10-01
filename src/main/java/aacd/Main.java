package aacd;

import aacd.dao.UsuarioDao;
import aacd.http.*;
import aacd.service.AutenticacaoService;
import aacd.service.GerenciadorSessoes;
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
        sessoes.iniciarLimpezaPeriodica(600);

        // Rotas da API ficam sob /api (as próximas entram aqui)
        servidor.createContext("/api/health", ex -> Http.json(ex, 200, "{\"status\":\"ok\"}"));
        servidor.createContext("/api/login", new LoginHandler(autenticacao, sessoes));
        servidor.createContext("/api/logout", new LogoutHandler(sessoes));
        servidor.createContext("/api/me", new MeHandler(sessoes));

        servidor.createContext("/", new StaticHandler(Path.of("public")));

        servidor.start();
        System.out.println("Servidor no ar: http://localhost:" + porta);
    }
}