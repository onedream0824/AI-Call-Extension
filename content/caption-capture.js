(function () {
  if (window.__AI_CALL_CAPTION_LOADED__) return;
  window.__AI_CALL_CAPTION_LOADED__ = true;

  const MESSAGE_CAPTURE = "CAPTURE_CAPTION";

  const PLATFORM_SELECTORS = [
    // Google Meet
    ".a4cQT",
    ".iOzk7",
    ".nMcdL.bj4p3b",
    '[jsname="tgaKEf"]',
    '[data-message-text]',
    // Microsoft Teams
    '[data-tid="closed-caption-renderer"]',
    ".ts-caption-container",
    ".vjs-text-track-display",
    ".cue-region",
    // Zoom
    ".live-transcription-subtitle__content",
    ".subtitle-box",
    ".live-transcription-subtitle",
    // Webex
    ".webex-caption-text",
    // Generic
    '[aria-live="polite"]',
    '[aria-live="assertive"]',
    ".caption",
    ".captions",
    ".live-caption",
    ".live-captions",
    ".subtitle",
    ".subtitles"
  ];

  let cachedCaption = "";
  let observer = null;

  function getCustomSelector() {
    return window.__AI_CALL_CUSTOM_SELECTOR__ || "";
  }

  function collectFromSelector(selector) {
    if (!selector) return "";
    const nodes = document.querySelectorAll(selector);
    const parts = [];
    nodes.forEach((el) => {
      const text = (el.innerText || el.textContent || "").trim();
      if (text) parts.push(text);
    });
    return parts.join("\n").trim();
  }

  function collectFromPlatforms() {
    const custom = getCustomSelector();
    if (custom) {
      const customText = collectFromSelector(custom);
      if (customText) return customText;
    }

    for (const selector of PLATFORM_SELECTORS) {
      try {
        const text = collectFromSelector(selector);
        if (text) return text;
      } catch {
        // invalid selector in strict mode
      }
    }

    return collectFromLiveRegions();
  }

  function collectFromLiveRegions() {
    const regions = document.querySelectorAll('[aria-live="polite"], [aria-live="assertive"]');
    let best = "";
    regions.forEach((el) => {
      const text = (el.innerText || el.textContent || "").trim();
      if (text.length > best.length) best = text;
    });
    return best;
  }

  function updateCache() {
    const text = collectFromPlatforms();
    if (text && text !== cachedCaption) {
      cachedCaption = text;
    }
  }

  function startObserver() {
    if (observer) return;
    updateCache();
    observer = new MutationObserver(() => {
      updateCache();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== MESSAGE_CAPTURE) return;

    updateCache();
    const fresh = collectFromPlatforms();
    const caption = (fresh || cachedCaption || "").trim();

    sendResponse({ caption });
    return false;
  });

  chrome.storage?.sync?.get?.(["customSelector"], (data) => {
    if (data?.customSelector) {
      window.__AI_CALL_CUSTOM_SELECTOR__ = data.customSelector;
    }
  });

  chrome.storage?.onChanged?.addListener?.((changes, area) => {
    if (area === "sync" && changes.customSelector) {
      window.__AI_CALL_CUSTOM_SELECTOR__ = changes.customSelector.newValue || "";
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver);
  } else {
    startObserver();
  }
})();
