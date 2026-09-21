import { AccountApiError, createAccountClient } from './account-sync.mjs';
import { getLanguage, setLanguage, t, translateDom } from './i18n.mjs?v=20260921-auth2';

const $=selector=>document.querySelector(selector);
const APP_ENTRY='./?entry=account#home';
const ACCOUNT_MODE_KEY='guanxiang-account-mode-v1';
let mode='login',user=null,busy=false,client=null;

function language(){const value=getLanguage();return value==='fa'?'fa':value==='en'?'en':'zh-CN'}
function createClient(){client=createAccountClient({language:language()});return client}
function accountMode(){try{return localStorage.getItem(ACCOUNT_MODE_KEY)||''}catch{return ''}}
function setAccountMode(value){try{localStorage.setItem(ACCOUNT_MODE_KEY,value)}catch{}}
function accountError(error){
  if(error instanceof AccountApiError){
    if(error.code==='NETWORK_ERROR'||error.status===503)return t('auth.network');
    if([400,401,409].includes(error.status)||['INVALID_CREDENTIALS','ACCOUNT_EXISTS'].includes(error.code))return t('auth.invalid');
    return error.message||t('auth.network');
  }
  return t('auth.network');
}
function enterApp(){setAccountMode('account');location.assign(APP_ENTRY)}
function renderLanguage(){
  $('[data-language-label]').textContent=t('language.label');
  document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-checked',String(button.dataset.language===language())));
}
function render(){
  document.title=t('auth.browserTitle');
  translateDom(document);
  renderLanguage();
  const signed=Boolean(user);
  $('[data-signed-view]').classList.toggle('hidden',!signed);
  $('[data-auth-view]').classList.toggle('hidden',signed);
  if(signed)$('[data-account-id]').textContent=user.email;
  document.querySelectorAll('[data-auth-mode]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.authMode===mode)));
  const password=$('#authForm').elements.password;
  password.autocomplete=mode==='register'?'new-password':'current-password';
  $('[data-auth-submit]').textContent=t(mode==='register'?'auth.submitRegister':'auth.submitLogin');
  $('#authError').textContent='';
}
function setBusy(value){
  busy=value;
  $('#authForm').toggleAttribute('aria-busy',value);
  document.querySelectorAll('button').forEach(button=>{if(button.closest('[data-auth-language]'))return;button.disabled=value});
}
async function submit(event){
  event.preventDefault();
  if(busy)return;
  const form=event.currentTarget,email=String(form.elements.email.value||'').trim(),password=String(form.elements.password.value||'');
  $('#authError').textContent='';
  setBusy(true);
  try{
    const result=mode==='register'?await createClient().register(email,password):await createClient().login(email,password);
    user=result.user||null;
    setAccountMode('account');
    enterApp();
  }catch(error){$('#authError').textContent=accountError(error);setBusy(false)}
}
async function enterAsGuest(){
  if(busy)return;
  setBusy(true);
  setAccountMode('guest');
  try{await createClient().logout()}catch(error){if(!(error instanceof AccountApiError))console.warn('Guest session cleanup failed',error)}
  location.assign(APP_ENTRY);
}
async function logout(){
  if(busy)return;
  setBusy(true);
  try{await createClient().logout()}catch(error){console.warn('Account logout failed',error)}
  user=null;
  setAccountMode('guest');
  mode='login';
  setBusy(false);
  render();
}
async function restoreSession(){
  if(accountMode()==='guest'){user=null;render();return}
  try{const result=await createClient().me();user=result.user||null}
  catch(error){if(!(error instanceof AccountApiError&&[401,403].includes(error.status)))$('#authError').textContent=accountError(error)}
  render();
}
function toggleLanguageMenu(force){
  const root=$('[data-auth-language]'),options=root.querySelector('.auth-language-options'),trigger=root.querySelector('.auth-language-trigger');
  const open=force??options.hidden;
  options.hidden=!open;
  trigger.setAttribute('aria-expanded',String(open));
}

document.addEventListener('DOMContentLoaded',()=>{
  setLanguage(getLanguage());
  render();
  $('#authForm').addEventListener('submit',submit);
  document.querySelectorAll('[data-auth-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.authMode;render();$('#authForm').elements.email.focus()}));
  $('[data-guest]').addEventListener('click',enterAsGuest);
  $('[data-continue]').addEventListener('click',enterApp);
  $('[data-logout]').addEventListener('click',logout);
  $('.auth-language-trigger').addEventListener('click',event=>{event.stopPropagation();toggleLanguageMenu()});
  document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();setLanguage(button.dataset.language);createClient();render();toggleLanguageMenu(false)}));
  document.addEventListener('click',event=>{if(!event.target.closest('[data-auth-language]'))toggleLanguageMenu(false)});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')toggleLanguageMenu(false)});
  restoreSession();
});
