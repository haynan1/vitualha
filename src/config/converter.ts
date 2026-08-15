import type { Locale } from '../i18n/locales';

/**
 * Conteudo editorial da pagina do conversor.
 *
 * Fica em codigo, e nao no CMS, pelo mesmo motivo das categorias: é estrutura
 * da pagina, nao publicacao. O texto acompanha o que a ferramenta faz de fato,
 * e mudar um sem o outro seria justamente o erro a evitar — uma pergunta do
 * FAQ afirmando processamento local numa versao que passou a enviar arquivo
 * para servidor.
 *
 * Todo numero citado aqui é verificavel na implementacao. Nada de "10 milhoes
 * de usuarios" ou "99% de reducao".
 */

type Section = { heading: string; body: readonly string[] };

type FormatRow = { format: string; note: string };

type FaqItem = { question: string; answer: string };

type ConverterCopy = {
  /** <title> da pagina. Nao recebe o sufixo da marca. */
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: readonly Section[];
  tableHeading: string;
  tableFormatLabel: string;
  tableNoteLabel: string;
  table: readonly FormatRow[];
  faqHeading: string;
  faq: readonly FaqItem[];
};

export const CONVERTER: Record<Locale, ConverterCopy> = {
  pt: {
    metaTitle: 'Conversor PNG para JPG, WebP e AVIF Online Grátis',
    metaDescription:
      'Converta imagens PNG para JPG, WebP ou AVIF online com alta qualidade. Processamento rápido e privado diretamente no seu navegador.',
    h1: 'Conversor de PNG para JPG, WebP e AVIF',
    intro:
      'Converta suas imagens sem instalar nada e sem enviar arquivo para lugar nenhum. Escolha o formato, ajuste a qualidade e baixe o resultado.',
    sections: [
      {
        heading: 'O que é um conversor PNG?',
        body: [
          'PNG é um formato sem perdas: ele guarda cada pixel exatamente como foi criado. Isso é excelente para logos, gráficos e capturas de tela, e é a razão de o arquivo costumar ser grande — principalmente em fotografia, onde há milhões de cores e nenhuma repetição para o formato aproveitar.',
          'Um conversor troca esse formato por outro mais adequado ao destino. Na web, onde o peso da página afeta diretamente o tempo de carregamento, trocar um PNG de 2,8 MB por um WebP de 300 KB é a diferença entre uma página que abre e uma que faz o leitor desistir.',
        ],
      },
      {
        heading: 'PNG para JPG',
        body: [
          'JPEG usa compressão com perdas: descarta informação que o olho humano dificilmente percebe. É a melhor escolha para fotografias, onde essa perda é praticamente invisível e a economia é grande.',
          'A limitação importante é a transparência: JPEG não tem canal alfa. Ao converter um PNG transparente, as áreas vazias precisam ganhar uma cor — por isso esta ferramenta pergunta qual antes de converter, em vez de decidir por você.',
          'É também o formato com maior compatibilidade: não existe navegador, sistema ou programa relevante que não abra um JPEG.',
        ],
      },
      {
        heading: 'PNG para WebP',
        body: [
          'WebP foi desenhado para a web e costuma gerar arquivos menores que o JPEG na mesma qualidade percebida. Diferente do JPEG, ele preserva transparência — o que faz dele o substituto mais direto do PNG em logo, ícone e imagem com fundo recortado.',
          'O suporte é amplo: todos os navegadores atuais exibem WebP. Para a maioria dos sites, é a escolha padrão mais segura.',
        ],
      },
      {
        heading: 'PNG para AVIF',
        body: [
          'AVIF é o mais recente dos três e o que costuma comprimir melhor: na mesma qualidade percebida, gera arquivos menores que WebP e bem menores que JPEG. Também preserva transparência e lida bem com gradientes, onde formatos mais antigos mostram faixas.',
          'Em troca, a codificação é mais lenta — é o único dos três que nenhum navegador codifica nativamente, e aqui ele roda por WebAssembly dentro da própria página. Uma imagem grande pode levar alguns segundos.',
        ],
      },
    ],
    tableHeading: 'Qual formato escolher?',
    tableFormatLabel: 'Formato',
    tableNoteLabel: 'Melhor para',
    table: [
      { format: 'PNG', note: 'Gráficos, logos e transparência, quando não se pode perder nada.' },
      { format: 'JPEG', note: 'Fotografias e ampla compatibilidade.' },
      {
        format: 'WebP',
        note: 'Uso geral em sites: bom equilíbrio entre tamanho, qualidade e suporte.',
      },
      {
        format: 'AVIF',
        note: 'Melhor compressão disponível, quando o tempo de conversão não é problema.',
      },
    ],
    faqHeading: 'Perguntas frequentes',
    faq: [
      {
        question: 'Converter PNG para JPG reduz a qualidade?',
        answer:
          'Sim, JPEG usa compressão com perdas. Mas em níveis altos de qualidade — de 90 a 95, que é a faixa padrão desta ferramenta — a diferença visual é praticamente imperceptível na maioria das imagens, enquanto o arquivo fica bem menor. Em imagens com texto fino ou linhas de alto contraste a perda aparece antes; nesses casos, WebP ou PNG costumam ser a escolha melhor.',
      },
      {
        question: 'Qual qualidade JPEG devo usar?',
        answer:
          'Para imagens destinadas à web, algo entre 90 e 95 costuma ser o melhor equilíbrio. Abaixo de 70 começam a aparecer blocos visíveis em gradientes e tons de pele. Acima de 95 o arquivo cresce rápido sem ganho visual proporcional.',
      },
      {
        question: 'WebP é melhor que JPG?',
        answer:
          'Depende do objetivo. Para a maioria dos usos em sites, WebP entrega arquivos menores mantendo qualidade equivalente, e ainda preserva transparência. JPEG continua vencendo em compatibilidade com programas e equipamentos antigos, e é o formato que qualquer pessoa consegue abrir sem pensar.',
      },
      {
        question: 'AVIF é melhor que WebP?',
        answer:
          'Em compressão, normalmente sim: na mesma qualidade percebida, AVIF costuma gerar arquivos menores. Mas não é superior em tudo. A codificação é bem mais lenta, o suporte em ferramentas de edição e em sistemas antigos ainda é menor, e em imagens pequenas a vantagem de tamanho quase desaparece. Para um site moderno, AVIF com WebP como alternativa é uma combinação sólida.',
      },
      {
        question: 'Minhas imagens são enviadas para algum servidor?',
        answer:
          'Não. A conversão acontece inteiramente dentro do seu navegador, usando os recursos do próprio dispositivo. Nenhum arquivo é enviado para os nossos servidores, para serviços de terceiros ou para qualquer armazenamento. Nada é guardado depois que você fecha a página, e você pode conferir desligando a internet: o conversor continua funcionando.',
      },
    ],
  },
  en: {
    metaTitle: 'PNG to JPG, WebP & AVIF Converter – Free Online Tool',
    metaDescription:
      'Convert PNG images to JPG, WebP or AVIF online with high quality. Fast and private processing directly in your browser.',
    h1: 'PNG to JPG, WebP & AVIF Converter',
    intro:
      'Convert your images without installing anything and without uploading a file anywhere. Pick a format, adjust the quality and download the result.',
    sections: [
      {
        heading: 'What is a PNG converter?',
        body: [
          'PNG is a lossless format: it stores every pixel exactly as it was created. That is excellent for logos, graphics and screenshots, and it is why the files tend to be large — especially for photographs, where there are millions of colours and little repetition for the format to exploit.',
          'A converter swaps that format for one better suited to its destination. On the web, where page weight directly affects loading time, turning a 2.8 MB PNG into a 300 KB WebP is the difference between a page that opens and one the reader abandons.',
        ],
      },
      {
        heading: 'PNG to JPG',
        body: [
          'JPEG uses lossy compression: it discards information the human eye is unlikely to notice. It is the best choice for photographs, where that loss is practically invisible and the saving is substantial.',
          'The important limitation is transparency: JPEG has no alpha channel. When converting a transparent PNG, the empty areas need a colour — which is why this tool asks which one before converting, instead of deciding for you.',
          'It is also the most compatible format: there is no relevant browser, system or program that cannot open a JPEG.',
        ],
      },
      {
        heading: 'PNG to WebP',
        body: [
          'WebP was designed for the web and usually produces smaller files than JPEG at the same perceived quality. Unlike JPEG, it preserves transparency — which makes it the most direct replacement for PNG in logos, icons and cut-out images.',
          'Support is broad: every current browser displays WebP. For most websites, it is the safest default.',
        ],
      },
      {
        heading: 'PNG to AVIF',
        body: [
          'AVIF is the newest of the three and usually compresses best: at the same perceived quality it produces smaller files than WebP and considerably smaller than JPEG. It also preserves transparency and handles gradients well, where older formats show banding.',
          'The trade-off is slower encoding — it is the only one of the three that no browser encodes natively, and here it runs through WebAssembly inside the page itself. A large image may take a few seconds.',
        ],
      },
    ],
    tableHeading: 'Which format should you choose?',
    tableFormatLabel: 'Format',
    tableNoteLabel: 'Best for',
    table: [
      { format: 'PNG', note: 'Graphics, logos and transparency, when nothing can be lost.' },
      { format: 'JPEG', note: 'Photographs and broad compatibility.' },
      { format: 'WebP', note: 'General website use: a good balance of size, quality and support.' },
      {
        format: 'AVIF',
        note: 'The best compression available, when conversion time is not a concern.',
      },
    ],
    faqHeading: 'Frequently asked questions',
    faq: [
      {
        question: 'Does converting PNG to JPG reduce quality?',
        answer:
          'Yes, JPEG uses lossy compression. But at high quality levels — 90 to 95, which is this tool default range — the visual difference is practically imperceptible on most images, while the file gets considerably smaller. On images with fine text or high-contrast lines the loss shows up sooner; there, WebP or PNG are usually the better choice.',
      },
      {
        question: 'Which JPEG quality should I use?',
        answer:
          'For images destined for the web, somewhere between 90 and 95 is usually the best balance. Below 70, visible blocking starts to appear in gradients and skin tones. Above 95 the file grows quickly without a proportional visual gain.',
      },
      {
        question: 'Is WebP better than JPG?',
        answer:
          'It depends on the goal. For most website use, WebP delivers smaller files at equivalent quality and preserves transparency as well. JPEG still wins on compatibility with older programs and devices, and it is the format anyone can open without thinking about it.',
      },
      {
        question: 'Is AVIF better than WebP?',
        answer:
          'On compression, usually yes: at the same perceived quality, AVIF tends to produce smaller files. But it is not superior in every respect. Encoding is considerably slower, support in editing tools and older systems is still narrower, and on small images the size advantage nearly disappears. For a modern site, AVIF with WebP as a fallback is a solid combination.',
      },
      {
        question: 'Are my images uploaded to a server?',
        answer:
          'No. Conversion happens entirely inside your browser, using your own device resources. No file is sent to our servers, to third-party services or to any storage. Nothing is kept after you close the page, and you can verify it by disconnecting from the internet: the converter keeps working.',
      },
    ],
  },
};
