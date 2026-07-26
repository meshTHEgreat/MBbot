(() => {
  "use strict";

  if (document.body.dataset.page !== "learn") return;

  const languageButtons = [
    ...document.querySelectorAll("[data-language]"),
  ];
  const localizedContent = [
    ...document.querySelectorAll("[data-lang-content]"),
  ];
  const languageStatus = document.getElementById("learn-language-status");
  const symbolSelect = document.getElementById("learn-symbol-select");
  const symbolPanels = [
    ...document.querySelectorAll("[data-symbol-panel]"),
  ];
  const variableSelect = document.getElementById("learn-variable-select");
  const variablePanels = [
    ...document.querySelectorAll("[data-variable-panel]"),
  ];
  const readinessChecks = [
    ...document.querySelectorAll("[data-readiness-check]"),
  ];
  const readinessCount = document.getElementById("readiness-count");
  const readinessMessage = document.getElementById("readiness-message");

  function storageRead(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function storageWrite(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // The guide remains fully usable when browser storage is unavailable.
    }
  }

  function currentLanguage() {
    return document.documentElement.lang === "ar" ? "ar" : "en";
  }

  function updateReadiness() {
    const completed = readinessChecks.filter((input) => input.checked).length;
    const ready = completed === readinessChecks.length;
    readinessCount.textContent = `${completed} / ${readinessChecks.length}`;
    readinessCount.closest(".readiness-status")?.toggleAttribute(
      "data-ready",
      ready,
    );
    readinessMessage.textContent =
      currentLanguage() === "ar"
        ? ready
          ? "اكتملت مراجعة الجاهزية. دوّن اسم التجربة وانتقل إلى إعدادات الاختبار."
          : `اكتمل ${completed} من ${readinessChecks.length}. راجع البنود المتبقية قبل تفسير النتيجة.`
        : ready
          ? "Readiness review complete. Name the experiment, then open the controls."
          : `${completed} of ${readinessChecks.length} complete. Review the remaining items before interpreting a result.`;
  }

  function setLanguage(language, announce = true) {
    const next = language === "ar" ? "ar" : "en";
    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    localizedContent.forEach((node) => {
      node.hidden = node.dataset.langContent !== next;
    });
    languageButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.language === next),
      );
    });
    storageWrite("mbbot-learn-language", next);
    updateReadiness();
    if (announce && languageStatus) {
      languageStatus.textContent =
        next === "ar"
          ? "تم تحويل دليل الاستراتيجية إلى العربية المالية."
          : "The strategy guide is now in English.";
    }
  }

  function showPanel(select, panels, attribute) {
    if (!select) return;
    panels.forEach((panel) => {
      panel.hidden = panel.dataset[attribute] !== select.value;
    });
  }

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(button.dataset.language);
    });
  });
  symbolSelect?.addEventListener("change", () => {
    showPanel(symbolSelect, symbolPanels, "symbolPanel");
  });
  variableSelect?.addEventListener("change", () => {
    showPanel(variableSelect, variablePanels, "variablePanel");
  });
  readinessChecks.forEach((input) => {
    input.addEventListener("change", updateReadiness);
  });

  showPanel(symbolSelect, symbolPanels, "symbolPanel");
  showPanel(variableSelect, variablePanels, "variablePanel");
  setLanguage(storageRead("mbbot-learn-language") || "en", false);
})();
