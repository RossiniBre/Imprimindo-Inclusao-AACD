// Vocabulário do back que as telas usam (enums Material, Disponibilidade e TipoDoacao).

export const MATERIAIS = [
  { codigo: 'PLA',    rotulo: 'PLA' },
  { codigo: 'ABS',    rotulo: 'ABS' },
  { codigo: 'PETG',   rotulo: 'PETG' },
  { codigo: 'TPU',    rotulo: 'TPU (flexível)' },
  { codigo: 'RESINA', rotulo: 'Resina' },
  { codigo: 'NYLON',  rotulo: 'Nylon' },
];

export function rotuloMaterial(codigo) {
  return MATERIAIS.find((m) => m.codigo === codigo)?.rotulo ?? codigo;
}

export const DISPONIBILIDADE = {
  OCIOSA: { rotulo: 'Livre',  classe: 'chip--sucesso' },
  EM_USO: { rotulo: 'Em uso', classe: 'chip--neutro' },
};

export const TIPOS_DOACAO = {
  IMPRESSORA: 'Impressora',
  FILAMENTO:  'Filamento',
  AMBOS:      'Impressora + Filamento',
};

export function rotuloTipoDoacao(tipo) {
  return TIPOS_DOACAO[tipo] ?? tipo ?? 'Doação';
}

// "Cidade, UF" a partir do endereço que o back devolve em /api/parceiros
export function cidadeUf(endereco) {
  if (!endereco) return '';
  return [endereco.cidade, endereco.uf].filter(Boolean).join(', ');
}

// "220 × 220 × 250 mm" a partir das medidas da impressora (ou da peça)
export function medidas(objeto) {
  const { comprimentoMm, larguraMm, alturaMm } = objeto ?? {};
  if (!comprimentoMm || !larguraMm || !alturaMm) return '';
  return `${comprimentoMm} × ${larguraMm} × ${alturaMm} mm`;
}

// A peça cabe na mesa? Compara medida a medida; null quando a impressora não tem medidas.
export function cabeNaImpressora(peca, impressora) {
  if (!impressora?.comprimentoMm || !impressora?.larguraMm || !impressora?.alturaMm) return null;
  return peca.comprimentoMm <= impressora.comprimentoMm
    && peca.larguraMm <= impressora.larguraMm
    && peca.alturaMm <= impressora.alturaMm;
}

// Códigos dos materiais de uma impressora, aceitando [{codigo}] ou ['PLA']
export function codigosMateriais(impressora) {
  return (impressora?.materiais ?? []).map((m) => (typeof m === 'string' ? m : m.codigo));
}
