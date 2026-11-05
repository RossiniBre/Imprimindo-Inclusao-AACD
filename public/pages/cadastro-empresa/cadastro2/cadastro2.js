export function iniciar(container) {
  const campo = (id) => container.querySelector('#' + id);
  const formulario = campo('endereco-form');
  const erroGeral = campo('erro-geral');
  const botaoCadastrar = formulario.querySelector('button[type="submit"]');
  const campoCep = campo('cep');

  // Sem os dados da etapa 1, volta para ela
  const etapa1 = JSON.parse(sessionStorage.getItem('cadastroEmpresa') ?? 'null');
  if (!etapa1) {
    location.hash = '#/cadastro-empresa/cadastro1';
    return;
  }

  function mostrarErro(texto, idCampo) {
    erroGeral.textContent = texto;
    erroGeral.hidden = false;
    if (idCampo) campo(idCampo).focus();
  }

  // ----- CEP: máscara + preenchimento automático (ViaCEP) -----
  let consultaAtual = 0;

  async function buscarCep(cep) {
    const minhaConsulta = ++consultaAtual; // ignora respostas antigas
    campoCep.disabled = true;
    erroGeral.hidden = true;

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await resposta.json();
      if (minhaConsulta !== consultaAtual) return;

      if (dados.erro) {
        mostrarErro('CEP não encontrado. Preencha o endereço manualmente.');
        return;
      }

      campo('uf').value = dados.uf ?? campo('uf').value;
      campo('cidade').value = dados.localidade ?? '';
      campo('bairro').value = dados.bairro ?? '';
      campo('logradouro').value = dados.logradouro ?? '';
      campo('numero').focus();
    } catch {
      mostrarErro('Não foi possível buscar o CEP agora. Preencha o endereço manualmente.');
    } finally {
      campoCep.disabled = false;
    }
  }

  campoCep.addEventListener('input', () => {
    const digitos = campoCep.value.replace(/\D/g, '').slice(0, 8);
    campoCep.value = digitos.replace(/^(\d{5})(\d)/, '$1-$2');
    if (digitos.length === 8) buscarCep(digitos);
  });

  // ----- Envio -----
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erroGeral.hidden = true;

    const endereco = {
      cep: campoCep.value.replace(/\D/g, ''),
      uf: campo('uf').value,
      cidade: campo('cidade').value.trim(),
      bairro: campo('bairro').value.trim(),
      logradouro: campo('logradouro').value.trim(),
      numero: campo('numero').value.trim(),
      complemento: campo('complemento').value.trim(),
    };

    if (endereco.cep.length !== 8) return mostrarErro('Informe um CEP válido.', 'cep');
    if (!endereco.cidade) return mostrarErro('Informe a cidade.', 'cidade');
    if (!endereco.bairro) return mostrarErro('Informe o bairro.', 'bairro');
    if (!endereco.logradouro) return mostrarErro('Informe o logradouro.', 'logradouro');
    if (!endereco.numero) return mostrarErro('Informe o número.', 'numero');
    if (!campo('termos').checked) return mostrarErro('Aceite os termos para continuar.', 'termos');

    botaoCadastrar.disabled = true;
    botaoCadastrar.textContent = 'Cadastrando...';

      try {
      const { api } = await import('/shared/js/api.js');
      const resposta = await api.cadastrarEmpresa({
        nome: etapa1.razaoSocial,
        cnpj: etapa1.cnpj,
        senha: etapa1.senha,
        email: etapa1.email,
        telefone: etapa1.telefone,
        cep: endereco.cep,
        rua: endereco.logradouro,
        numero: endereco.numero,
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        uf: endereco.uf,
      });

      if (resposta.ok) {
        sessionStorage.removeItem('cadastroEmpresa');
        location.hash = '#/login';
        return;
      }
      mostrarErro(resposta.corpo?.erro ?? 'Não foi possível cadastrar. Tente de novo.');
    } catch (erro) {
      console.error(erro);
      mostrarErro('Não foi possível enviar o cadastro. Tente de novo em instantes.');
    }

    botaoCadastrar.disabled = false;
    botaoCadastrar.textContent = 'Cadastrar';
  });
}