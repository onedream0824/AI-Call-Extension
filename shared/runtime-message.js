export function sendRuntimeMessage(payload) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(payload, (response) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message || "Extension is unavailable. Reload the extension."));
          return;
        }
        if (!response) {
          reject(new Error("No response from extension. Reload the extension and try again."));
          return;
        }
        if (response.ok === false) {
          reject(new Error(response.error || "Request failed."));
          return;
        }
        resolve(response);
      });
    } catch (e) {
      reject(e);
    }
  });
}
