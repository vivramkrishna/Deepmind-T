// Keep this URL aligned with PORT in the app's .env.
const APP_URL = 'http://localhost:3000/';
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => chrome.contextMenus.create({ id: 'ask-math', title: 'Ask Voice Math: %s', contexts: ['selection'] }));
});
chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: APP_URL }));
chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId !== 'ask-math') return;
  const url = new URL(APP_URL); url.searchParams.set('question', (info.selectionText || '').slice(0, 250));
  chrome.tabs.create({ url: url.toString() });
});
