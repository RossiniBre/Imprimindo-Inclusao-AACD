import { describe, it, expect, beforeEach } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'
import { iniciar } from '../public/pages/vire-apoiador/vire-apoiador.js'

describe('tela Vire Apoiador', () => {
  beforeEach(() => {
    carregarHtml('vire-apoiador', 'vire-apoiador')
    iniciar(document.getElementById('conteudo'), { params: new URLSearchParams() })
  })

  it('mostra a chamada do banner', () => {
    expect(document.querySelector('h1').textContent).toContain('Nos ajude a imprimir')
    expect(document.querySelector('.apoiador__chamada p').textContent).toContain('vire um colaborador')
  })

  it('"Portal do Apoiador" leva para o login', () => {
    const portal = document.querySelector('.apoiador__portal')
    expect(portal.getAttribute('href')).toBe('#/login')
  })

  it('links do site da AACD abrem em nova aba sem vazar o opener', () => {
    const externos = [...document.querySelectorAll('a[href^="https://aacd.org.br"]')]
    expect(externos.length).toBeGreaterThan(0)
    for (const a of externos) {
      expect(a.target).toBe('_blank')
      expect(a.rel).toContain('noopener')
    }
  })

  it('não tem os botões Vire Membro / Membro AACD', () => {
    expect(document.querySelectorAll('button').length).toBe(0)
    expect(document.body.textContent).not.toMatch(/Vire Membro|Membro AACD/)
  })
})
