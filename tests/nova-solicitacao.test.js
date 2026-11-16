import { describe, it, expect, beforeEach, vi } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'

vi.mock('../public/shared/js/api.js', () => ({
  api: { eu: vi.fn(() => Promise.resolve({ ok: true, status: 200, corpo: { perfil: 'FUNCIONARIO', nome: 'Ana Martins' } })) },
}))

import { iniciar, formatarTamanho, dataDeHoje, PROXIMO_PASSO } from '../public/pages/nova-solicitacao/nova-solicitacao.js'
import { rascunhoAtual, limparRascunho, salvarRascunho } from '../public/shared/js/rascunho-solicitacao.js'

const $ = (seletor) => document.querySelector(seletor)

function escolherArquivo(nome = 'protese_mao_v2.stl', tamanho = 2048) {
  const arquivo = new File([new Uint8Array(tamanho)], nome)
  const entrada = $('#campo-arquivo')
  Object.defineProperty(entrada, 'files', { value: [arquivo], configurable: true })
  entrada.dispatchEvent(new Event('change', { bubbles: true }))
  return arquivo
}

function preencher({ titulo = 'Prótese de mão', material = 'PLA', medidas = ['180', '95', '60'], quantidade = '2' } = {}) {
  $('#campo-titulo').value = titulo
  if (material) $(`input[name="material"][value="${material}"]`).checked = true
  $('#campo-comprimento').value = medidas[0]
  $('#campo-largura').value = medidas[1]
  $('#campo-altura').value = medidas[2]
  $('#campo-quantidade').value = quantidade
}

const enviar = () => $('#form-peca').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

function abrir(consulta = '') {
  carregarHtml('nova-solicitacao', 'nova-solicitacao')
  iniciar($('#conteudo'), { params: new URLSearchParams(consulta) })
}

describe('nova solicitação: funções puras', () => {
  it('formata o tamanho do arquivo', () => {
    expect(formatarTamanho(512)).toBe('512 B')
    expect(formatarTamanho(51200)).toBe('50 KB')
    expect(formatarTamanho(2.4 * 1024 * 1024)).toBe('2,4 MB')
    expect(formatarTamanho(undefined)).toBe('')
  })

  it('data de hoje no formato do campo de data', () => {
    expect(dataDeHoje(new Date(2026, 10, 6))).toBe('2026-11-06')
  })
})

describe('nova solicitação: passo 1 (dados da peça)', () => {
  beforeEach(() => {
    limparRascunho()
    location.hash = ''
    abrir()
  })

  it('mostra os três passos com o primeiro marcado e os campos que o back exige', () => {
    const passos = [...document.querySelectorAll('.ns__passo')]
    expect(passos).toHaveLength(3)
    expect(passos[0].getAttribute('aria-current')).toBe('step')

    for (const nome of ['arquivo', 'titulo', 'quantidade', 'comprimentoMm', 'larguraMm', 'alturaMm']) {
      expect($(`#form-peca [name="${nome}"]`), nome).not.toBeNull()
    }
    expect($('#campo-arquivo').accept).toBe('.stl,.obj,.3mf')
    expect(document.querySelectorAll('input[name="material"]').length).toBeGreaterThan(3)
    expect($('#campo-prazo').min).toBe(dataDeHoje())
  })

  it('mostra quem está preenchendo no rodapé do painel', async () => {
    await vi.waitFor(() => expect($('#ns-usuario').hidden).toBe(false))
    expect($('#ns-usuario-nome').textContent).toBe('Ana Martins')
    expect($('#ns-usuario-iniciais').textContent).toBe('AM')
    expect($('#ns-usuario-papel').textContent).toBe('Funcionário AACD')
  })

  it('"Continuar" sem preencher aponta os erros e não guarda rascunho', () => {
    enviar()
    expect($('#erro-arquivo').textContent).toMatch(/Escolha/)
    expect($('#erro-titulo').textContent).not.toBe('')
    expect($('#erro-material').textContent).not.toBe('')
    expect($('#erro-medidas').textContent).not.toBe('')
    expect(rascunhoAtual()).toBeNull()
    expect(location.hash).toBe('')
  })

  it('arquivo escolhido aparece no cartão com nome e tamanho; formato errado já avisa', () => {
    expect($('#arquivo-escolhido').hidden).toBe(true)
    escolherArquivo('protese_mao_v2.stl', 2048)
    expect($('#arquivo-vazio').hidden).toBe(true)
    expect($('#arquivo-escolhido').hidden).toBe(false)
    expect($('#arquivo-nome').textContent).toBe('protese_mao_v2.stl')
    expect($('#arquivo-tamanho').textContent).toBe('2 KB')
    expect($('#erro-arquivo').textContent).toBe('')

    escolherArquivo('foto.pdf')
    expect($('#erro-arquivo').textContent).toMatch(/Formato/)
  })

  it('"Continuar" com tudo certo guarda o rascunho com os números convertidos e vai ao passo 2', () => {
    const arquivo = escolherArquivo()
    preencher()
    $('#campo-observacao').value = '  Peça infantil.  '
    enviar()

    expect(rascunhoAtual()).toEqual({
      arquivo,
      titulo: 'Prótese de mão',
      prazo: '',
      material: 'PLA',
      comprimentoMm: 180,
      larguraMm: 95,
      alturaMm: 60,
      quantidade: 2,
      observacao: 'Peça infantil.',
      impressoraId: null,
      impressora: null,
    })
    expect(PROXIMO_PASSO).toBe('#/escolher-impressora')
    expect(location.hash).toBe('#/escolher-impressora')
  })

  it('"Cancelar" apaga o rascunho', () => {
    salvarRascunho({ titulo: 'x' })
    $('#botao-cancelar').click()
    expect(rascunhoAtual()).toBeNull()
    expect(location.hash).toBe('#/painel-aacd')
  })
})

describe('nova solicitação: rascunho e impressora de origem', () => {
  beforeEach(() => {
    limparRascunho()
    location.hash = ''
  })

  it('guarda a impressora que veio na URL (?impressora=12)', () => {
    abrir('impressora=12')
    escolherArquivo()
    preencher()
    $('#campo-observacao').value = 'Peça infantil.'
    enviar()

    expect(rascunhoAtual().impressoraId).toBe(12)
    expect(location.hash).toBe('#/escolher-impressora')
  })

  it('reabre com o que já estava no rascunho, inclusive o arquivo', () => {
    const arquivo = new File([new Uint8Array(10)], 'ortese.3mf')
    salvarRascunho({
      arquivo, titulo: 'Órtese', prazo: '', material: 'PETG',
      comprimentoMm: 100, larguraMm: 50, alturaMm: 20, quantidade: 3, observacao: 'Urgente', impressoraId: 7,
    })
    abrir()

    expect($('#campo-titulo').value).toBe('Órtese')
    expect($('input[name="material"]:checked').value).toBe('PETG')
    expect($('#campo-quantidade').value).toBe('3')
    expect($('#arquivo-nome').textContent).toBe('ortese.3mf')
    expect($('#contador-observacao').textContent).toBe('7')

    enviar()
    expect(rascunhoAtual().arquivo).toBe(arquivo)
    expect(rascunhoAtual().impressoraId).toBe(7)
  })

  it('voltar do passo 2 e continuar de novo mantém a impressora já escolhida', () => {
    salvarRascunho({
      arquivo: new File([new Uint8Array(10)], 'ortese.3mf'), titulo: 'Órtese', prazo: '', material: 'PETG',
      comprimentoMm: 100, larguraMm: 50, alturaMm: 20, quantidade: 3, observacao: '', impressoraId: 7,
      impressora: { id: 7, modelo: 'Ender 3 V2' },
    })
    abrir()
    enviar()
    expect(rascunhoAtual().impressora).toEqual({ id: 7, modelo: 'Ender 3 V2' })
  })
})