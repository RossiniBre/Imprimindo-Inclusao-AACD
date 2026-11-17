// Recuperação de senha em três telas: esqueci-senha -> codigo-senha -> redefinir-senha
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'

vi.mock('../public/shared/js/api.js', () => ({
  api: {
    esqueciSenha: vi.fn(() => Promise.resolve({ ok: true, status: 200, corpo: { mensagem: 'ok' } })),
    validarCodigoSenha: vi.fn(() => Promise.resolve({ ok: true, status: 200, corpo: { mensagem: 'ok' } })),
    redefinirSenha: vi.fn(() => Promise.resolve({ ok: true, status: 200, corpo: { mensagem: 'Senha redefinida com sucesso.' } })),
  },
}))

import { api } from '../public/shared/js/api.js'
import {
  iniciar as iniciarEsqueci, guardarEmail, emailGuardado, guardarCodigo, codigoGuardado,
  guardarAvisoDoCodigo, pegarAvisoDoCodigo, esquecerRecuperacao,
} from '../public/pages/esqueci-senha/esqueci-senha.js'
import { iniciar as iniciarCodigo, soDigitos, validarCodigo } from '../public/pages/codigo-senha/codigo-senha.js'
import { iniciar as iniciarSenha, validar, erroDoCodigo, SENHA_MIN } from '../public/pages/redefinir-senha/redefinir-senha.js'

const $ = (seletor) => document.querySelector(seletor)
const EMAIL = 'pedidos@nexa.com.br'

function abrir(pagina, iniciar, consulta = '') {
  carregarHtml(pagina, pagina)
  iniciar($('#conteudo'), { params: new URLSearchParams(consulta) })
}

const enviar = (form) => $(form).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

beforeEach(() => {
  esquecerRecuperacao()
  location.hash = ''
  vi.clearAllMocks()
})

describe('recuperação de senha: funções puras', () => {
  it('deixa só os 6 dígitos do código, mesmo colado com espaço ou traço', () => {
    expect(soDigitos('123 456')).toBe('123456')
    expect(soDigitos('123-456')).toBe('123456')
    expect(soDigitos('abc12')).toBe('12')
    expect(soDigitos('1234567')).toBe('123456')
    expect(soDigitos(undefined)).toBe('')
  })

  it('o código precisa ter 6 números', () => {
    expect(validarCodigo('')).toMatch(/Digite o código/)
    expect(validarCodigo('12345')).toMatch(/6 números/)
    expect(validarCodigo('123456')).toBeNull()
  })

  it('a senha precisa de 8 caracteres e da confirmação igual', () => {
    expect(SENHA_MIN).toBe(8)
    expect(validar({ senha: 'nova-senha-1', confirmacao: 'nova-senha-1' })).toEqual({})
    expect(Object.keys(validar({ senha: '', confirmacao: '' }))).toEqual(['senha', 'confirmacao'])
    expect(validar({ senha: '1234567', confirmacao: '1234567' }).senha).toMatch(/pelo menos 8/)
    expect(validar({ senha: '         ', confirmacao: '         ' }).senha).toMatch(/espaços/)
    expect(validar({ senha: 'nova-senha-1', confirmacao: 'outra-senha' }).confirmacao).toMatch(/não são iguais/)
  })

  it('reconhece a recusa do código na resposta do back', () => {
    expect(erroDoCodigo({ status: 400, corpo: { erro: 'Código inválido ou expirado.' } })).toBe(true)
    expect(erroDoCodigo({ status: 400, corpo: { erro: 'Senha não pode estar vazia' } })).toBe(false)
    expect(erroDoCodigo({ status: 500, corpo: null })).toBe(false)
  })

  it('o aviso do código é lido uma vez só', () => {
    guardarAvisoDoCodigo('Código inválido ou expirado.')
    expect(pegarAvisoDoCodigo()).toBe('Código inválido ou expirado.')
    expect(pegarAvisoDoCodigo()).toBe('')
  })
})

describe('passo 1: esqueci minha senha', () => {
  it('depois de enviar o e-mail, guarda o e-mail e vai para a tela do código', async () => {
    abrir('esqueci-senha', iniciarEsqueci)
    $('#esqueci-email').value = EMAIL
    enviar('#form-esqueci')

    await vi.waitFor(() => expect(location.hash).toBe('#/codigo-senha'))
    expect(api.esqueciSenha).toHaveBeenCalledWith(EMAIL)
    expect(emailGuardado()).toBe(EMAIL)
  })

  it('pedir um código novo apaga o código digitado antes', async () => {
    guardarCodigo('111111')
    abrir('esqueci-senha', iniciarEsqueci)
    $('#esqueci-email').value = EMAIL
    enviar('#form-esqueci')
    await vi.waitFor(() => expect(location.hash).toBe('#/codigo-senha'))
    expect(codigoGuardado()).toBe('')
  })

  it('na variante do funcionário leva o perfil junto', async () => {
    abrir('esqueci-senha', iniciarEsqueci, 'perfil=aacd')
    $('#esqueci-email').value = 'ana@aacd.com'
    enviar('#form-esqueci')
    await vi.waitFor(() => expect(location.hash).toBe('#/codigo-senha?perfil=aacd'))
  })

  it('se o envio falhar, fica na tela e mostra o erro', async () => {
    api.esqueciSenha.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 500, corpo: { erro: 'Erro interno.' } }))
    abrir('esqueci-senha', iniciarEsqueci)
    $('#esqueci-email').value = EMAIL
    enviar('#form-esqueci')
    await vi.waitFor(() => expect($('#erro-geral').hidden).toBe(false))
    expect(location.hash).toBe('')
    expect($('#botao-enviar').disabled).toBe(false)
  })
})

describe('passo 2: código recebido por e-mail', () => {
  const caixas = () => [...document.querySelectorAll('.codigo-senha__digito')]
  const lido = () => caixas().map((c) => c.value).join('')
  const digitar = (codigo) => [...codigo].forEach((d, i) => { caixas()[i].value = d })
  const evento = (tipo) => new Event(tipo, { bubbles: true, cancelable: true })
  const tecla = (key) => new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

  function abrirCodigo(consulta = '') {
    guardarEmail(consulta.includes('aacd') ? 'ana@aacd.com' : EMAIL)
    abrir('codigo-senha', iniciarCodigo, consulta)
  }

  it('sem e-mail guardado volta para o passo 1', () => {
    abrir('codigo-senha', iniciarCodigo)
    expect(location.hash).toBe('#/esqueci-senha')
  })

  it('mostra para qual e-mail o código foi, seis caixas e os links de pedir outro e de voltar', () => {
    abrirCodigo()
    expect($('#codigo-email').textContent).toBe(EMAIL)
    expect(caixas()).toHaveLength(6)
    expect(caixas()[0].autocomplete).toBe('one-time-code')
    expect(caixas()[5].getAttribute('aria-label')).toBe('Dígito 6 de 6')
    expect($('#link-novo-codigo').getAttribute('href')).toBe('#/esqueci-senha')
    expect($('#link-voltar').getAttribute('href')).toBe('#/login')
    expect($('#aviso-codigo').hidden).toBe(true)
  })

  it('digitar um número preenche a caixa e pula para a próxima; letra é ignorada', () => {
    abrirCodigo()
    caixas()[0].value = '7'
    caixas()[0].dispatchEvent(evento('input'))
    expect(lido()).toBe('7')
    expect(document.activeElement).toBe(caixas()[1])

    caixas()[1].value = 'x'
    caixas()[1].dispatchEvent(evento('input'))
    expect(lido()).toBe('7')
  })

  it('colar o código inteiro em qualquer caixa preenche as seis', () => {
    abrirCodigo()
    const colar = evento('paste')
    colar.clipboardData = { getData: () => '123 456' }
    caixas()[3].dispatchEvent(colar)
    expect(lido()).toBe('123456')
    expect(colar.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(caixas()[5])
  })

  it('o código preenchido de uma vez na primeira caixa se espalha pelas outras', () => {
    abrirCodigo()
    caixas()[0].value = '12a 3-456'
    caixas()[0].dispatchEvent(evento('input'))
    expect(caixas().map((c) => c.value)).toEqual(['1', '2', '3', '4', '5', '6'])
  })

  it('Backspace em caixa vazia apaga a anterior e volta; as setas andam entre as caixas', () => {
    abrirCodigo()
    digitar('12')
    caixas()[2].focus()
    caixas()[2].dispatchEvent(tecla('Backspace'))
    expect(lido()).toBe('1')
    expect(document.activeElement).toBe(caixas()[1])

    caixas()[1].dispatchEvent(tecla('ArrowLeft'))
    expect(document.activeElement).toBe(caixas()[0])
    caixas()[0].dispatchEvent(tecla('ArrowRight'))
    expect(document.activeElement).toBe(caixas()[1])
  })

  it('código incompleto não avança e o foco vai para a primeira caixa vazia', () => {
    abrirCodigo()
    enviar('#form-codigo')
    expect($('#erro-codigo').textContent).toMatch(/Digite o código/)
    expect(document.activeElement).toBe(caixas()[0])

    digitar('123')
    enviar('#form-codigo')
    expect($('#erro-codigo').textContent).toMatch(/6 números/)
    expect(document.activeElement).toBe(caixas()[3])
    expect(caixas()[0].classList.contains('com-erro')).toBe(true)
    expect(location.hash).toBe('')
    expect(codigoGuardado()).toBe('')
  })

 it('"Continuar" com as seis caixas preenchidas confere o código, guarda e vai para a nova senha', async () => {
  abrirCodigo()
  digitar('123456')
  enviar('#form-codigo')
  await vi.waitFor(() => expect(location.hash).toBe('#/redefinir-senha'))
  expect(api.validarCodigoSenha).toHaveBeenCalledWith(EMAIL, '123456')
  expect(codigoGuardado()).toBe('123456')
})

  it('voltando do passo 3 por conta própria, o código continua nas caixas', () => {
    guardarCodigo('654321')
    abrirCodigo()
    expect(lido()).toBe('654321')
  })

  it('voltando do passo 3 com o código recusado, mostra o aviso até a pessoa digitar de novo', () => {
    guardarAvisoDoCodigo('Código inválido ou expirado. Confira o código no e-mail ou peça outro.')
    abrirCodigo()
    expect($('#aviso-codigo').hidden).toBe(false)
    expect($('#aviso-codigo').textContent).toMatch(/Código inválido ou expirado/)
    expect(caixas()[0].classList.contains('com-erro')).toBe(true)

    caixas()[0].value = '6'
    caixas()[0].dispatchEvent(evento('input'))
    expect($('#aviso-codigo').hidden).toBe(true)
    expect(caixas()[0].classList.contains('com-erro')).toBe(false)
  })

  it('?perfil=aacd usa os textos do funcionário e mantém o perfil nos links', async () => {
  abrirCodigo('perfil=aacd')
  expect($('#codigo-painel-rodape').textContent).toBe('Portal do funcionário')
  expect($('#link-novo-codigo').getAttribute('href')).toBe('#/esqueci-senha?perfil=aacd')
  digitar('123456')
  enviar('#form-codigo')
  await vi.waitFor(() => expect(location.hash).toBe('#/redefinir-senha?perfil=aacd'))
})
})

describe('passo 3: nova senha', () => {
  function abrirSenha(consulta = '') {
    guardarEmail(EMAIL)
    guardarCodigo('123456')
    abrir('redefinir-senha', iniciarSenha, consulta)
  }

  function preencher(senha = 'nova-senha-1', confirmacao = senha) {
    $('#redefinir-senha').value = senha
    $('#redefinir-confirmacao').value = confirmacao
  }

  it('sem e-mail volta ao passo 1; sem código, ao passo 2', () => {
    abrir('redefinir-senha', iniciarSenha)
    expect(location.hash).toBe('#/esqueci-senha')

    guardarEmail(EMAIL)
    abrir('redefinir-senha', iniciarSenha)
    expect(location.hash).toBe('#/codigo-senha')
  })

  it('mostra a conta, as senhas escondidas e o link para voltar ao código', () => {
    abrirSenha()
    expect($('#redefinir-email').textContent).toBe(EMAIL)
    expect($('#redefinir-senha').type).toBe('password')
    expect($('#redefinir-confirmacao').type).toBe('password')
    expect($('#redefinir-senha').autocomplete).toBe('new-password')
    expect($('#link-codigo').getAttribute('href')).toBe('#/codigo-senha')
    expect($('#mensagem-sucesso').hidden).toBe(true)
  })

  it('o olho mostra e esconde a senha', () => {
    abrirSenha()
    const olho = $('[data-olho="redefinir-senha"]')
    olho.click()
    expect($('#redefinir-senha').type).toBe('text')
    expect(olho.getAttribute('aria-pressed')).toBe('true')
    expect(olho.getAttribute('aria-label')).toBe('Esconder a nova senha')
    expect($('#redefinir-confirmacao').type).toBe('password')
    olho.click()
    expect($('#redefinir-senha').type).toBe('password')
    expect(olho.getAttribute('aria-label')).toBe('Mostrar a nova senha')
  })

  it('com erro no formulário não chama o back e foca o primeiro campo errado', () => {
    abrirSenha()
    preencher('nova-senha-1', 'diferente')
    enviar('#form-redefinir')
    expect($('#erro-confirmacao').textContent).toMatch(/não são iguais/)
    expect(document.activeElement.id).toBe('redefinir-confirmacao')
    expect(api.redefinirSenha).not.toHaveBeenCalled()
  })

  it('"Redefinir senha" envia e-mail, código e nova senha e mostra o sucesso', async () => {
    abrirSenha()
    preencher()
    enviar('#form-redefinir')
    expect($('#botao-redefinir').disabled).toBe(true)

    await vi.waitFor(() => expect($('#mensagem-sucesso').hidden).toBe(false))
    expect(api.redefinirSenha).toHaveBeenCalledWith(EMAIL, '123456', 'nova-senha-1')
    expect($('#form-redefinir').hidden).toBe(true)
    expect($('#link-entrar').getAttribute('href')).toBe('#/login')
    // nada fica guardado depois: nem a senha nos campos, nem o e-mail, nem o código
    expect($('#redefinir-senha').value).toBe('')
    expect(emailGuardado()).toBe('')
    expect(codigoGuardado()).toBe('')
  })

  it('código recusado pelo back: volta para a tela do código com o aviso', async () => {
    api.redefinirSenha.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 400, corpo: { erro: 'Código inválido ou expirado.' } }))
    abrirSenha()
    preencher()
    enviar('#form-redefinir')

    await vi.waitFor(() => expect(location.hash).toBe('#/codigo-senha'))
    expect(codigoGuardado()).toBe('')
    expect(emailGuardado()).toBe(EMAIL)

    abrir('codigo-senha', iniciarCodigo)
    expect($('#aviso-codigo').textContent).toMatch(/Código inválido ou expirado/)
    expect([...document.querySelectorAll('.codigo-senha__digito')].every((c) => c.value === '')).toBe(true)
  })

  it('outro erro ou falta de conexão: avisa na própria tela e deixa tentar de novo', async () => {
    api.redefinirSenha.mockImplementationOnce(() => Promise.reject(new Error('rede')))
    abrirSenha()
    preencher()
    enviar('#form-redefinir')
    await vi.waitFor(() => expect($('#erro-geral').hidden).toBe(false))
    expect($('#erro-geral').textContent).toMatch(/Sem conexão/)
    expect($('#botao-redefinir').disabled).toBe(false)
    expect($('#botao-redefinir').textContent).toBe('Redefinir senha')
    expect(location.hash).toBe('')
  })

  it('?perfil=aacd usa os textos do funcionário e mantém o perfil no link do código', () => {
    abrirSenha('perfil=aacd')
    expect($('#redefinir-painel-rodape').textContent).toBe('Portal do funcionário')
    expect($('#link-codigo').getAttribute('href')).toBe('#/codigo-senha?perfil=aacd')
  })
  
})