// services/senha.js
import { createHash } from 'node:crypto';

export async function senhaVazada(senha) {
  const hash = createHash('sha1').update(senha).digest('hex').toUpperCase();
  const prefixo = hash.slice(0, 5);
  const sufixo = hash.slice(5);
  try {
    const resp = await fetch(`https://api.pwnedpasswords.com/range/${prefixo}`, {
      signal: AbortSignal.timeout(3000),
      headers: { 'Add-Padding': 'true' },
    });
    if (!resp.ok) return false;
    return (await resp.text()).split('\n').some((linha) => {
      const [s, n] = linha.trim().split(':');
      return s === sufixo && Number(n) > 0;
    });
  } catch {
    return false;
  }
}

export async function validarSenhaNova(senha) {
  if (await senhaVazada(senha)) {
    return 'Essa senha apareceu em vazamentos de dados. Escolha outra.';
  }
  return null;
}