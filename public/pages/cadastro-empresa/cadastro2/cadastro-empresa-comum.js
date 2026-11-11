// Regras, rascunho e barra de progresso compartilhados entre as duas etapas do cadastro de empresa.

const CHAVE_RASCUNHO = 'cadastroEmpresaRascunho';
const CHAVE_ANTIGA = 'cadastroEmpresa';

// ---------- Utilitários ----------

export const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

export function mascaraCnpj(valor) {
  return soDigitos(valor)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function mascaraTelefone(valor) {
  return soDigitos(valor)
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
}

export function mascaraCep(valor) {
  return soDigitos(valor).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

// Valida CNPJ numérico (14 dígitos) pelos dígitos verificadores.
export function cnpjValido(cnpj) {
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  const digito = (base) => {
    const pesos = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base.split('').reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = digito(cnpj.slice(0, 12));
  const d2 = digito(cnpj.slice(0, 12) + d1);
  return cnpj.endsWith(`${d1}${d2}`);
}

// ---------- Campos obrigatórios (a barra de progresso conta só estes) ----------

const naoVazio = (mensagem) => (v) => (String(v ?? '').trim() ? null : mensagem);

// Cada regra devolve a mensagem de erro, ou null quando o campo está ok.
// O segundo argumento (todos) traz os valores dos outros campos, para comparações.
export const CAMPOS = {
  // Etapa 1
  razao: { etapa: 1, validar: naoVazio('Informe a razão social.') },
  cnpj: {
    etapa: 1,
    validar: (v) => {
      const d = soDigitos(v);
      if (d.length !== 14) return 'O CNPJ deve ter 14 dígitos.';
      return cnpjValido(d) ? null : 'CNPJ inválido. Confira os números.';
    },
  },
  responsavel: { etapa: 1, validar: naoVazio('Informe o nome do responsável.') },
  telefone: {
    etapa: 1,
    validar: (v) => {
        const n = soDigitos(v).length;
        return n === 10 || n === 11 ? null : 'Telefone deve conter 10 ou 11 dígitos!';
    },
  },
  email: {
    etapa: 1,
    validar: (v) => (/^\S+@\S+\.\S+$/.test(String(v ?? '').trim()) ? null : 'E-mail inválido.'),
  },
  email2: {
    etapa: 1,
    validar: (v, todos) => {
      const confirmacao = String(v ?? '').trim();
      if (!confirmacao) return 'Confirme o e-mail.';
      return confirmacao === String(todos.email ?? '').trim() ? null : 'Os e-mails não conferem.';
    },
  },
  senha: {
    etapa: 1,
    validar: (v) => (String(v ?? '').length >= 8 ? null : 'A senha precisa ter no mínimo 8 caracteres.'),
  },
  senha2: {
    etapa: 1,
    validar: (v, todos) => {
      if (!v) return 'Confirme a senha.';
      return v === todos.senha ? null : 'As senhas não conferem.';
    },
  },

  // Etapa 2
  cep: {
    etapa: 2,
    validar: (v) => (soDigitos(v).length === 8 ? null : 'Informe um CEP válido.'),
  },
  uf: { etapa: 2, validar: naoVazio('Selecione o estado (UF).') },
  cidade: { etapa: 2, validar: naoVazio('Informe a cidade.') },
  bairro: { etapa: 2, validar: naoVazio('Informe o bairro.') },
  logradouro: { etapa: 2, validar: naoVazio('Informe o logradouro.') },
  numero: { etapa: 2, validar: naoVazio('Informe o número.') },
  termos: { etapa: 2, validar: (v) => (v === true ? null : 'Aceite os termos para continuar.') },
};

// Campos opcionais: guardados no rascunho, mas fora da validação e da barra de progresso.
export const OPCIONAIS = { 2: ['complemento'] };

export function idsDaEtapa(etapa) {
  return Object.keys(CAMPOS).filter((id) => CAMPOS[id].etapa === etapa);
}

export function validarCampo(id, valores) {
  return CAMPOS[id].validar(valores[id], valores);
}

// Devolve { idDoCampo: 'mensagem' } só com os campos inválidos, na ordem da tela.
export function validarEtapa(etapa, valores) {
  const erros = {};
  idsDaEtapa(etapa).forEach((id) => {
    const mensagem = validarCampo(id, valores);
    if (mensagem) erros[id] = mensagem;
  });
  return erros;
}

// Um campo só conta no progresso quando está válido, não apenas quando tem algo digitado.
export function calcularProgresso(valores) {
  const ids = Object.keys(CAMPOS);
  const validos = ids.filter((id) => !validarCampo(id, valores)).length;
  return { validos, total: ids.length, porcentagem: Math.round((validos / ids.length) * 100) };
}

// ---------- Rascunho (sobrevive à ida e volta entre as etapas) ----------

export function lerRascunho() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_RASCUNHO) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

export function salvarRascunho(parcial) {
  const novo = { ...lerRascunho(), ...parcial };
  try {
    sessionStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(novo));
  } catch {
    // sessionStorage indisponível: o cadastro segue funcionando, só sem restaurar os campos
  }
  return novo;
}

export function limparRascunho() {
  try {
    sessionStorage.removeItem(CHAVE_RASCUNHO);
    sessionStorage.removeItem(CHAVE_ANTIGA);
  } catch {
    // nada a fazer
  }
}

// ---------- Leitura e preenchimento do formulário ----------

export function lerCampos(container, ids) {
  const valores = {};
  ids.forEach((id) => {
    const el = container.querySelector(`#${id}`);
    if (!el) return;
    valores[id] = el.type === 'checkbox' ? el.checked : el.value;
  });
  return valores;
}

export function preencherCampos(container, valores, ids) {
  ids.forEach((id) => {
    const el = container.querySelector(`#${id}`);
    if (!el || valores[id] === undefined) return;
    if (el.type === 'checkbox') el.checked = Boolean(valores[id]);
    else el.value = valores[id];
  });
}

// ---------- Asteriscos vermelhos nos campos obrigatórios ----------

export function marcarObrigatorios(container, ids) {
  ids.forEach((id) => {
    const el = container.querySelector(`#${id}`);
    if (!el) return;
    el.setAttribute('aria-required', 'true');
    const rotulo = container.querySelector(`label[for="${id}"]`) ?? el.closest('label');
    rotulo?.classList.add('obrigatorio');
  });
}

// ---------- Erro por campo ----------

function ancoraDoCampo(el) {
  if (el.type === 'checkbox') return el.closest('label') ?? el;
  const pai = el.parentElement;
  // campo com botão ao lado (ex.: mostrar senha): o aviso vai depois do grupo todo
  return pai && pai.querySelector('button') ? pai : el;
}

export function mostrarErroCampo(container, id, mensagem) {
  const el = container.querySelector(`#${id}`);
  if (!el) return;

  let aviso = container.querySelector(`#erro-${id}`);
  if (!aviso) {
    aviso = document.createElement('p');
    aviso.id = `erro-${id}`;
    aviso.className = 'campo-erro';
    aviso.setAttribute('aria-live', 'polite');
    ancoraDoCampo(el).insertAdjacentElement('afterend', aviso);
  }

  aviso.textContent = mensagem ?? '';
  aviso.hidden = !mensagem;
  el.classList.toggle('com-erro', Boolean(mensagem));

  if (mensagem) {
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', aviso.id);
  } else {
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  }
}

// Quando a pessoa corrige um campo que estava com erro, o erro some na hora.
export function revalidarMarcados(container, ids, valores) {
  ids.forEach((id) => {
    const el = container.querySelector(`#${id}`);
    if (el?.getAttribute('aria-invalid') === 'true') {
      mostrarErroCampo(container, id, validarCampo(id, valores));
    }
  });
}

// ---------- Barra de progresso ----------

export function criarProgresso(formulario, etapa) {
  const raiz = document.createElement('div');
  raiz.className = 'progresso';
  raiz.innerHTML = `
    <div class="progresso__topo">
      <span class="progresso__titulo">Etapa ${etapa} de 2 · Progresso do cadastro</span>
      <strong class="progresso__valor">0%</strong>
    </div>
    <div class="progresso__trilho" role="progressbar" aria-label="Progresso do cadastro"
         aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
      <div class="progresso__preenchido"></div>
    </div>
    <p class="progresso__detalhe"></p>
  `;
  formulario.prepend(raiz);

  const valor = raiz.querySelector('.progresso__valor');
  const trilho = raiz.querySelector('.progresso__trilho');
  const preenchido = raiz.querySelector('.progresso__preenchido');
  const detalhe = raiz.querySelector('.progresso__detalhe');

  return {
    atualizar(valores) {
      const { validos, total, porcentagem } = calcularProgresso(valores);
      valor.textContent = `${porcentagem}%`;
      preenchido.style.width = `${porcentagem}%`;
      trilho.setAttribute('aria-valuenow', String(porcentagem));
      detalhe.textContent = `${validos} de ${total} campos obrigatórios preenchidos`;
    },
  };
}