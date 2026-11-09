import { describe, it, expect } from 'vitest'
import { iniciais, tempoRelativo, criarModal, elemento } from '../public/shared/js/ui.js'
import { cabeNaImpressora, medidas, cidadeUf, codigosMateriais, rotuloTipoDoacao } from '../public/shared/js/dominio.js'
import { lerNomeArquivo } from '../public/shared/js/api.js'

describe('shared/ui', () => {
  it('iniciais do nome', () => {
    expect(iniciais('IMT Mauá')).toBe('IM')
    expect(iniciais('Mackenzie')).toBe('MA')
    expect(iniciais('')).toBe('?')
  })

  it('tempo relativo', () => {
    const agora = new Date('2026-11-09T12:00:00Z')
    expect(tempoRelativo('2026-11-09T11:59:40Z', agora)).toBe('agora')
    expect(tempoRelativo('2026-11-09T11:30:00Z', agora)).toBe('há 30 min')
    expect(tempoRelativo('2026-11-09T10:00:00Z', agora)).toBe('há 2h')
    expect(tempoRelativo('2026-11-06T10:00:00Z', agora)).toBe('há 3 dias')
    expect(tempoRelativo(null, agora)).toBe('')
  })

  it('modal abre, fecha com Esc e com data-fechar, e devolve o foco', () => {
    document.body.innerHTML = '<button id="gatilho">abrir</button><div id="fundo" hidden><div><button data-fechar>x</button><input id="campo"></div></div>'
    const gatilho = document.getElementById('gatilho')
    const fundo = document.getElementById('fundo')
    gatilho.focus()

    const modal = criarModal(fundo)
    modal.abrir()
    expect(fundo.hidden).toBe(false)
    expect(modal.aberto).toBe(true)
    expect(document.activeElement.id).toBe('campo')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(fundo.hidden).toBe(true)
    expect(document.activeElement).toBe(gatilho)

    modal.abrir()
    fundo.querySelector('[data-fechar]').click()
    expect(fundo.hidden).toBe(true)
    modal.destruir()
  })

  it('elemento cria tag com classe e texto', () => {
    const el = elemento('span', 'chip', 'oi')
    expect(el.tagName).toBe('SPAN')
    expect(el.className).toBe('chip')
    expect(el.textContent).toBe('oi')
  })
})

describe('shared/dominio', () => {
  const mesa = { comprimentoMm: 220, larguraMm: 220, alturaMm: 250 }

  it('peça cabe ou não na mesa; null sem medidas', () => {
    expect(cabeNaImpressora({ comprimentoMm: 180, larguraMm: 95, alturaMm: 60 }, mesa)).toBe(true)
    expect(cabeNaImpressora({ comprimentoMm: 230, larguraMm: 95, alturaMm: 60 }, mesa)).toBe(false)
    expect(cabeNaImpressora({ comprimentoMm: 1, larguraMm: 1, alturaMm: 1 }, {})).toBeNull()
  })

  it('formata medidas, cidade/UF, materiais e tipo de doação', () => {
    expect(medidas(mesa)).toBe('220 × 220 × 250 mm')
    expect(medidas({})).toBe('')
    expect(cidadeUf({ cidade: 'Santo André', uf: 'SP' })).toBe('Santo André, SP')
    expect(cidadeUf(null)).toBe('')
    expect(codigosMateriais({ materiais: [{ codigo: 'PLA' }, 'ABS'] })).toEqual(['PLA', 'ABS'])
    expect(rotuloTipoDoacao('AMBOS')).toBe('Impressora + Filamento')
  })
})

describe('shared/api', () => {
  it('lê o nome do arquivo do Content-Disposition', () => {
    expect(lerNomeArquivo('attachment; filename="protese_v2.stl"; filename*=UTF-8\'\'pr%C3%B3tese_v2.stl'))
      .toBe('prótese_v2.stl')
    expect(lerNomeArquivo('attachment; filename="peca.obj"')).toBe('peca.obj')
    expect(lerNomeArquivo(null)).toBeNull()
  })
})
