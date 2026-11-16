import { describe, it, expect, beforeEach, vi } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'

const rede = [
  { id: 11, modelo: 'Ender 3 V2', disponibilidade: 'OCIOSA', ativo: true, empresa: { id: 1, nome: 'Mackenzie' }, materiais: [{ codigo: 'PLA' }, { codigo: 'PETG' }] },
  { id: 12, modelo: 'Prusa MK4', disponibilidade: 'EM_USO', ativo: true, empresa: { id: 1, nome: 'Mackenzie' }, materiais: [{ codigo: 'PLA' }, { codigo: 'ABS' }] },
  { id: 16, modelo: 'Ender 3 S1', disponibilidade: 'OCIOSA', ativo: false, empresa: { id: 1, nome: 'Mackenzie' }, materiais: [{ codigo: 'PLA' }] },
  { id: 13, modelo: 'Bambu Lab X1', disponibilidade: 'OCIOSA', ativo: true, empresa: { id: 2, nome: 'IMT Mauá' }, materiais: [{ codigo: 'PLA' }, { codigo: 'TPU' }] },
  { id: 14, modelo: 'Creality K1', disponibilidade: 'OCIOSA', ativo: true, empresa: { id: 3, nome: 'Órbita Tech' }, materiais: [{ codigo: 'ABS' }] },
  { id: 15, modelo: 'Mini PLA', disponibilidade: 'OCIOSA', ativo: true, empresa: { id: 4, nome: 'Prisma Labs' }, materiais: [{ codigo: 'PLA' }] },
]

const mesas = {
  1: [
    { id: 11, comprimentoMm: 220, larguraMm: 220, alturaMm: 250 },
    { id: 12, comprimentoMm: 250, larguraMm: 210, alturaMm: 220 },
    { id: 16, comprimentoMm: 220, larguraMm: 220, alturaMm: 270 },
  ],
  2: [{ id: 13, comprimentoMm: 256, larguraMm: 256, alturaMm: 256 }],
  3: [{ id: 14, comprimentoMm: 220, larguraMm: 220, alturaMm: 250 }],
  4: [{ id: 15, comprimentoMm: 100, larguraMm: 80, alturaMm: 50 }],
}

const ok = (corpo) => Promise.resolve({ ok: true, status: 200, corpo })

vi.mock('../public/shared/js/api.js', () => ({
  api: {
    eu: vi.fn(() => ok({ perfil: 'FUNCIONARIO', nome: 'Ana Martins' })),
    painelImpressoras: vi.fn(() => ok(rede)),
    parceiros: vi.fn(() => ok([
      { id: 1, nome: 'Mackenzie', email: 'contato@mackenzie.br', telefone: '(11) 2114-8000', endereco: { cidade: 'São Paulo', uf: 'SP' } },
      { id: 2, nome: 'IMT Mauá', endereco: { cidade: 'São Caetano do Sul', uf: 'SP' } },
    ])),
    impressorasDoParceiro: vi.fn((id) => ok(mesas[id] ?? [])),
  },
}))

import { api } from '../public/shared/js/api.js'
import {
  iniciar, destruir, motivoDeNaoAtender, impressorasQueAtendem, contarDescartadas, resumoDoPedido, PROXIMO_PASSO,
} from '../public/pages/escolher-impressora/escolher-impressora.js'
import { rascunhoAtual, limparRascunho, salvarRascunho } from '../public/shared/js/rascunho-solicitacao.js'

const pedido = {
  arquivo: new File([new Uint8Array(10)], 'protese.stl'),
  titulo: 'Prótese de mão', prazo: '2026-12-15', material: 'PLA',
  comprimentoMm: 180, larguraMm: 95, alturaMm: 60, quantidade: 2, observacao: '', impressoraId: null,
}

const comMesa = rede.map((i) => ({ ...i, ...Object.values(mesas).flat().find((m) => m.id === i.id) }))

const $ = (seletor) => document.querySelector(seletor)
const modelos = () => [...document.querySelectorAll('.ei__cartao h3')].map((h) => h.textContent)

async function abrir() {
  carregarHtml('escolher-impressora', 'escolher-impressora')
  iniciar($('#conteudo'))
  await vi.waitFor(() => expect($('#descricao').textContent).not.toMatch(/Procurando/))
}

describe('escolher impressora: funções puras', () => {
  it('diz por que a impressora não atende', () => {
    const porId = (id) => comMesa.find((i) => i.id === id)
    expect(motivoDeNaoAtender(porId(11), pedido)).toBeNull()
    expect(motivoDeNaoAtender(porId(16), pedido)).toBe('desativada')
    expect(motivoDeNaoAtender(porId(14), pedido)).toBe('material')
    expect(motivoDeNaoAtender(porId(15), pedido)).toBe('tamanho')
  })

  it('sem materiais ou sem medidas da mesa, a impressora continua na lista', () => {
    expect(motivoDeNaoAtender({ id: 1, ativo: true, materiais: [] }, pedido)).toBeNull()
    expect(motivoDeNaoAtender({ id: 1, ativo: true, materiais: [{ codigo: 'PLA' }] }, pedido)).toBeNull()
  })

  it('lista só as que atendem: livres antes das em uso, empate por modelo', () => {
    expect(impressorasQueAtendem(comMesa, pedido).map((i) => i.id)).toEqual([13, 11, 12])
  })

  it('a impressora que a pessoa já tinha clicado vem primeiro', () => {
    expect(impressorasQueAtendem(comMesa, { ...pedido, impressoraId: 12 }).map((i) => i.id)).toEqual([12, 13, 11])
  })

  it('conta as descartadas por motivo', () => {
    expect(contarDescartadas(comMesa, pedido)).toEqual({ desativada: 1, material: 1, tamanho: 1 })
  })

  it('resume o pedido em uma linha', () => {
    expect(resumoDoPedido(pedido)).toBe('Prótese de mão · PLA · 180 × 95 × 60 mm · 2 peças · prazo 15/12/2026')
    expect(resumoDoPedido({ ...pedido, prazo: '', quantidade: 1 })).toBe('Prótese de mão · PLA · 180 × 95 × 60 mm · 1 peça')
  })
})

describe('escolher impressora: tela', () => {
  beforeEach(() => {
    destruir()
    limparRascunho()
    location.hash = ''
    vi.clearAllMocks()
  })

  it('sem rascunho, volta para o passo 1', () => {
    carregarHtml('escolher-impressora', 'escolher-impressora')
    iniciar($('#conteudo'))
    expect(location.hash).toBe('#/nova-solicitacao')
    expect(api.painelImpressoras).not.toHaveBeenCalled()
  })

  it('marca o passo 2 como atual e o 1 como feito, e tem o link de voltar', () => {
    salvarRascunho(pedido)
    carregarHtml('escolher-impressora', 'escolher-impressora')
    const passos = [...document.querySelectorAll('.ns__passo')]
    expect(passos[0].classList.contains('ns__passo--feito')).toBe(true)
    expect(passos[1].getAttribute('aria-current')).toBe('step')
    expect($('.ei__voltar').getAttribute('href')).toBe('#/nova-solicitacao')
  })

  it('mostra o resumo do pedido e só as impressoras que atendem, com empresa, cidade e mesa', async () => {
    salvarRascunho(pedido)
    await abrir()

    expect($('#pedido').textContent).toMatch(/Prótese de mão · PLA/)
    expect(modelos()).toEqual(['Bambu Lab X1', 'Ender 3 V2', 'Prusa MK4'])
    expect($('#descricao').textContent).toBe('3 impressoras ativas trabalham com PLA e comportam a peça.')
    expect($('#rodape').textContent).toBe('Mostrando 3 de 6 impressoras da rede.')
    expect($('#lista-vazia').hidden).toBe(true)

    const primeiro = $('.ei__cartao')
    expect(primeiro.querySelector('.ei__cartao-local').textContent).toBe('IMT Mauá · São Caetano do Sul, SP')
    expect(primeiro.querySelector('.ei__cartao-mesa').textContent).toBe('Mesa 256 × 256 × 256 mm')
    expect(primeiro.querySelector('.chip').textContent).toBe('Livre')

    // só busca as mesas das empresas que passaram no filtro de material (a 3 só tem ABS)
    expect(api.impressorasDoParceiro.mock.calls.map(([id]) => id).sort()).toEqual([1, 2, 4])
  })

  it('"Selecionar" guarda a impressora no rascunho e marca o cartão', async () => {
    salvarRascunho(pedido)
    await abrir()

    $('button[data-id="11"]').click()

    expect(rascunhoAtual().impressoraId).toBe(11)
    expect(rascunhoAtual().impressora).toMatchObject({ id: 11, modelo: 'Ender 3 V2', comprimentoMm: 220 })
    expect(rascunhoAtual().titulo).toBe('Prótese de mão')
    expect($('button[data-id="11"]').getAttribute('aria-pressed')).toBe('true')
    // o botão selecionado ganhou um ✓ no texto
    expect($('button[data-id="11"]').textContent).toMatch(/^Selecionada/)
    expect($('button[data-id="13"]').getAttribute('aria-pressed')).toBe('false')
  })

  it('"Continuar" só aparece depois de selecionar e leva ao passo 3', async () => {
    salvarRascunho(pedido)
    await abrir()
    expect($('#barra-continuar').hidden).toBe(true)

    $('button[data-id="13"]').click()
    expect($('#barra-continuar').hidden).toBe(false)
    expect($('#barra-texto').textContent).toBe('Bambu Lab X1 · IMT Mauá')
    expect(location.hash).toBe('')

    $('#botao-continuar').click()
    expect(PROXIMO_PASSO).toBe('#/confirmar-solicitacao')
    expect(location.hash).toBe('#/confirmar-solicitacao')
  })

  it('voltando do passo 3, a impressora continua selecionada e o "Continuar" já aparece', async () => {
    salvarRascunho({ ...pedido, impressoraId: 11, impressora: { id: 11, modelo: 'Ender 3 V2' } })
    await abrir()
    expect($('button[data-id="11"]').getAttribute('aria-pressed')).toBe('true')
    expect($('#barra-continuar').hidden).toBe(false)
  })

  it('"Ver detalhes" abre a ficha da impressora com contato, mesa, materiais e a checagem', async () => {
    salvarRascunho(pedido)
    await abrir()
    expect($('#modal-detalhes').hidden).toBe(true)

    $('button[data-detalhes="11"]').click()

    expect($('#modal-detalhes').hidden).toBe(false)
    expect($('#modal-titulo').textContent).toBe('Ender 3 V2')
    expect($('#modal-local').textContent).toBe('Mackenzie · São Paulo, SP')
    const dados = $('#modal-dados').textContent
    expect(dados).toMatch(/contato@mackenzie.br/)
    expect(dados).toMatch(/220 × 220 × 250 mm/)
    expect(dados).toMatch(/PLA, PETG/)
    expect([...document.querySelectorAll('#modal-checagem li')].map((li) => li.className)).toEqual(['ok', 'ok', 'ok'])
    // ver detalhes não seleciona nada
    expect(rascunhoAtual().impressora).toBeUndefined()
    expect($('#barra-continuar').hidden).toBe(true)
  })

  it('"Selecionar esta impressora" dentro dos detalhes seleciona e fecha o modal', async () => {
    salvarRascunho(pedido)
    await abrir()
    $('button[data-detalhes="12"]').click()
    $('#modal-selecionar').click()

    expect($('#modal-detalhes').hidden).toBe(true)
    expect(rascunhoAtual().impressora.id).toBe(12)
    expect($('button[data-id="12"]').getAttribute('aria-pressed')).toBe('true')
    expect($('#barra-continuar').hidden).toBe(false)
  })

  it('quando nenhuma atende, explica o motivo e oferece alterar os dados', async () => {
    salvarRascunho({ ...pedido, material: 'NYLON' })
    await abrir()

    expect(modelos()).toEqual([])
    expect($('#lista-vazia').hidden).toBe(false)
    expect($('#vazia-motivo').textContent).toMatch(/5 não trabalham com Nylon/)
    expect($('#vazia-motivo').textContent).toMatch(/1 está desativada/)
    expect($('#lista-vazia a').getAttribute('href')).toBe('#/nova-solicitacao')
  })

  it('esquece a impressora escolhida antes se ela deixou de atender', async () => {
    salvarRascunho({ ...pedido, material: 'TPU', impressoraId: 11, impressora: { id: 11, modelo: 'Ender 3 V2' } })
    await abrir()

    expect(modelos()).toEqual(['Bambu Lab X1'])
    expect(rascunhoAtual().impressora).toBeNull()
  })

  it('falha ao carregar mostra o erro', async () => {
    api.painelImpressoras.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 500, corpo: { erro: 'Banco fora do ar.' } }))
    salvarRascunho(pedido)
    carregarHtml('escolher-impressora', 'escolher-impressora')
    iniciar($('#conteudo'))
    await vi.waitFor(() => expect($('#aviso-geral').hidden).toBe(false))
    expect($('#aviso-geral').textContent).toBe('Banco fora do ar.')
  })
})