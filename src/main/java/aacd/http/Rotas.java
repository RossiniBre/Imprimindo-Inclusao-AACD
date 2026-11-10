package aacd.http;

import aacd.config.ConnectionFactory;
import aacd.config.MongoFactory;
import aacd.dao.*;
import aacd.service.*;
import aacd.storage.ArmazenamentoGridFs;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.nio.file.Path;

public final class Rotas {

    private Rotas() {}

    private static final SegurancaFilter SEGURANCA = new SegurancaFilter();

    private static void rota(HttpServer servidor, String caminho, HttpHandler handler) {
        servidor.createContext(caminho, handler).getFilters().add(SEGURANCA);
    }

    public static void registrar(HttpServer servidor, GerenciadorSessoes sessoes) {
        UsuarioDao usuarioDao = new UsuarioDao();
        AutenticacaoService autenticacao = new AutenticacaoService(usuarioDao);
        ArmazenamentoGridFs armazenamento = new ArmazenamentoGridFs(MongoFactory.getDatabase());
        ConteudoSolicitacaoDao conteudoDao = new ConteudoSolicitacaoDao(MongoFactory.getDatabase());
        ExclusaoContaDao exclusaoDao = new ExclusaoContaDao();
        ExcluirConta.FornecedorConexao conexoes = ConnectionFactory::getConnection;

        AlterarEstadoConta alterarEstado = new AlterarEstadoConta(usuarioDao, exclusaoDao, sessoes, conexoes);
        ExcluirConta excluirConta = new ExcluirConta(usuarioDao, exclusaoDao, conteudoDao,
                new SolicitacaoEventosDao(), armazenamento, sessoes, conexoes,
                new ImpressoraMateriaisDao());
        ContaHandler contaHandler = new ContaHandler(sessoes, usuarioDao, alterarEstado, excluirConta);
        EnviadorEmail enviador = new EnviadorEmailJakarta();
        RedefinicaoSenhaService redefinicao = new RedefinicaoSenhaService(enviador, sessoes);

        // Infra e sessão
        rota(servidor, "/api/health", ex -> Http.json(ex, 200, Json.objeto().campo("status", "ok").build()));
        rota(servidor, "/api/login", new LoginHandler(autenticacao, sessoes));
        rota(servidor, "/api/esqueci-senha", new EsqueciSenhaHandler(redefinicao));
        rota(servidor, "/api/redefinir-senha", new RedefinirSenhaHandler(redefinicao));
        rota(servidor, "/api/logout", new LogoutHandler(sessoes));
        rota(servidor, "/api/me", new MeHandler(sessoes, usuarioDao));

        // Empresa
        rota(servidor, "/api/empresas", new EmpresaHandler(new CadastrarEmpresa()));
        rota(servidor, "/api/empresa/perfil", new EmpresaPerfilHandler(sessoes));
        rota(servidor, "/api/empresa/editar", new EditarEmpresaHandler(sessoes));

        // Impressoras
        rota(servidor, "/api/impressoras",
                new ImpressoraHandler(sessoes, usuarioDao, new CadastrarImpressora()));
        rota(servidor, "/api/impressora/editar", new EditarImpressoraHandler(sessoes));
        rota(servidor, "/api/impressoras/painel", new ImpressoraPainelHandler(sessoes));
        rota(servidor, "/api/impressora/remover", new RemoverImpressoraHandler(sessoes));
        rota(servidor, "/api/impressora/ativo", new AlterarAtivoImpressoraHandler(sessoes));

        // Usuários e funcionários
        rota(servidor, "/api/usuario/nome", new EditarNomeHandler(sessoes));
        rota(servidor, "/api/usuario/identificador", new EditarIdentificadorHandler(sessoes));
        rota(servidor, "/api/funcionarios",
                new FuncionarioHandler(sessoes, usuarioDao, new CadastrarFuncionario()));
        rota(servidor, "/api/funcionario/editar", new EditarFuncionarioHandler(sessoes));

        // Parceiros (AACD)
        rota(servidor, "/api/parceiros", new ParceiroHandler(sessoes));

        // Solicitações
        rota(servidor, "/api/solicitacoes",
        new SolicitacaoHandler(sessoes,
                new CriarSolicitacao(conteudoDao, armazenamento),
                conteudoDao));
        rota(servidor, "/api/solicitacao/ver", new VerSolicitacaoHandler(sessoes));
        rota(servidor, "/api/solicitacao/responder", new ResponderSolicitacaoHandler(sessoes));
        rota(servidor, "/api/solicitacao/arquivo",
                new ArquivoSolicitacaoHandler(sessoes, conteudoDao, armazenamento));
        rota(servidor, "/api/solicitacao/cancelar", new CancelarSolicitacaoHandler(sessoes));
        rota(servidor, "/api/solicitacao/excluir",
                new ExcluirSolicitacaoHandler(sessoes, new ExcluirSolicitacao(conteudoDao, armazenamento)));
        rota(servidor, "/api/solicitacao/detalhe",
                new DetalheSolicitacaoEmpresaHandler(sessoes, conteudoDao));

        // Doações
        rota(servidor, "/api/doacoes", new DoacoesHandler(sessoes));
        rota(servidor, "/api/doacoes/excluir", new DoacaoExcluirHandler(sessoes));

        // Desativação/Exclusão de contas
        rota(servidor, "/api/conta/desativar", contaHandler);
        rota(servidor, "/api/conta/reativar", contaHandler);
        rota(servidor, "/api/conta/excluir", contaHandler);

        // Front-end estático ("/" é o fallback: o HttpServer escolhe o caminho mais específico)
        rota(servidor, "/", new StaticHandler(Path.of("public")));
    }
}