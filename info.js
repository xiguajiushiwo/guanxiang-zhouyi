import { INFO_PAGES, getInfoPage } from './info-content.mjs';
import { getLanguage, languageLabel, setLanguage, t, translateDom } from './i18n.mjs';

const $=selector=>document.querySelector(selector);
const page=getInfoPage(document.body.dataset.infoPage);

function renderInfoPage(){
  const language=getLanguage();
  document.documentElement.lang=language;
  document.documentElement.dir=language==='fa'?'rtl':'ltr';
  document.title=t(`info.${page.key}.browserTitle`);
  $('[data-info-title]').textContent=t(`info.${page.key}.title`);
  $('[data-info-description]').textContent=t(`info.${page.key}.description`);
  $('[data-language-label]').textContent=languageLabel(language);
  translateDom(document);
  document.querySelectorAll('[data-info-key]').forEach(link=>{
    link.querySelector('[data-info-key-title]').textContent=t(`info.${link.dataset.infoKey}.title`);
    link.toggleAttribute('aria-current',link.dataset.infoKey===page.key);
  });
  document.querySelectorAll('[data-social-name]').forEach(label=>{label.textContent=t(`info.${label.dataset.socialName}`)});
  document.querySelectorAll('[data-social-unavailable] small').forEach(label=>{label.textContent=t('info.unavailable')});
  document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-checked',String(button.dataset.language===language)));
}

function toggleLanguageMenu(force){
  const options=$('.info-language-options'),trigger=$('[data-info-language-trigger]');
  const open=force??options.hidden;
  options.hidden=!open;
  trigger.setAttribute('aria-expanded',String(open));
}

$('[data-info-language-trigger]').addEventListener('click',event=>{event.stopPropagation();toggleLanguageMenu()});
document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',event=>{
  event.stopPropagation();
  setLanguage(button.dataset.language);
  renderInfoPage();
  toggleLanguageMenu(false);
}));
document.addEventListener('click',event=>{if(!event.target.closest('[data-info-language]'))toggleLanguageMenu(false)});
document.addEventListener('keydown',event=>{if(event.key==='Escape')toggleLanguageMenu(false)});

if(INFO_PAGES.some(item=>item.key===page.key))renderInfoPage();
