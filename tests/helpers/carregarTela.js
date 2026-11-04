import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Lê o HTML da tela e coloca dentro de um <main>, como o router faz
export function carregarHtml(pasta, pagina) {
  const caminho = resolve(process.cwd(), 'pages', pasta, `${pagina}.html`)
  document.body.innerHTML = `<main id="conteudo">${readFileSync(caminho, 'utf-8')}</main>`
}