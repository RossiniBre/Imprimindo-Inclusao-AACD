import { rota, iniciar } from './router.js';

// Para criar uma tela nova: pasta pages/<nome>/ com os três arquivos
// e uma linha de rota(...) aqui. Endereço desconhecido cai na 404.
rota('/',              { pagina: 'login',          publica: true,  titulo: 'Entrar' });
rota('/login',         { pagina: 'login',          publica: true,  titulo: 'Entrar' });
rota('/esqueci-senha', { pagina: 'esqueci-senha',  publica: true,  titulo: 'Recuperar senha' });
rota('/funcionarios',  { pagina: 'funcionarios',   publica: false, titulo: 'Funcionários' });
rota('/painel-aacd',   { pagina: 'painel-aacd',    publica: false, titulo: 'Acompanhamento' });
rota('/minha-conta',   { pagina: 'minha-conta',    publica: false, titulo: 'Meu perfil' });
rota('/404',           { pagina: 'nao-encontrada', publica: true,  titulo: 'Não encontrada' });

iniciar(document.getElementById('conteudo'));