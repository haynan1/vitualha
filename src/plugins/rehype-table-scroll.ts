import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * Envolve toda tabela num container com rolagem horizontal propria.
 * Sem isso, uma tabela larga no celular empurra a pagina inteira para o lado —
 * o defeito de layout mais comum em blog com conteudo tabular.
 */
export function rehypeTableScroll() {
  return (tree: Root): undefined => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index === undefined) return;
      if (
        parent.type === 'element' &&
        parent.properties['className']?.toString().includes('table-scroll')
      ) {
        return;
      }

      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        // tabIndex sem role: o container fica rolavel pelo teclado sem virar
        // uma regiao anonima anunciada pelo leitor de tela.
        properties: { className: ['table-scroll'], tabIndex: 0 },
        children: [node],
      };

      parent.children.splice(index, 1, wrapper);
    });
  };
}
