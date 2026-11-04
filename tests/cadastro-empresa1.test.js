// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'

const $ = (seletor) => document.querySelector(seletor)
const digitar = (el, valor) => {
  el.value = valor
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(async () => {
  vi.resetModules()
  // ajuste a pasta se a tela estiver em pages/cadastro-empresa/cadastro1
  carregarHtml('cadastro-empresa/cadastro1', 'cadastro1')
  const tela = await import('../public/pages/cadastro-empresa/cadastro1/cadastro1.js')
  tela.iniciar?.()
})

describe('máscara de CNPJ', () => {
  it('formata 00.000.000/0000-00', () => {
    digitar($('#cnpj'), '12345678000199')
    expect($('#cnpj').value).toBe('12.345.678/0001-99')
  })

  it('ignora letras e corta depois de 14 dígitos', () => {
    digitar($('#cnpj'), '12a345b678000199999')
    expect($('#cnpj').value).toBe('12.345.678/0001-99')
  })
})

describe('máscara de telefone', () => {
  it('celular: (11) 98765-4321', () => {
    digitar($('#telefone'), '11987654321')
    expect($('#telefone').value).toBe('(11) 98765-4321')
  })

  it('fixo: (11) 2345-6789', () => {
    digitar($('#telefone'), '1123456789')
    expect($('#telefone').value).toBe('(11) 2345-6789')
  })
})

describe('mostrar / ocultar senha', () => {
  it('alterna o tipo do input e o ícone', () => {
    const botao = $('.botao-senha[data-target="senha"]')

    botao.click()
    expect($('#senha').type).toBe('text')
    expect(botao.querySelector('i').className).toBe('bi bi-eye-slash')

    botao.click()
    expect($('#senha').type).toBe('password')
    expect(botao.querySelector('i').className).toBe('bi bi-eye')
  })

  it('cada botão controla só o seu campo', () => {
    $('.botao-senha[data-target="senha2"]').click()

    expect($('#senha2').type).toBe('text')
    expect($('#senha').type).toBe('password')
  })
})

describe('formulário', () => {
  it('todos os campos são obrigatórios e a senha exige 8 caracteres', () => {
    const campos = document.querySelectorAll('#cadastro-form input')
    campos.forEach((campo) => expect(campo.required, campo.id).toBe(true))
    expect($('#senha').minLength).toBe(8)
  })
})