package aacd.http;

import aacd.config.MongoFactory;
import aacd.dao.ConteudoSolicitacaoDao;
import aacd.dao.UsuarioDao;
import aacd.service.*;
import aacd.storage.ArmazenamentoGridFs;
import com.sun.net.httpserver.HttpServer;

import java.nio.file.Path;

public final class Rotas {

    private Rotas() {}

    public static void registrar(HttpServer servidor, GerenciadorSessoes sessoes) {
        UsuarioDao usuarioDao = new UsuarioDao();
        AutenticacaoService autenticacao = new AutenticacaoService(usuarioDao);
        ArmazenamentoGridFs armazenamento = new ArmazenamentoGridFs(MongoFactory.getDatabase());
        ConteudoSolicitacaoDao conteudoDao = new ConteudoSolicitacaoDao(MongoFactory.getDatabase());

        servidor.createContext("/api/health", ex -> Http.json(ex, 200, "{\"status\":\"ok\"}"));
        servidor.createContext("/api/login", new LoginHandler(autenticacao, sessoes));
        servidor.createContext("/api/logout", new LogoutHandler(sessoes));
        servidor.createContext("/api/me", new MeHandler(sessoes));
        servidor.createContext("/api/empresas", new EmpresaHandler(new CadastrarEmpresa()));
        servidor.createContext("/api/impressoras", new ImpressoraHandler(sessoes, usuarioDao, new CadastrarImpressora()));
        servidor.createContext("/api/empresa/editar", new EditarEmpresaHandler(sessoes));
        servidor.createContext("/api/empresa/perfil", new EmpresaPerfilHandler(sessoes));
        servidor.createContext("/api/usuario/nome", new EditarNomeHandler(sessoes));
        servidor.createContext("/api/usuario/identificador", new EditarIdentificadorHandler(sessoes));
        servidor.createContext("/api/funcionario/editar", new EditarFuncionarioHandler(sessoes));
        servidor.createContext("/api/impressora/editar", new EditarImpressoraHandler(sessoes));
        servidor.createContext("/api/solicitacoes",
                new SolicitacaoHandler(sessoes, new CriarSolicitacao(conteudoDao, armazenamento)));
        servidor.createContext("/api/funcionarios",
                new FuncionarioHandler(sessoes, usuarioDao, new CadastrarFuncionario()));

        servidor.createContext("/", new StaticHandler(Path.of("public")));
    }
}