import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

// Set PLAYWRIGHT_MODULE to an existing playwright/index.mjs if it is not local.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const baseUrl = process.env.SAATHI_BASE_URL || 'http://127.0.0.1:8787';
const browser = await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
const page = await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto(baseUrl+'/',{waitUntil:'domcontentloaded'});
  await page.locator('.login-page').waitFor();
  await page.getByRole('heading',{name:'Your workday deserves a little support.'}).waitFor();
  const googleButton = page.getByRole('link',{name:'Continue with Google'});
  if (await googleButton.count()) assert.equal(await googleButton.getAttribute('href'),'/api/google/start');
  const username = page.locator('input[name="username"]');
  const password = page.locator('input[name="password"]');
  assert.equal(await username.inputValue(),'demo');
  assert.equal(await password.inputValue(),'saathi-demo-2026');
  assert.equal(await username.getAttribute('autocomplete'),'username');
  assert.equal(await password.getAttribute('autocomplete'),'current-password');
  await page.locator('.auth-tabs').getByRole('button',{name:'Create account'}).click();
  assert.equal(await username.inputValue(),'');
  assert.equal(await password.inputValue(),'');
  await page.locator('.auth-tabs').getByRole('button',{name:'Sign in'}).click();
  assert.equal(await username.inputValue(),'demo');
  assert.equal(await password.inputValue(),'saathi-demo-2026');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const session=await (await page.request.get(baseUrl+'/api/session')).json();
  assert.equal(session.authenticated,false);
  assert.equal(session.signInPath,'/api/auth/login');
  assert.deepEqual(errors,[]);
  console.log('Browser checks passed: demo autofill, password-manager metadata, responsive layout and unauthenticated session.');
} catch(error) {
  console.error('Browser errors:',errors);
  throw error;
} finally { await browser.close(); }
