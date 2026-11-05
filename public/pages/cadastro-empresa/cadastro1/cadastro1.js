// Valida CNPJ numérico (14 dígitos) pelos dígitos verificadores.
function cnpjValido(cnpj) {
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

export function iniciar(container) {
  const campo = (id) => container.querySelector('#' + id);
  const formulario = campo('cadastro-form');
  const erroGeral = campo('erro-geral');

  function mostrarErro(texto, idCampo) {
    erroGeral.textContent = texto;
    erroGeral.hidden = false;
    campo(idCampo).focus();
  }

  // Envio: valida e vai para a etapa 2
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    erroGeral.hidden = true;

    const dados = {
      razaoSocial: campo('razao').value.trim(),
      cnpj: campo('cnpj').value.replace(/\D/g, ''),
      responsavel: campo('responsavel').value.trim(),
      telefone: campo('telefone').value.replace(/\D/g, ''),
      email: campo('email').value.trim(),
      senha: campo('senha').value,
    };

    if (!dados.razaoSocial) return mostrarErro('Informe a razão social.', 'razao');
    if (dados.cnpj.length !== 14) return mostrarErro('O CNPJ deve ter 14 dígitos.', 'cnpj');
    if (!cnpjValido(dados.cnpj)) return mostrarErro('CNPJ inválido. Confira os números.', 'cnpj');
    if (!dados.responsavel) return mostrarErro('Informe o nome do responsável.', 'responsavel');
    if (dados.telefone.length < 10) return mostrarErro('Telefone inválido.', 'telefone');
    if (!/^\S+@\S+\.\S+$/.test(dados.email)) return mostrarErro('E-mail inválido.', 'email');
    if (dados.email !== campo('email2').value.trim()) return mostrarErro('Os e-mails não conferem.', 'email2');
    if (dados.senha.length < 8) return mostrarErro('A senha precisa ter no mínimo 8 caracteres.', 'senha');
    if (dados.senha !== campo('senha2').value) return mostrarErro('As senhas não conferem.', 'senha2');

    sessionStorage.setItem('cadastroEmpresa', JSON.stringify(dados));
    location.hash = '#/cadastro-empresa/cadastro2';
  });

  // Cancelar: volta para o login
  campo('btn-cancelar').addEventListener('click', () => {
    location.hash = '#/login';
  });

  // Mostrar / ocultar senha
  container.querySelectorAll('.botao-senha').forEach((botao) => {
    botao.addEventListener('click', () => {
      const input = campo(botao.dataset.target);
      const mostrar = input.type === 'password';

      input.type = mostrar ? 'text' : 'password';
      botao.querySelector('i').className = mostrar ? 'bi bi-eye-slash' : 'bi bi-eye';
      botao.setAttribute('aria-pressed', String(mostrar));
    });
  });

  // Máscara de CNPJ: 00.000.000/0000-00
  campo('cnpj').addEventListener('input', (e) => {
    e.target.value = e.target.value
      .replace(/\D/g, '')
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  });

  // Máscara de telefone: (00) 00000-0000 ou (00) 0000-0000
  campo('telefone').addEventListener('input', (e) => {
    e.target.value = e.target.value
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
  });
}