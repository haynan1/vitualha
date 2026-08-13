import type { BlockContent, DefinitionContent, Paragraph, PhrasingContent, Root } from 'mdast';
// Importado apenas pelo efeito de tipo: é este pacote que declara
// `hName`/`hProperties` em `Data` do mdast.
import type {} from 'mdast-util-to-hast';
import { visit } from 'unist-util-visit';

/**
 * Transforma diretivas de container em blocos de destaque:
 *
 *   :::dica[Na prática]
 *   Combine proteína com fibras no café da manhã.
 *   :::
 *
 * Existe para dar ao editor blocos ricos sem abrir mão de Markdown puro —
 * o arquivo continua legível e portável, sem JSX preso ao Astro.
 */

type CalloutKind = 'dica' | 'atencao' | 'nota';

const KINDS: Record<string, { kind: CalloutKind; title: string; icon: string }> = {
  // Portugues
  dica: { kind: 'dica', title: 'Dica', icon: '✦' },
  atencao: { kind: 'atencao', title: 'Atenção', icon: '!' },
  nota: { kind: 'nota', title: 'Nota', icon: 'i' },
  // Ingles
  tip: { kind: 'dica', title: 'Tip', icon: '✦' },
  warning: { kind: 'atencao', title: 'Warning', icon: '!' },
  note: { kind: 'nota', title: 'Note', icon: 'i' },
};

type FlowContent = BlockContent | DefinitionContent;

/**
 * `hName` e `hProperties` sao lidos na conversao para HTML: o nó continua
 * sendo um paragrafo valido no mdast, mas sai como a tag escolhida.
 */
function element(tag: string, className: string, children: PhrasingContent[]): Paragraph {
  return {
    type: 'paragraph',
    children,
    data: { hName: tag, hProperties: { class: className } },
  };
}

function wrapper(tag: string, className: string, children: FlowContent[]): FlowContent {
  return {
    type: 'blockquote',
    children,
    data: { hName: tag, hProperties: { class: className } },
  };
}

export function remarkCallouts() {
  return (tree: Root): undefined => {
    visit(tree, 'containerDirective', (node) => {
      const config = KINDS[node.name];
      if (!config) return;

      const children = node.children;

      // `:::dica[Titulo]` vira um paragrafo marcado como label pelo parser.
      const labelIndex = children.findIndex(
        (child) => child.type === 'paragraph' && child.data?.directiveLabel === true,
      );

      const label = labelIndex >= 0 ? children[labelIndex] : undefined;
      const labelChildren =
        label?.type === 'paragraph'
          ? label.children
          : [{ type: 'text' as const, value: config.title }];

      const body = children.filter((_, index) => index !== labelIndex);

      const icon = element('span', 'callout__icon', [{ type: 'text', value: config.icon }]);
      icon.data = {
        hName: 'span',
        hProperties: { class: 'callout__icon', 'aria-hidden': 'true' },
      };

      node.data = {
        hName: 'aside',
        hProperties: { class: `callout callout--${config.kind}` },
      };

      node.children = [
        icon,
        element('p', 'callout__title', labelChildren),
        wrapper('div', 'callout__body', body),
      ];
    });
  };
}
