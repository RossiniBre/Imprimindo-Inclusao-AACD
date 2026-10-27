import { rota, iniciar } from './router.js';

// Por enquanto só existe a tela 404: qualquer endereço cai nela.
// Para criar uma tela nova: pasta pages/<nome>/ com os três arquivos
// e uma linha de rota(...) aqui.
rota('/404', { pagina: 'nao-encontrada', publica: true, titulo: 'Não encontrada' });

iniciar(document.getElementById('conteudo'));