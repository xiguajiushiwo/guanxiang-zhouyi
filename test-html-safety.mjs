import assert from 'node:assert/strict';
import { attributeHtml, escapeHtml, textHtml } from './html-safety.mjs';

assert.equal(escapeHtml(`<svg onload="x">'&`), '&lt;svg onload=&quot;x&quot;&gt;&#39;&amp;');
assert.equal(textHtml('甲\n乙'), '甲<br>乙');
assert.equal(attributeHtml('" onfocus="x\n'), '&quot; onfocus=&quot;x&#10;');
assert.equal(textHtml(null), '');
console.log('HTML safety tests passed.');
