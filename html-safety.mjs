const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ENTITIES[char]);
export const textHtml = value => escapeHtml(value).replace(/\r?\n/g, '<br>');
export const attributeHtml = value => escapeHtml(value).replace(/\r?\n/g, '&#10;');
