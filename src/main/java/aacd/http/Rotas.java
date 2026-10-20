package aacd.http;

import aacd.config.ConnectionFactory;
import aacd.config.MongoFactory;
import aacd.dao.ConteudoSolicitacaoDao;
import aacd.dao.ExclusaoContaDao;
import aacd.dao.SolicitacaoEventosDao;
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
        ExclusaoContaDao exclusaoDao = new ExclusaoContaDao();
        ExcluirConta.FornecedorConexao conexoes = ConnectionFactory::getConnection;

        AlterarEstadoConta alterarEstado = new AlterarEstadoConta(usuarioDao, exclusaoDao, sessoes, conexoes);
        ExcluirConta excluirConta = new ExcluirConta(usuarioDao, exclusaoDao, conteudoDao,
                new SolicitacaoEventosDao(), armazenamento, sessoes, conexoes);
        ContaHandler contaHandler = new ContaHandler(sessoes, usuarioDao, alterarEstado, excluirConta);

        // Infra e sessão
        servidor.createContext("/api/health", ex -> Http.json(ex, 200, Json.objeto().campo("status", "ok").build()));
        servidor.createContext("/api/login", new LoginHandler(autenticacao, sessoes));
        servidor.createContext("/api/logout", new LogoutHandler(sessoes));
        servidor.createContext("/api/me", new MeHandler(sessoes));

        // Empresa
        servidor.createContext("/api/empresas", new EmpresaHandler(new CadastrarEmpresa()));
        servidor.createContext("/api/empresa/perfil", new EmpresaPerfilHandler(sessoes));
        servidor.createContext("/api/empresa/editar", new EditarEmpresaHandler(sessoes));

        // Impressoras
        servidor.createContext("/api/impressoras",
                new ImpressoraHandler(sessoes, usuarioDao, new CadastrarImpressora()));
        servidor.createContext("/api/impressora/editar", new EditarImpressoraHandler(sessoes));

        // Usuários e funcionários
        servidor.createContext("/api/usuario/nome", new EditarNomeHandler(sessoes));
        servidor.createContext("/api/usuario/identificador", new EditarIdentificadorHandler(sessoes));
        servidor.createContext("/api/funcionarios",
                new FuncionarioHandler(sessoes, usuarioDao, new CadastrarFuncionario()));
        servidor.createContext("/api/funcionario/editar", new EditarFuncionarioHandler(sessoes));

        // Parceiros (AACD)
        servidor.createContext("/api/parceiros", new ParceiroHandler(sessoes));

        // Solicitações
        servidor.createContext("/api/solicitacoes",
                new SolicitacaoHandler(sessoes, new CriarSolicitacao(conteudoDao, armazenamento)));
        servidor.createContext("/api/solicitacao/ver", new VerSolicitacaoHandler(sessoes));
        servidor.createContext("/api/solicitacao/responder", new ResponderSolicitacaoHandler(sessoes));
        servidor.createContext("/api/solicitacao/arquivo",
                new ArquivoSolicitacaoHandler(sessoes, conteudoDao, armazenamento));

        // Front-end estático (precisa ser o último: "/" casa com tudo que sobrar)
        servidor.createContext("/", new StaticHandler(Path.of("public")));

        // Doações
        servidor.createContext("/api/doacoes", new DoacoesHandler(sessoes));

        // Desativação/Exclusão de contas
        servidor.createContext("/api/conta/desativar", contaHandler);
        servidor.createContext("/api/conta/reativar", contaHandler);
        servidor.createContext("/api/conta/excluir", contaHandler);
    }
}