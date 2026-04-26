export const BIBLIOTECA_FIELD_NAMES = {
  titulo: 'titulo',
  esfera: 'esfera',
  uf: 'uf',
  municipio: 'municipio',
  orgaoOrigem: 'orgao_origem',
  tipo: 'tipo',
  numero: 'numero',
  ano: 'ano',
  tema: 'tema',
  ementa: 'ementa',
  textoIntegral: 'texto_integral',
  fonteUrl: 'fonte_url',
  arquivoUrl: 'arquivo_url'
} as const;

export const BIBLIOTECA_ESFERAS = ['municipal', 'estadual', 'federal'] as const;
export const BIBLIOTECA_TIPOS = ['lei', 'lei_complementar', 'decreto', 'resolucao', 'outro'] as const;
