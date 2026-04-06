const RESULT_DIV = document.getElementById('result');
const NOTIFICATION_TITLE = browser.i18n.getMessage("notificationTitle");
const NOTIFICATION_ICON ="icons/CopyURLs48.png";

window.addEventListener("load", async () => {

  try {
    i18nLoadStrings();
    
    await loadSettings();
    
    const tabs = await getTabs();
    updateDisplay(tabs);
    
    document.getElementById('format_select')?.addEventListener('change', (event) => {
        updateDisplay(tabs);
        saveSettings();
        toggleOptionsVisibility();
    });

    document.querySelectorAll('#use-json-formatting, #use-empty-lines').forEach(input => {
      input.addEventListener('change', () => {
        updateDisplay(tabs);
        saveSettings();
      });
    });     

    document.getElementById('copy-button').addEventListener('click', () => {
      copyToClipboard(formatData(tabs, getSelectedFormat(), useJsonFormatting(), useEmptyLines()));
      showNotification('copyNotification', browser.i18n.getMessage("notificationContent"), true);
    });
    
    toggleOptionsVisibility();
    
  } catch (error) {
    showNotification('errorNotification', browser.i18n.getMessage('error') + error.message, true);
    RESULT_DIV.textContent = browser.i18n.getMessage('error') + error.message;
  }
}, { once: true });

function showNotification(id, msg, clear) {
  browser.notifications.create(id, {
    type: "basic",
    title: NOTIFICATION_TITLE,
    iconUrl: NOTIFICATION_ICON,
    message: msg
  });
  if(clear) {
    let notifyTimeout;
    notifyTimeout = setTimeout(()=> {
      browser.notifications.clear(id);
    }, 3500);
  }
}

function saveSettings() {
  const settings = {
    format: getSelectedFormat(),
    jsonFormatting: useJsonFormatting(),
    emptyLines: useEmptyLines()
  };
  
  chrome.storage.sync.set({ settings });
}

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('settings', (data) => {
      if (data.settings) {
        document.getElementById('format_select').value = data.settings.format;
        if (document.getElementById('use-json-formatting')) {
          document.getElementById('use-json-formatting').checked = data.settings.jsonFormatting;
        }
        if (document.getElementById('use-empty-lines')) {
          document.getElementById('use-empty-lines').checked = data.settings.emptyLines;
        }
        toggleOptionsVisibility();
      }
      resolve();
    });
  });
}

async function getTabs() {
  return await new Promise((resolve) => {
    chrome.tabs.query({}, resolve);
  });
}

function getSelectedFormat() {
  return document.getElementById('format_select').value;
}

function useJsonFormatting() {
  return document.getElementById('use-json-formatting').checked;
}

function useEmptyLines() {
  return document.getElementById('use-empty-lines').checked;
}

function toggleOptionsVisibility() {
  const format = getSelectedFormat();
  const jsonOptions = document.querySelector('.json-options');
  const textOptions = document.querySelector('.text-options');
  const detailsSection = document.querySelector('#details_section');
  const showJsonOptions = format.startsWith('json');
  jsonOptions.style.display = showJsonOptions ? 'block' : 'none';
  const showTextOptions = format.startsWith('text');
  textOptions.style.display = showTextOptions ? 'block' : 'none';
  const hasOptions = showJsonOptions || showTextOptions;
  detailsSection.style.display = hasOptions ? 'block' : 'none';
}

function escapeCSV(str) {
  if (!str) return '';
  return str.replace(/"/g, '""');
}

function escapeTSV(str) {
  if (!str) return '';
  return str.replace(/\t/g, ' ').replace(/\n/g, ' ');
}

function formatData(tabs, format, useJsonFormatting, useEmptyLines) {
  if (format === 'json-object') {
    const data = tabs.map(tab => ({ title: tab.title, url: tab.url }));
    return JSON.stringify(data, useJsonFormatting ? null : undefined, useJsonFormatting ? 2 : undefined);
  } else if (format === 'json-array') {
    const data = tabs.map(tab => [tab.title, tab.url]);
    return JSON.stringify(data, useJsonFormatting ? null : undefined, useJsonFormatting ? 2 : undefined);
  } else if (format === 'json-url-array') {
    const data = tabs.map(tab => tab.url);
    return JSON.stringify(data, useJsonFormatting ? null : undefined, useJsonFormatting ? 2 : undefined);
  } else if (format === 'csv') {
    const rows = tabs.map(tab => `"${escapeCSV(tab.title)}","${escapeCSV(tab.url)}"`).join('\n');
    return rows + '\n';
  } else if (format === 'tsv') {
    const rows = tabs.map(tab => `${escapeTSV(tab.title)}\t${escapeTSV(tab.url)}`).join('\n');
    return rows + '\n';
  } else if (format === 'text-url-only') {
    const separator = useEmptyLines ? '\n\n' : '\n';
    return tabs.map(tab => tab.url).join(separator) + '\n';
  } else {
    const separator = useEmptyLines ? '\n\n' : '\n';
    return tabs.map(tab => `${tab.title}\n${tab.url}`).join(separator) + '\n';
  }
}

function updateDisplay(tabs) {
  const format = getSelectedFormat();
  const jsonFormatting = useJsonFormatting();
  const emptyLines = useEmptyLines();
  const formattedData = formatData(tabs, format, jsonFormatting, emptyLines);
  RESULT_DIV.textContent = formattedData;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error("failed to copy to clipbard: ", err);
    console.warn("trying fallback...");
    // fallback
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

function i18nLoadStrings() {
  
  // console.log('The locale is: ' + browser.i18n.getUILanguage());
  
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if(element.classList == 'optgroup') {
      element.label = browser.i18n.getMessage(key);
    } else {
      element.textContent = browser.i18n.getMessage(key);
    }
  });

}