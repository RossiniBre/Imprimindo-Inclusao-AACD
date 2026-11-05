import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const RAIZ = resolve(process.cwd(), 'public')
const main = readFileSync(resolve(RAIZ, 'shared/js/main.js'), 'utf-8')

const rotas = [...main.matchAll(/rota\('([^']+)',\s*\{([^}]*)\}/g)].map(([, caminho, cfg]) => ({
  caminho,
  pagina: cfg.match(/pagina:\s*'([^']+)'/)[1],
  pasta: cfg.match(/pasta:\s*'([^']+)'/)?.[1],
}))

const arquivoDa = ({ pagina, pasta }, ext) =>
  resolve(RAIZ, 'pages', pasta ?? pagina, `${pagina}.${ext}`)

describe('rotas do main.js', () => {
  it.each(rotas)('$caminho tem html, css e js no lugar certo', (r) => {
    for (const ext of ['html', 'css', 'js']) {
      expect(existsSync(arquivoDa(r, ext)), arquivoDa(r, ext)).toBe(true)
    }
  })

  // Telas previstas no Figma que ainda não foram feitas. Os links para elas já
  // existem nas telas prontas; quando a rota for registrada no main.js, tire
  // daqui (o teste abaixo cobra isso).
  const ROTAS_PENDENTES = new Set([
    '/contato',   // Contato (AACD) — aba do painel-aacd
    '/parceiros', // Escolher empresa parceira — "Nova solicitação" do painel-aacd
  ])

  it('todo link interno (href="#/...") aponta para uma rota registrada ou pendente', () => {
    const registradas = new Set(rotas.map((r) => r.caminho))
    const quebrados = []

    for (const r of rotas) {
      if (!existsSync(arquivoDa(r, 'html'))) continue
      const html = readFileSync(arquivoDa(r, 'html'), 'utf-8')
      for (const [, destino] of html.matchAll(/href="#(\/[^"?]*)/g)) {
        if (!registradas.has(destino) && !ROTAS_PENDENTES.has(destino)) {
          quebrados.push(`${r.pagina}: #${destino}`)
        }
      }
    }
    expect(quebrados).toEqual([])
  })

  it('rota pendente que já foi registrada sai da lista ROTAS_PENDENTES', () => {
    const registradas = new Set(rotas.map((r) => r.caminho))
    const jaFeitas = [...ROTAS_PENDENTES].filter((caminho) => registradas.has(caminho))
    expect(jaFeitas).toEqual([])
  })

  it('imagens locais usadas nas telas existem', () => {
    const faltando = []

    for (const r of rotas) {
      if (!existsSync(arquivoDa(r, 'html'))) continue
      const html = readFileSync(arquivoDa(r, 'html'), 'utf-8')
      for (const [, src] of html.matchAll(/src="(\/[^"]+\.(?:png|jpe?g|svg|webp))"/g)) {
        if (!existsSync(resolve(RAIZ, src.slice(1)))) faltando.push(`${r.pagina}: ${src}`)
      }
    }
    expect(faltando).toEqual([])
  })
})