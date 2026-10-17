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
  assert.equal(await page.getByRole('link',{name:'Sign in with Google'}).getAttribute('href'),'/api/google/start');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const session=await (await page.request.get(baseUrl+'/api/session')).json();
  assert.equal(session.authenticated,false);
  assert.equal(session.signInPath,'/api/google/start');
  const oauth=await page.request.get(baseUrl+'/api/google/start',{maxRedirects:0});
  assert.equal(oauth.status(),302);
  assert.match(oauth.headers().location||'',/accounts\.google\.com/);
  assert.deepEqual(errors,[]);
  console.log('Browser checks passed: login landing page, responsive layout, unauthenticated session and Google OAuth redirect.');
} catch(error) {
  console.error('Browser errors:',errors);
  throw error;
} finally { await browser.close(); }
