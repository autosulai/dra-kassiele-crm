import React from 'react';
import { TAGS_DISPONIVEIS as tagsInitial } from '../data/mockData';

// Componente para exibir o badge de Tag com cores dinâmicas
export function ChatTag({ tag, tagsLista = tagsInitial }) {
  if (!tag) return null;
  const m = tagsLista.find(x => x.id === tag) || { label: tag, cor: 'slate' };
  return <span className={`cj-chattag ${m.cor}`}>{m.label}</span>;
}

export default ChatTag;
