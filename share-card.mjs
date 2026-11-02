import hexagrams from './hexagram-catalog.mjs';
import { catalogLines } from './derived-hexagrams.mjs';
import { displayHexagramName } from './hexagram-i18n.mjs';
import { BRAND_COPY } from './brand-content.mjs?v=20261102-i18n1';
import { attributeHtml, textHtml } from './html-safety.mjs';

const PUBLIC_SITE = 'https://guanxiang.wayella.com/';
const copy = (key, language) => BRAND_COPY[key][language === 'fa' ? 2 : language === 'en' ? 1 : 0];
const shorten = (value, limit) => {
  const characters = [...String(value || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim()];
  return characters.length > limit ? characters.slice(0, limit).join('') + '…' : characters.join('');
};

// Explicit allowlist: never serialize the record, account, record ID, or current URL.
export function createShareModel(source, choices = {}, language = 'zh-CN') {
  const index = Number.isInteger(source?.originalIndex) && hexagrams[source.originalIndex] ? source.originalIndex : 0;
  const changed = Number.isInteger(source?.changedIndex) && hexagrams[source.changedIndex] ? source.changedIndex : index;
  const title = i => language === 'en' ? displayHexagramName(i, 'en', hexagrams[i][0]) : hexagrams[i][2];
  const blocks = [];
  if (choices.quote !== false) blocks.push({ label: '《周易》', text: shorten(source.quote || hexagrams[index][4], 160) });
  if (source.kind === 'example') {
    blocks.push({ label: copy('actionLabel', language), text: copy('action', language) });
    blocks.push({ label: copy('reviewLabel', language), text: copy('review', language) });
  }
  if (choices.question === true && source.question) blocks.push({ label: copy('questionCard', language), text: shorten(source.question, 100) });
  if (choices.note === true && source.note) blocks.push({ label: copy('noteCard', language), text: shorten(source.note, 180) });
  return {
    language, index, changed, title: title(index), changedTitle: changed === index ? '' : title(changed),
    kicker: copy(source.kind === 'example' ? 'exampleCard' : source.kind === 'study' ? 'studyCard' : 'readingCard', language),
    blocks, url: `${PUBLIC_SITE}#hexagrams/${index + 1}`,
    privateIncluded: Boolean((choices.question === true && source.question) || (choices.note === true && source.note)),
  };
}

function wrap(context, text, width) {
  const result = [];
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;
  for (const paragraph of text.split('\n')) {
    let line = '';
    const words = segmenter ? [...segmenter.segment(paragraph)].map(part => part.segment) : [...paragraph];
    for (const word of words) {
      if (context.measureText(line + word).width <= width) { line += word; continue; }
      if (line.trim()) result.push(line.trim());
      line = '';
      for (const character of word) {
        if (context.measureText(line + character).width > width && line) { result.push(line); line = ''; }
        line += character;
      }
    }
    if (line.trim()) result.push(line.trim());
  }
  return result;
}

function taiji(context, x, y, radius) {
  context.save(); context.translate(x - radius, y - radius); context.scale(radius / 256, radius / 256);
  context.fillStyle = '#2e302c'; context.beginPath();
  if (context.roundRect) context.roundRect(0, 0, 512, 512, 72); else context.rect(0, 0, 512, 512);
  context.fill();
  context.fillStyle = '#f4f0e6'; context.beginPath(); context.arc(256, 256, 168, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#b55238'; context.fill(new Path2D('M256 88a168 168 0 0 1 0 336c-47 0-84-38-84-84s37-84 84-84 84-38 84-84-37-84-84-84z'));
  context.beginPath(); context.arc(256, 172, 22, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#f4f0e6'; context.beginPath(); context.arc(256, 340, 22, 0, Math.PI * 2); context.fill(); context.restore();
}

export async function renderShareImage(model) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  const sans = '"Microsoft YaHei", "PingFang SC", sans-serif';
  const serif = '"Songti SC", SimSun, serif';
  context.font = `34px ${sans}`;
  const blocks = model.blocks.map(block => ({ ...block, lines: wrap(context, block.text, 888) }));
  canvas.width = 1080;
  canvas.height = Math.max(1080, 700 + blocks.reduce((height, block) => height + 96 + block.lines.length * 52, 0));
  const rtl = model.language === 'fa';
  context.fillStyle = '#f4f0e6'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#d8d1c2'; context.lineWidth = 2; context.strokeRect(30, 30, 1020, canvas.height - 60);
  taiji(context, 108, 112, 36);
  context.fillStyle = '#2e302c'; context.font = `bold 44px ${serif}`; context.fillText('观象', 167, 126);
  context.font = `22px ${sans}`; context.fillStyle = '#7d786c'; context.fillText('GUANXIANG', 765, 120);
  context.strokeStyle = '#d8d1c2'; context.beginPath(); context.moveTo(84, 176); context.lineTo(996, 176); context.stroke();
  context.direction = rtl ? 'rtl' : 'ltr'; context.textAlign = rtl ? 'right' : 'left';
  const x = rtl ? 984 : 96;
  context.fillStyle = '#b55238'; context.font = `26px ${sans}`;
  context.fillText(model.kicker, x, 235, 888);
  context.fillStyle = '#2e302c'; context.font = `bold 66px ${serif}`;
  context.fillText(model.title, rtl ? 984 : 96, 362, 660);
  context.font = `28px ${sans}`; context.fillStyle = '#7d786c';
  context.fillText(model.changedTitle ? `→ ${model.changedTitle}` : `NO. ${String(model.index + 1).padStart(2, '0')}`, x, 416, 660);
  const lineX = rtl ? 96 : 812;
  context.fillStyle = '#2e302c';
  [...catalogLines(model.index)].reverse().forEach((solid, i) => {
    const y = 287 + i * 23;
    if (solid) context.fillRect(lineX, y, 172, 11);
    else { context.fillRect(lineX, y, 75, 11); context.fillRect(lineX + 97, y, 75, 11); }
  });
  let y = 505;
  for (const block of blocks) {
    context.fillStyle = '#b55238'; context.font = `25px ${sans}`; context.fillText(block.label, x, y, 888); y += 54;
    context.fillStyle = '#2e302c'; context.font = `34px ${sans}`;
    for (const line of block.lines) { context.fillText(line, x, y); y += 52; }
    y += 42;
  }
  context.strokeStyle = '#d8d1c2'; context.beginPath(); context.moveTo(96, canvas.height - 180); context.lineTo(984, canvas.height - 180); context.stroke();
  context.fillStyle = '#2e302c'; context.font = `28px ${serif}`;
  context.fillText(copy('footer', model.language), x, canvas.height - 121, 888);
  context.direction = 'ltr'; context.textAlign = 'left'; context.font = `23px ${sans}`; context.fillStyle = '#7d786c';
  context.fillText('guanxiang.wayella.com', 96, canvas.height - 72);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image encoding failed')), 'image/png'));
}

export function initShareCards({ getSource, getLanguage }) {
  let dialog, activeSource, activeModel, file, objectUrl, revision = 0, opener;
  const clearImage = () => { if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = null; file = null; };
  const close = () => { if (dialog?.open) dialog.close(); };
  document.addEventListener('guanxiang:languagechange', close);
  window.addEventListener('popstate', close);
  window.addEventListener('hashchange', close);
  async function refresh() {
    const ownRevision = ++revision, language = getLanguage();
    clearImage();
    dialog.querySelector('[data-share-preview]').removeAttribute('src');
    dialog.querySelector('[data-save-image]').removeAttribute('href');
    dialog.querySelector('[data-save-image]').setAttribute('aria-disabled', 'true');
    dialog.querySelector('[data-send-image]').disabled = true;
    const choices = Object.fromEntries([...dialog.querySelectorAll('input')].map(input => [input.name, input.checked]));
    activeModel = createShareModel(activeSource, choices, language);
    dialog.querySelector('[data-share-privacy]').textContent = copy(activeModel.privateIncluded ? 'privateIncluded' : 'publicOnly', language);
    const link = dialog.querySelector('[data-public-link]'); link.href = activeModel.url; link.textContent = activeModel.url;
    dialog.querySelector('[data-share-status]').textContent = '';
    try {
      const blob = await renderShareImage(activeModel);
      if (ownRevision !== revision || !dialog.open) return;
      objectUrl = URL.createObjectURL(blob); file = new File([blob], 'guanxiang-card.png', { type: 'image/png' });
      dialog.querySelector('[data-share-preview]').src = objectUrl;
      const save = dialog.querySelector('[data-save-image]'); save.href = objectUrl; save.removeAttribute('aria-disabled');
      const send = dialog.querySelector('[data-send-image]');
      let supported = false;
      try { supported = Boolean(navigator.share && navigator.canShare?.({ files: [file] })); } catch {}
      send.hidden = !supported; send.disabled = !supported;
    } catch { if (ownRevision === revision && dialog.open) dialog.querySelector('[data-share-status]').textContent = copy('imageFailed', language); }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-share-card]');
    if (!button) return;
    const source = getSource(button);
    if (!source) return;
    activeSource = source; opener = button;
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.className = 'share-dialog'; dialog.id = 'shareCardDialog';
      dialog.setAttribute('aria-labelledby', 'shareCardTitle'); document.body.append(dialog);
      dialog.addEventListener('close', () => { revision++; clearImage(); dialog.replaceChildren(); if (opener?.isConnected) opener.focus({ preventScroll: true }); activeSource = activeModel = null; });
    }
    const language = getLanguage(), c = key => textHtml(copy(key, language));
    dialog.innerHTML = `<div class="share-dialog-head"><span class="panel-kicker">GUANXIANG</span><button type="button" data-share-close aria-label="${attributeHtml(language === 'zh-CN' ? '关闭' : language === 'fa' ? 'بستن' : 'Close')}">×</button></div><h2 id="shareCardTitle">${c('shareTitle')}</h2><p class="share-hint">${c('shareHint')}</p><div class="share-dialog-grid"><div class="share-options"><label><input type="checkbox" name="quote" checked> ${c('includeQuote')}</label>${source.question ? `<label><input type="checkbox" name="question"> ${c('includeQuestion')}</label>` : ''}${source.note ? `<label><input type="checkbox" name="note"> ${c('includeNote')}</label>` : ''}<p data-share-privacy role="status"></p><div class="share-image-actions"><button type="button" class="primary-button" data-send-image hidden disabled>${c('sendImage')}</button><a class="primary-button" data-save-image download="guanxiang-card.png" aria-disabled="true">${c('saveImage')}</a></div><p class="share-hint">${c('imageHint')}</p><button type="button" class="secondary-button" data-copy-public>${c('copyLink')}</button><p class="share-hint">${c('linkHint')}</p><a data-public-link target="_blank" rel="noopener"></a><p data-share-status role="status"></p></div><figure class="share-preview"><img data-share-preview alt="${attributeHtml(copy('preview', language))}"></figure></div>`;
    dialog.querySelector('[data-share-close]').onclick = close;
    dialog.querySelectorAll('input').forEach(input => input.addEventListener('change', refresh));
    dialog.querySelector('[data-copy-public]').onclick = async () => {
      const status = dialog.querySelector('[data-share-status]');
      try { await navigator.clipboard.writeText(activeModel.url); status.textContent = copy('copied', language); }
      catch { status.textContent = copy('copyFailed', language); }
    };
    dialog.querySelector('[data-send-image]').onclick = async () => {
      if (!file) return;
      const status = dialog.querySelector('[data-share-status]');
      // File is prepared before the click so Safari's user activation is preserved.
      try { await navigator.share({ files: [file], title: '观象 · Guanxiang' }); }
      catch (error) { if (error.name !== 'AbortError') status.textContent = copy('shareFailed', language); }
    };
    dialog.showModal(); refresh();
  });
}
