import type { Locale } from '../../i18n/locales';
import { archiveName, outputName, uniqueNames } from './filename';
import {
  DEFAULT_FORMAT,
  DEFAULT_MATTE,
  DEFAULT_QUALITY,
  FORMAT_KEEPS_ALPHA,
  MAX_BYTES,
  MAX_FILES,
  QUALITY_PRESETS,
  isOutputFormat,
  type OutputFormat,
  type QualityPreset,
} from './formats';
import { ConvertError, ConverterEngine, detectSupport, type ResizePlan } from './engine';
import type { PngInfo } from './png';
import { completeDimension } from './resize';
import { compareSize, formatBytes, formatDimensions } from './stats';
import { inspectPngFile, type RejectionReason } from './validate';
import { createZip } from './zip';

/**
 * Controlador da ferramenta.
 *
 * Responsabilidade unica: ligar o DOM ao motor de conversao. Nenhuma regra de
 * negocio mora aqui — nome de arquivo, dimensao, validacao, comparacao de
 * tamanho e ZIP vivem em modulos proprios, testados sem navegador. O que
 * sobra é o que so faz sentido com uma tela na frente: estado dos elementos,
 * eventos e ciclo de vida das URLs temporarias.
 *
 * Sobre memoria: cada miniatura e cada resultado é uma object URL, e object
 * URL nao é coletada enquanto o documento viver. Toda criacao aqui tem uma
 * revogacao correspondente — ao remover um item, ao reconverter e ao recomecar.
 */

type Status = 'waiting' | 'working' | 'done' | 'error';

type Result = {
  blob: Blob;
  url: string;
  name: string;
  width: number;
  height: number;
};

type Item = {
  id: string;
  file: File;
  info: PngInfo;
  previewUrl: string;
  status: Status;
  error?: string;
  result?: Result;
  row: HTMLElement;
  refs: {
    thumb: HTMLImageElement;
    name: HTMLElement;
    specs: HTMLElement;
    alpha: HTMLElement;
    status: HTMLElement;
    result: HTMLElement;
    download: HTMLButtonElement;
    compare: HTMLButtonElement;
    remove: HTMLButtonElement;
    comparison: HTMLElement;
  };
};

/**
 * Busca um elemento exigindo o tipo em tempo de execucao.
 *
 * O markup é nosso: seletor sem resposta é defeito, nao caso de borda. E
 * conferir com `instanceof` em vez de converter com `as` significa que trocar
 * um `<input>` por um `<div>` no template falha na hora, com o seletor na
 * mensagem — em vez de virar `undefined` tres funcoes adiante.
 */
function must<T extends Element>(
  root: ParentNode,
  selector: string,
  type: abstract new () => T,
): T {
  const found = root.querySelector(selector);

  if (!(found instanceof type)) {
    throw new Error(`converter: elemento ausente ou de tipo inesperado (${selector})`);
  }

  return found;
}

function show(element: Element, visible: boolean): void {
  element.toggleAttribute('hidden', !visible);
}

export function mountConverter(): void {
  const root = document.querySelector<HTMLElement>('[data-converter]');
  if (!root) return;

  // ── Dicionario ───────────────────────────────────────────────────────────
  // Vem do servidor como JSON inerte (nao executavel, logo compativel com a
  // CSP sem 'unsafe-inline'), em vez de duplicado aqui em ingles e portugues.
  const locale = (root.dataset['locale'] ?? 'pt') as Locale;
  // `.text` do proprio <script>, que é sempre string — diferente de
  // `textContent`, herdado de Node e anulavel.
  const dictionary = JSON.parse(must(root, '[data-cv-i18n]', HTMLScriptElement).text) as Record<
    string,
    string
  >;

  const t = (key: string, vars: Record<string, string | number> = {}): string =>
    (dictionary[key] ?? key).replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in vars ? String(vars[name]) : whole,
    );

  // ── Elementos ────────────────────────────────────────────────────────────
  const dropzone = must(root, '[data-cv-drop]', HTMLElement);
  const fileInput = must(root, '[data-cv-input]', HTMLInputElement);
  const pickButton = must(root, '[data-cv-pick]', HTMLButtonElement);
  const alert = must(root, '[data-cv-alert]', HTMLElement);
  const queue = must(root, '[data-cv-queue]', HTMLElement);
  const list = must(root, '[data-cv-list]', HTMLElement);
  const controls = must(root, '[data-cv-controls]', HTMLElement);
  const action = must(root, '[data-cv-action]', HTMLElement);
  const convertButton = must(root, '[data-cv-convert]', HTMLButtonElement);
  const progress = must(root, '[data-cv-progress]', HTMLElement);
  const progressText = must(root, '[data-cv-progress-text]', HTMLElement);
  const progressBar = must(root, '[data-cv-bar]', HTMLElement);
  const results = must(root, '[data-cv-results]', HTMLElement);
  const totals = must(root, '[data-cv-totals]', HTMLElement);
  const downloadAll = must(root, '[data-cv-download-all]', HTMLButtonElement);
  const restart = must(root, '[data-cv-restart]', HTMLButtonElement);
  const quality = must(root, '[data-cv-quality]', HTMLInputElement);
  const qualityLabel = must(root, '[data-cv-quality-label]', HTMLElement);
  const alphaPanel = must(root, '[data-cv-alpha]', HTMLElement);
  const matteInput = must(root, '[data-cv-matte]', HTMLInputElement);
  const resizeToggle = must(root, '[data-cv-resize-toggle]', HTMLInputElement);
  const resizeFields = must(root, '[data-cv-resize-fields]', HTMLElement);
  const widthInput = must(root, '[data-cv-width]', HTMLInputElement);
  const heightInput = must(root, '[data-cv-height]', HTMLInputElement);
  const ratioInput = must(root, '[data-cv-ratio]', HTMLInputElement);
  const template = must(root, '[data-cv-item]', HTMLTemplateElement);

  const formatInputs = [...root.querySelectorAll<HTMLInputElement>('[data-cv-format]')];
  const presetButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-cv-preset]')];
  const edgeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-cv-edge]')];

  // ── Estado ───────────────────────────────────────────────────────────────
  const items: Item[] = [];
  const engine = new ConverterEngine();

  let format: OutputFormat = DEFAULT_FORMAT;
  let busy = false;
  let sequence = 0;
  /** Preset de maior lado; `undefined` significa "usar os campos digitados". */
  let longEdge: number | undefined;

  const errorMessages: Record<RejectionReason, string> = {
    'not-png': t('errorNotPng'),
    'too-large': t('errorTooLarge', { size: formatBytes(MAX_BYTES, locale) }),
    'too-many-pixels': t('errorTooManyPixels'),
    unreadable: t('errorUnreadable'),
  };

  function announce(message: string): void {
    alert.textContent = message;
    show(alert, message.length > 0);
  }

  function currentPlan(): ResizePlan {
    if (longEdge !== undefined) return { kind: 'longEdge', maxEdge: longEdge };
    if (!resizeToggle.checked) return { kind: 'original' };

    const width = Number.parseInt(widthInput.value, 10);
    const height = Number.parseInt(heightInput.value, 10);

    return {
      kind: 'custom',
      width: Number.isFinite(width) ? width : undefined,
      height: Number.isFinite(height) ? height : undefined,
      keepRatio: ratioInput.checked,
    };
  }

  /** Só faz sentido perguntar a cor de fundo se houver transparencia a perder. */
  function syncAlphaPanel(): void {
    const needed = !FORMAT_KEEPS_ALPHA[format] && items.some((item) => item.info.mayHaveAlpha);

    show(alphaPanel, needed);
  }

  function syncVisibility(): void {
    const has = items.length > 0;

    show(queue, has);
    show(controls, has);
    show(action, has);

    const done = items.filter((item) => item.status === 'done');
    show(results, done.length > 0);
    show(downloadAll, done.length > 1);

    syncAlphaPanel();
  }

  function releaseResult(item: Item): void {
    if (!item.result) return;

    URL.revokeObjectURL(item.result.url);
    delete item.result;
  }

  function renderItemState(item: Item): void {
    const labels: Record<Status, string> = {
      waiting: t('statusWaiting'),
      working: t('statusWorking'),
      done: t('statusDone'),
      error: t('statusError'),
    };

    item.refs.status.textContent = labels[item.status];
    // Estado tambem no atributo, e nao so na cor: quem nao distingue verde de
    // vermelho continua lendo "Concluido" ou "Erro".
    item.refs.status.dataset['state'] = item.status;

    if (item.status === 'error') {
      item.refs.result.textContent = item.error ?? t('errorEncode');
      item.refs.result.dataset['tone'] = 'error';
    } else if (item.status === 'done' && item.result) {
      const delta = compareSize(item.file.size, item.result.blob.size);

      item.refs.result.textContent = delta.grew
        ? t('grew', { percent: delta.percent })
        : `${formatBytes(item.result.blob.size, locale)} · −${delta.percent}%`;
      item.refs.result.dataset['tone'] = delta.grew ? 'warn' : 'good';
    } else {
      item.refs.result.textContent = '';
      delete item.refs.result.dataset['tone'];
    }

    const finished = item.status === 'done' && item.result !== undefined;
    show(item.refs.download, finished);
    show(item.refs.compare, finished);

    if (finished && item.result) {
      item.refs.download.setAttribute('aria-label', t('downloadAria', { name: item.result.name }));
    }
  }

  function renderTotals(): void {
    const done = items.filter((item) => item.status === 'done' && item.result);
    if (done.length === 0) return;

    const before = done.reduce((sum, item) => sum + item.file.size, 0);
    const after = done.reduce((sum, item) => sum + (item.result?.blob.size ?? 0), 0);
    const delta = compareSize(before, after);

    totals.replaceChildren(
      cell(t('originalSize'), formatBytes(before, locale)),
      cell(t('newSize'), formatBytes(after, locale)),
      cell(
        delta.grew ? t('after') : t('reduction'),
        delta.grew ? t('grew', { percent: delta.percent }) : `${delta.percent}%`,
        delta.grew ? 'warn' : 'good',
      ),
    );
  }

  function cell(label: string, value: string, tone?: string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cv__total';
    if (tone) wrapper.dataset['tone'] = tone;

    const term = document.createElement('span');
    term.className = 'cv__total-label';
    term.textContent = label;

    const data = document.createElement('strong');
    data.className = 'cv__total-value';
    data.textContent = value;

    wrapper.append(term, data);
    return wrapper;
  }

  // ── Comparacao antes/depois ──────────────────────────────────────────────
  // Construida sob demanda: quem nao clica nao paga nem o DOM nem a segunda
  // decodificacao da imagem.
  function toggleComparison(item: Item): void {
    const open = !item.refs.comparison.hasAttribute('hidden');

    if (open) {
      item.refs.comparison.replaceChildren();
      show(item.refs.comparison, false);
      item.refs.compare.textContent = t('compare');
      return;
    }

    if (!item.result) return;

    const frame = document.createElement('div');
    frame.className = 'cv__compare';

    const after = document.createElement('img');
    after.className = 'cv__compare-img';
    after.src = item.result.url;
    after.alt = t('compareAfter');

    const beforeWrap = document.createElement('div');
    beforeWrap.className = 'cv__compare-before';

    const before = document.createElement('img');
    before.className = 'cv__compare-img';
    before.src = item.previewUrl;
    before.alt = t('compareBefore');

    beforeWrap.append(before);

    const handle = document.createElement('input');
    handle.type = 'range';
    handle.min = '0';
    handle.max = '100';
    handle.value = '50';
    handle.className = 'cv__compare-range';
    handle.setAttribute('aria-label', t('compareAria'));

    handle.addEventListener('input', () => {
      // A imagem original é recortada pela direita; o resto revela a convertida.
      beforeWrap.style.setProperty('--cv-split', `${handle.value}%`);
    });

    beforeWrap.style.setProperty('--cv-split', '50%');
    frame.append(after, beforeWrap, handle);
    item.refs.comparison.replaceChildren(frame);
    show(item.refs.comparison, true);
    item.refs.compare.textContent = t('compareClose');
  }

  // ── Fila ─────────────────────────────────────────────────────────────────
  function removeItem(item: Item): void {
    const index = items.indexOf(item);
    if (index >= 0) items.splice(index, 1);

    URL.revokeObjectURL(item.previewUrl);
    releaseResult(item);
    item.row.remove();

    syncVisibility();
    renderTotals();
  }

  function createItem(file: File, info: PngInfo): Item {
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const row = must(fragment, '.cv__item', HTMLElement);

    const refs = {
      thumb: must(row, '[data-thumb]', HTMLImageElement),
      name: must(row, '[data-name]', HTMLElement),
      specs: must(row, '[data-specs]', HTMLElement),
      alpha: must(row, '[data-alpha]', HTMLElement),
      status: must(row, '[data-status]', HTMLElement),
      result: must(row, '[data-result]', HTMLElement),
      download: must(row, '[data-download]', HTMLButtonElement),
      compare: must(row, '[data-compare]', HTMLButtonElement),
      remove: must(row, '[data-remove]', HTMLButtonElement),
      comparison: must(row, '[data-comparison]', HTMLElement),
    };

    sequence += 1;

    const item: Item = {
      id: `cv-${sequence}`,
      file,
      info,
      previewUrl: URL.createObjectURL(file),
      status: 'waiting',
      row,
      refs,
    };

    refs.thumb.src = item.previewUrl;
    // `textContent`, nunca innerHTML: o nome do arquivo é texto de terceiro, e
    // é o unico caminho por onde markup do usuario chegaria a esta pagina.
    refs.thumb.alt = file.name;
    refs.name.textContent = file.name;
    refs.specs.textContent = `${formatDimensions(info.width, info.height, locale)} · PNG · ${formatBytes(file.size, locale)}`;

    show(refs.alpha, info.mayHaveAlpha);
    refs.alpha.textContent = t('transparency');
    refs.remove.setAttribute('aria-label', t('removeAria', { name: file.name }));
    refs.compare.textContent = t('compare');
    refs.download.textContent = t('download');

    refs.download.addEventListener('click', () => {
      if (item.result) triggerDownload(item.result.url, item.result.name);
    });

    refs.remove.addEventListener('click', () => {
      if (busy) return;
      removeItem(item);
    });

    refs.compare.addEventListener('click', () => {
      toggleComparison(item);
    });

    renderItemState(item);
    list.append(fragment);

    return item;
  }

  async function addFiles(files: readonly File[]): Promise<void> {
    if (busy || files.length === 0) return;

    announce('');

    const room = MAX_FILES - items.length;
    if (room <= 0) {
      announce(t('errorTooManyFiles', { count: MAX_FILES }));
      return;
    }

    const accepted = files.slice(0, room);
    const rejections: string[] = [];

    for (const file of accepted) {
      const inspection = await inspectPngFile(file);

      if (!inspection.ok) {
        rejections.push(`${file.name}: ${errorMessages[inspection.reason]}`);
        continue;
      }

      items.push(createItem(file, inspection.info));
    }

    if (files.length > room) rejections.push(t('errorTooManyFiles', { count: MAX_FILES }));
    if (rejections.length > 0) announce(rejections.join('\n'));

    syncVisibility();
  }

  // ── Conversao ────────────────────────────────────────────────────────────
  function setBusy(value: boolean): void {
    busy = value;
    convertButton.disabled = value;
    fileInput.disabled = value;
    pickButton.disabled = value;
    convertButton.textContent = value ? t('converting') : t('convert');

    for (const input of formatInputs) input.disabled = value;
    quality.disabled = value;
  }

  async function convertAll(): Promise<void> {
    if (busy || items.length === 0) return;

    announce('');
    setBusy(true);
    show(progress, true);

    const plan = currentPlan();
    const level = Number.parseInt(quality.value, 10);
    const matte = matteInput.value;

    let done = 0;

    for (const item of items) {
      // Reconverter apos trocar formato: o resultado anterior perde a validade
      // e a URL dele precisa morrer junto, senao vaza a cada rodada.
      releaseResult(item);

      item.status = 'working';
      renderItemState(item);

      progressText.textContent = t('progress', { done: done + 1, total: items.length });
      progressBar.style.width = `${Math.round((done / items.length) * 100)}%`;

      try {
        const output = await engine.convert(item.file, {
          format,
          quality: level,
          matte,
          resize: plan,
        });

        item.result = {
          blob: output.blob,
          url: URL.createObjectURL(output.blob),
          name: outputName(item.file.name, format),
          width: output.width,
          height: output.height,
        };

        item.status = 'done';
        delete item.error;
      } catch (error) {
        item.status = 'error';
        item.error =
          error instanceof ConvertError
            ? {
                decode: t('errorDecode'),
                unsupported: t('errorUnsupported'),
                memory: t('errorMemory'),
                encode: t('errorEncode'),
              }[error.failure]
            : t('errorEncode');
      }

      renderItemState(item);
      done += 1;
      progressBar.style.width = `${Math.round((done / items.length) * 100)}%`;
    }

    progressText.textContent = '';
    show(progress, false);
    setBusy(false);
    syncVisibility();
    renderTotals();
  }

  // ── Download ─────────────────────────────────────────────────────────────
  function triggerDownload(url: string, name: string): void {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  async function downloadArchive(): Promise<void> {
    const done = items.filter((item) => item.status === 'done' && item.result);
    if (done.length === 0) return;

    downloadAll.disabled = true;

    try {
      const names = uniqueNames(done.map((item) => item.result?.name ?? 'image'));

      const entries = await Promise.all(
        done.map(async (item, index) => ({
          name: names[index] ?? `image-${index}`,
          data: new Uint8Array(await (item.result as Result).blob.arrayBuffer()),
        })),
      );

      const zip = createZip(entries);
      const url = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));

      triggerDownload(url, archiveName(format));
      // O navegador ja copiou os bytes ao iniciar o download; segurar a URL
      // manteria o ZIP inteiro na memoria ate a pagina fechar.
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 30_000);
    } catch {
      announce(t('errorEncode'));
    } finally {
      downloadAll.disabled = false;
    }
  }

  function reset(): void {
    for (const item of [...items]) removeItem(item);

    engine.dispose();
    announce('');
    totals.replaceChildren();
    syncVisibility();
    dropzone.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // ── Eventos ──────────────────────────────────────────────────────────────
  pickButton.addEventListener('click', () => {
    fileInput.click();
  });

  dropzone.addEventListener('click', (event) => {
    // O botao ja abre o seletor; sem isto o clique nele abriria duas vezes.
    if (event.target instanceof Element && event.target.closest('button')) return;
    if (!busy) fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    void addFiles([...(fileInput.files ?? [])]);
    // Zerar permite reenviar o mesmo arquivo depois de remove-lo da lista.
    fileInput.value = '';
  });

  for (const event of ['dragenter', 'dragover'] as const) {
    dropzone.addEventListener(event, (native) => {
      native.preventDefault();
      dropzone.dataset['over'] = '';
    });
  }

  for (const event of ['dragleave', 'drop'] as const) {
    dropzone.addEventListener(event, () => delete dropzone.dataset['over']);
  }

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    void addFiles([...(event.dataTransfer?.files ?? [])]);
  });

  // Colar da area de transferencia. Escuta no documento porque o Ctrl+V raramente
  // acontece com o foco exatamente sobre a area de envio.
  document.addEventListener('paste', (event) => {
    const files = [...(event.clipboardData?.files ?? [])];
    if (files.length > 0) void addFiles(files);
  });

  for (const input of formatInputs) {
    input.addEventListener('change', () => {
      if (isOutputFormat(input.value)) format = input.value;
      syncAlphaPanel();
    });
  }

  function setQuality(value: number): void {
    quality.value = String(value);
    qualityLabel.textContent = t('qualityValue', { value });

    for (const button of presetButtons) {
      const preset = button.dataset['cvPreset'] as QualityPreset | undefined;
      const active = preset !== undefined && QUALITY_PRESETS[preset] === value;

      button.setAttribute('aria-pressed', String(active));
    }
  }

  quality.addEventListener('input', () => {
    setQuality(Number.parseInt(quality.value, 10));
  });

  for (const button of presetButtons) {
    button.addEventListener('click', () => {
      const preset = button.dataset['cvPreset'] as QualityPreset | undefined;
      if (preset) setQuality(QUALITY_PRESETS[preset]);
    });
  }

  resizeToggle.addEventListener('change', () => {
    show(resizeFields, resizeToggle.checked);
    if (resizeToggle.checked) longEdge = undefined;
    syncEdgeButtons();
  });

  function syncEdgeButtons(): void {
    for (const button of edgeButtons) {
      const value = Number.parseInt(button.dataset['cvEdge'] ?? '', 10);
      const active = Number.isFinite(value) ? longEdge === value : longEdge === undefined;

      button.setAttribute('aria-pressed', String(active));
    }
  }

  for (const button of edgeButtons) {
    button.addEventListener('click', () => {
      const value = Number.parseInt(button.dataset['cvEdge'] ?? '', 10);

      longEdge = Number.isFinite(value) ? value : undefined;
      // Preset e campos manuais sao caminhos alternativos: ligar um desliga o
      // outro, para nao existir estado em que os dois discordam.
      if (longEdge !== undefined) {
        resizeToggle.checked = false;
        show(resizeFields, false);
      }

      syncEdgeButtons();
    });
  }

  // Espelha a proporcao entre os dois campos, usando a primeira imagem da fila
  // como referencia — é a que o usuario tem na tela ao digitar.
  for (const [edited, input, other] of [
    ['width', widthInput, heightInput],
    ['height', heightInput, widthInput],
  ] as const) {
    input.addEventListener('input', () => {
      if (!ratioInput.checked) return;

      const reference = items[0];
      const value = Number.parseInt(input.value, 10);
      if (!reference || !Number.isFinite(value) || value <= 0) return;

      const next = completeDimension(
        { width: reference.info.width, height: reference.info.height },
        edited,
        value,
      );

      other.value = String(edited === 'width' ? next.height : next.width);
    });
  }

  convertButton.addEventListener('click', () => void convertAll());
  downloadAll.addEventListener('click', () => void downloadArchive());
  restart.addEventListener('click', reset);

  // Object URL sobrevive ao recarregamento se ninguem revogar.
  window.addEventListener('pagehide', () => {
    for (const item of items) {
      URL.revokeObjectURL(item.previewUrl);
      releaseResult(item);
    }

    engine.dispose();
  });

  // ── Estado inicial ───────────────────────────────────────────────────────
  matteInput.value = DEFAULT_MATTE;
  setQuality(DEFAULT_QUALITY);
  syncEdgeButtons();
  show(resizeFields, false);
  syncVisibility();

  // O formato indisponivel é desligado antes de o usuario tentar usa-lo — e
  // com o motivo escrito, nao apenas apagado.
  void detectSupport().then((support) => {
    for (const input of formatInputs) {
      if (!isOutputFormat(input.value) || support[input.value]) continue;

      input.disabled = true;
      const label = input.closest('label');
      label?.setAttribute('data-unsupported', '');
      label?.setAttribute('title', t('formatUnsupported'));

      if (format === input.value) {
        const fallback = formatInputs.find((option) => !option.disabled);

        if (fallback && isOutputFormat(fallback.value)) {
          fallback.checked = true;
          format = fallback.value;
          syncAlphaPanel();
        }
      }
    }
  });
}
