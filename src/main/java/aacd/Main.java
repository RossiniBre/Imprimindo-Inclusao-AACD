package aacd;

import aacd.http.Rotas;
import aacd.service.*;
import com.sun.net.httpserver.HttpServer;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

public class Main {

    public static void main(String[] args) throws Exception {
        int porta = Integer.parseInt(System.getenv().getOrDefault("PORTA", "8080"));

        //só localhost
        HttpServer servidor = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), porta), 0);
        servidor.setExecutor(Executors.newFixedThreadPool(8));

        GerenciadorSessoes sessoes = new GerenciadorSessoes();
        sessoes.iniciarLimpezaPeriodica(600);

        Rotas.registrar(servidor, sessoes);

        servidor.start();
        System.out.println("Servidor no ar: http://localhost:" + porta);
    }
}