import { rota, iniciar } from './router.js';
import { desenharMenu } from './navbar.js';

// Para criar uma tela nova: pasta pages/<nome>/ com os três arquivos
// e uma linha de rota(...) aqui. Endereço desconhecido cai na 404.
rota('/',              { pagina: 'login',          publica: true,  titulo: 'Entrar' });
rota('/login',         { pagina: 'login',          publica: true,  titulo: 'Entrar' });
rota('/esqueci-senha', { pagina: 'esqueci-senha',  publica: true,  titulo: 'Recuperar senha' });
rota('/funcionarios',  { pagina: 'funcionarios',   publica: false, titulo: 'Funcionários' });
rota('/painel-aacd',   { pagina: 'painel-aacd',    publica: false, titulo: 'Acompanhamento' });
rota('/minha-conta',         { pagina: 'minha-conta',         publica: false, titulo: 'Meu perfil' });
rota('/minha-conta-empresa', { pagina: 'minha-conta-empresa', publica: false, titulo: 'Minha conta' });
rota('/vire-apoiador',       { pagina: 'vire-apoiador',       publica: true,  titulo: 'Vire Apoiador' });
rota('/404',           { pagina: 'nao-encontrada', publica: true,  titulo: 'Não encontrada' });
rota('/impressoras',   { pagina: 'impressoras',    publica: true,  titulo: 'Minhas impressoras' });
rota('/cadastro-empresa/cadastro1', { pagina: 'cadastro1', pasta: 'cadastro-empresa/cadastro1', publica: true, titulo: 'Cadastro 1/2' });
rota('/cadastro-empresa/cadastro2', { pagina: 'cadastro2', pasta: 'cadastro-empresa/cadastro2', publica: true, titulo: 'Cadastro 2/2' });
rota('/solicitacoes', { pagina: 'solicitacoes', pasta: 'Solicitacoes-empresa', publica: true, titulo: 'Solicitações' });
rota('/impressoras-aacd', { pagina: 'impressoras-aacd', publica: false, titulo: 'Impressoras' });
rota('/parceiros',        { pagina: 'parceiros',        publica: false, titulo: 'Parceiros' });
rota('/doacoes',          { pagina: 'doacoes',          publica: false, titulo: 'Doações' });
rota('/reescolher-empresa', { pagina: 'reescolher-empresa', publica: false, titulo: 'Escolher empresa' });

window.addEventListener('hashchange', desenharMenu);
desenharMenu();
iniciar(document.getElementById('conteudo'));