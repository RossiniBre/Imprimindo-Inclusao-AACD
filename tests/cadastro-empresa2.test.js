// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'

const $ = (seletor) => document.querySelector(seletor)

beforeEach(() => carregarHtml('cadastro2', 'cadastro2'))

describe('cadastro2 (endereço)', () => {
  it('lista os 26 estados + DF, com SP selecionado', () => {
    expect($('#uf').options.length).toBe(27)
    expect($('#uf').value).toBe('SP')
  })

  it('campos obrigatórios; só o complemento é opcional', () => {
    document.querySelectorAll('#endereco-form input:not([type=checkbox]), #endereco-form select')
      .forEach((campo) => {
        expect(campo.required, campo.id).toBe(campo.id !== 'complemento')
      })
  })

  it('exige aceitar os termos', () => {
    expect($('#termos').required).toBe(true)
  })

  it('"Voltar" leva para a rota do cadastro1', () => {
    expect($('.btn-cancelar').getAttribute('href')).toBe('#/cadastro-empresa/cadastro1')
  })
})