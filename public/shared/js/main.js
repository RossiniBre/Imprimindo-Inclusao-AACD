import { rota, iniciar } from './router.js';

// Para criar uma tela nova: pasta pages/<nome>/ com os três arquivos
// e uma linha de rota(...) aqui. Endereço desconhecido cai na 404.
rota('/',              { pagina: 'login',          publica: true,  titulo: 'Entrar' });
rota('/login',         { pagina: 'login',          publica: true,  titulo: 'Entrar' });
rota('/esqueci-senha', { pagina: 'esqueci-senha',  publica: true,  titulo: 'Recuperar senha' });
rota('/funcionarios',  { pagina: 'funcionarios',   publica: false, titulo: 'Funcionários' });
rota('/404',           { pagina: 'nao-encontrada', publica: true,  titulo: 'Não encontrada' });
rota('/impressoras',   { pagina: 'impressoras',    publica: true,  titulo: 'Impressoras' });
rota('/cadastro-empresa/cadastro1', { pagina: 'cadastro1', pasta: 'cadastro-empresa/cadastro1', publica: true, titulo: 'Cadastro 1/2' });
rota('/cadastro-empresa/cadastro2', { pagina: 'cadastro2', pasta: 'cadastro-empresa/cadastro2', publica: true, titulo: 'Cadastro 2/2' });
rota('/solicitacoes',  { pagina: 'solicitacoes',   publica: true,  titulo: 'Solicitações' });

iniciar(document.getElementById('conteudo'));