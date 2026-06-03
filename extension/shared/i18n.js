(function initI18n(scope) {
  const UI_LOCALES = Object.freeze(["zh-CN", "en", "zh-TW", "zh-HK"]);
  const UI_LANGUAGE_VALUES = Object.freeze(["auto", ...UI_LOCALES]);
  const DEFAULT_UI_LANGUAGE = "auto";

  const ERROR_CODES = Object.freeze({
    TRANSLATION_CANCELLED: "translation_cancelled",
    SETTINGS_READ_FAILED: "settings_read_failed",
    TRANSLATION_REQUEST_FAILED: "translation_request_failed",
    UNSUPPORTED_TARGET_LANGUAGE: "unsupported_target_language",
    EMPTY_TRANSLATABLE_TEXT: "empty_translatable_text",
    GOOGLE_API_KEY_MISSING: "google_api_key_missing",
    MICROSOFT_API_KEY_MISSING: "microsoft_api_key_missing",
    MICROSOFT_REGION_MISSING: "microsoft_region_missing",
    GOOGLE_WEB_UNAVAILABLE: "google_web_unavailable",
    GOOGLE_API_UNAVAILABLE: "google_api_unavailable",
    MICROSOFT_UNAVAILABLE: "microsoft_unavailable",
    UPSTREAM_FAILED: "upstream_failed"
  });

  const ERROR_MESSAGE_KEYS = Object.freeze({
    [ERROR_CODES.TRANSLATION_CANCELLED]: "error.translationCancelled",
    [ERROR_CODES.SETTINGS_READ_FAILED]: "error.settingsReadFailed",
    [ERROR_CODES.TRANSLATION_REQUEST_FAILED]: "error.translationRequestFailed",
    [ERROR_CODES.UNSUPPORTED_TARGET_LANGUAGE]: "error.unsupportedTargetLanguage",
    [ERROR_CODES.EMPTY_TRANSLATABLE_TEXT]: "error.emptyTranslatableText",
    [ERROR_CODES.GOOGLE_API_KEY_MISSING]: "error.googleApiKeyMissing",
    [ERROR_CODES.MICROSOFT_API_KEY_MISSING]: "error.microsoftApiKeyMissing",
    [ERROR_CODES.MICROSOFT_REGION_MISSING]: "error.microsoftRegionMissing",
    [ERROR_CODES.GOOGLE_WEB_UNAVAILABLE]: "error.googleWebUnavailable",
    [ERROR_CODES.GOOGLE_API_UNAVAILABLE]: "error.googleApiUnavailable",
    [ERROR_CODES.MICROSOFT_UNAVAILABLE]: "error.microsoftUnavailable",
    [ERROR_CODES.UPSTREAM_FAILED]: "error.upstreamFailed"
  });

  const MESSAGE_CATALOG = Object.freeze({
    "zh-CN": Object.freeze({
      "shared.appName": "FastTrMail",
      "shared.iconAlt": "扩展图标",
      "popup.documentTitle": "FastTrMail",
      "popup.subtitle": "Fastmail 网页版邮件翻译助手",
      "popup.currentProvider": "当前 Provider",
      "popup.currentTargetLanguage": "当前目标语言",
      "popup.currentStatus": "当前状态",
      "popup.providerStatusConfigured": "已配置",
      "popup.providerStatusSetupRequired": "需要配置",
      "popup.providerStatusExperimental": "实验模式",
      "popup.openSettings": "打开设置",
      "popup.tip": "进入邮件详情页后，点击邮件右上操作区里的“翻译”按钮即可。",
      "popup.loadFailed": "读取失败",
      "options.documentTitle": "FastTrMail 设置",
      "options.heroIntro": "给 Fastmail 网页版邮件正文加一个内嵌翻译按钮。点击邮箱工具区里的“翻译”后，译文会追加在原文下方，不覆盖原文。",
      "options.generalSettingsTitle": "总设置",
      "options.generalSettingsDescription": "这里决定扩展默认使用哪个翻译服务，以及翻译成哪种目标语言。",
      "options.providerBehaviorNote": "推荐优先使用正式 API。Google Web 仅作为免 Key 的实验性兜底方案。你填写的 API 凭据只会保存在当前浏览器会话中。",
      "options.uiLanguage": "界面语言",
      "options.translationProvider": "翻译服务 Provider",
      "options.googlePanelTitle": "Google Cloud API 配置",
      "options.googlePanelDescription": "如果总设置里选择了 Google Cloud API，这里的 API Key 就会被用于翻译请求。",
      "options.googleApiKey": "Google Cloud Translation API Key",
      "options.googleApiKeyPlaceholder": "填入你的 Google Cloud API Key",
      "options.googleDocs": "官方开通说明",
      "options.googleKeys": "官方 API Key 管理",
      "options.googleConsole": "打开 Google API 控制台",
      "options.microsoftPanelTitle": "Microsoft API 配置",
      "options.microsoftPanelDescription": "如果总设置里选择了 Microsoft Translator API，这里的 Key 和 Region 会用于翻译请求。",
      "options.microsoftApiKey": "Microsoft Translator API Key",
      "options.microsoftApiKeyPlaceholder": "填入你的 Microsoft Translator API Key",
      "options.microsoftRegion": "Microsoft Translator Region",
      "options.microsoftRegionPlaceholder": "例如 eastasia 或 global",
      "options.microsoftDocs": "官方申请与快速开始",
      "options.microsoftPortal": "打开 Azure Portal",
      "options.targetLanguage": "目标语言 Target language",
      "options.save": "保存设置",
      "options.saved": "设置已保存。",
      "options.saveFailed": "设置保存失败。",
      "options.loadFailed": "设置页初始化失败。",
      "uiLanguage.auto": "跟随浏览器（默认）",
      "uiLanguage.zh-CN": "简体中文",
      "uiLanguage.en": "English",
      "uiLanguage.zh-TW": "繁體中文（台灣）",
      "uiLanguage.zh-HK": "繁體中文（香港）",
      "provider.google-web": "Google Web（免 Key，实验性）",
      "provider.google-api": "Google Cloud API",
      "provider.microsoft": "Microsoft Translator API",
      "targetLanguage.zh-CN": "简体中文",
      "targetLanguage.zh-TW": "繁體中文（台灣）",
      "targetLanguage.en": "English",
      "targetLanguage.ja": "日本語",
      "targetLanguage.ko": "한국어",
      "targetLanguage.fr": "Français",
      "targetLanguage.de": "Deutsch",
      "targetLanguage.es": "Español",
      "targetLanguage.it": "Italiano",
      "targetLanguage.pt": "Português",
      "targetLanguage.ru": "Русский",
      "content.translate": "翻译",
      "content.restoreOriginal": "恢复原文",
      "content.loading": "翻译中…",
      "content.pendingBody": "页面正在更新，翻译结果将自动重试。",
      "content.renderRetryStopped": "页面结构持续变化，已停止自动重试。请稍后手动重试。",
      "content.noSegments": "未找到可翻译内容。",
      "content.bodyNotFound": "无法定位邮件正文。",
      "content.titleTranslationEmpty": "标题翻译结果为空。",
      "content.titleTranslationFailed": "标题翻译失败。",
      "content.segmentCountMismatch": "分段翻译结果数量不匹配。",
      "error.translationCancelled": "翻译请求已取消。",
      "error.settingsReadFailed": "读取设置失败。",
      "error.translationRequestFailed": "翻译请求失败。",
      "error.unsupportedTargetLanguage": "不支持当前目标语言。",
      "error.emptyTranslatableText": "没有找到可翻译的邮件正文。",
      "error.googleApiKeyMissing": "Google Cloud API Key 未配置，请先到设置页填写。",
      "error.microsoftApiKeyMissing": "Microsoft Translator API Key 未配置，请先到设置页填写。",
      "error.microsoftRegionMissing": "Microsoft Translator Region 未配置，请先到设置页填写。",
      "error.googleWebUnavailable": "Google Web 翻译请求失败，请稍后重试或切换到正式 API。",
      "error.googleApiUnavailable": "Google Cloud 翻译请求失败。",
      "error.microsoftUnavailable": "Microsoft 翻译请求失败。",
      "error.upstreamFailed": "翻译服务暂时不可用，请稍后重试。"
    }),
    en: Object.freeze({
      "shared.appName": "FastTrMail",
      "shared.iconAlt": "Extension icon",
      "popup.documentTitle": "FastTrMail",
      "popup.subtitle": "Fastmail Web message translation helper",
      "popup.currentProvider": "Current Provider",
      "popup.currentTargetLanguage": "Current target language",
      "popup.currentStatus": "Current status",
      "popup.providerStatusConfigured": "Configured",
      "popup.providerStatusSetupRequired": "Setup required",
      "popup.providerStatusExperimental": "Experimental mode",
      "popup.openSettings": "Open Settings",
      "popup.tip": "Open an email detail view, then click the Translate button in the message action area.",
      "popup.loadFailed": "Failed to load",
      "options.documentTitle": "FastTrMail Settings",
      "options.heroIntro": "Adds an inline translate button to Fastmail Web message bodies. After you click Translate in the message toolbar, the translated text is appended below the original without replacing it.",
      "options.generalSettingsTitle": "General Settings",
      "options.generalSettingsDescription": "Choose the default translation provider and the target language used by the extension.",
      "options.providerBehaviorNote": "Official APIs are recommended. Google Web is kept only as a no-key experimental fallback. API credentials are stored only for the current browser session.",
      "options.uiLanguage": "Interface language",
      "options.translationProvider": "Translation provider",
      "options.googlePanelTitle": "Google Cloud API Settings",
      "options.googlePanelDescription": "If Google Cloud API is selected in General Settings, this API key will be used for translation requests.",
      "options.googleApiKey": "Google Cloud Translation API Key",
      "options.googleApiKeyPlaceholder": "Enter your Google Cloud API Key",
      "options.googleDocs": "Setup Guide",
      "options.googleKeys": "API Key Management",
      "options.googleConsole": "Open Google API Console",
      "options.microsoftPanelTitle": "Microsoft API Settings",
      "options.microsoftPanelDescription": "If Microsoft Translator API is selected in General Settings, this key and region will be used for translation requests.",
      "options.microsoftApiKey": "Microsoft Translator API Key",
      "options.microsoftApiKeyPlaceholder": "Enter your Microsoft Translator API Key",
      "options.microsoftRegion": "Microsoft Translator Region",
      "options.microsoftRegionPlaceholder": "For example: eastasia or global",
      "options.microsoftDocs": "Quickstart Guide",
      "options.microsoftPortal": "Open Azure Portal",
      "options.targetLanguage": "Target language",
      "options.save": "Save Settings",
      "options.saved": "Settings saved.",
      "options.saveFailed": "Failed to save settings.",
      "options.loadFailed": "Failed to initialize the settings page.",
      "uiLanguage.auto": "Follow browser (default)",
      "uiLanguage.zh-CN": "Simplified Chinese",
      "uiLanguage.en": "English",
      "uiLanguage.zh-TW": "Traditional Chinese (Taiwan)",
      "uiLanguage.zh-HK": "Traditional Chinese (Hong Kong)",
      "provider.google-web": "Google Web (No Key, Experimental)",
      "provider.google-api": "Google Cloud API",
      "provider.microsoft": "Microsoft Translator API",
      "targetLanguage.zh-CN": "Simplified Chinese",
      "targetLanguage.zh-TW": "Traditional Chinese (Taiwan)",
      "targetLanguage.en": "English",
      "targetLanguage.ja": "Japanese",
      "targetLanguage.ko": "Korean",
      "targetLanguage.fr": "French",
      "targetLanguage.de": "German",
      "targetLanguage.es": "Spanish",
      "targetLanguage.it": "Italian",
      "targetLanguage.pt": "Portuguese",
      "targetLanguage.ru": "Russian",
      "content.translate": "Translate",
      "content.restoreOriginal": "Restore Original",
      "content.loading": "Translating…",
      "content.pendingBody": "The page is updating. The translation will retry automatically.",
      "content.renderRetryStopped": "The page structure keeps changing. Automatic retry has stopped. Please try again later.",
      "content.noSegments": "No translatable content was found.",
      "content.bodyNotFound": "Unable to locate the message body.",
      "content.titleTranslationEmpty": "The translated subject is empty.",
      "content.titleTranslationFailed": "Subject translation failed.",
      "content.segmentCountMismatch": "The translated segment count does not match the source content.",
      "error.translationCancelled": "Translation request was cancelled.",
      "error.settingsReadFailed": "Failed to read settings.",
      "error.translationRequestFailed": "Translation request failed.",
      "error.unsupportedTargetLanguage": "The selected target language is not supported.",
      "error.emptyTranslatableText": "No translatable email body was found.",
      "error.googleApiKeyMissing": "Google Cloud API Key is not configured. Please add it in Settings first.",
      "error.microsoftApiKeyMissing": "Microsoft Translator API Key is not configured. Please add it in Settings first.",
      "error.microsoftRegionMissing": "Microsoft Translator Region is not configured. Please add it in Settings first.",
      "error.googleWebUnavailable": "Google Web translation failed. Please try again later or switch to the official API.",
      "error.googleApiUnavailable": "Google Cloud translation failed.",
      "error.microsoftUnavailable": "Microsoft translation failed.",
      "error.upstreamFailed": "The translation service is temporarily unavailable. Please try again later."
    }),
    "zh-TW": Object.freeze({
      "shared.appName": "FastTrMail",
      "shared.iconAlt": "擴充功能圖示",
      "popup.documentTitle": "FastTrMail",
      "popup.subtitle": "Fastmail 網頁版郵件翻譯助手",
      "popup.currentProvider": "目前 Provider",
      "popup.currentTargetLanguage": "目前目標語言",
      "popup.currentStatus": "目前狀態",
      "popup.providerStatusConfigured": "已設定",
      "popup.providerStatusSetupRequired": "需要設定",
      "popup.providerStatusExperimental": "實驗模式",
      "popup.openSettings": "打開設定",
      "popup.tip": "進入郵件詳情頁後，點擊郵件右上操作區裡的「翻譯」按鈕即可。",
      "popup.loadFailed": "讀取失敗",
      "options.documentTitle": "FastTrMail 設定",
      "options.heroIntro": "為 Fastmail 網頁版郵件正文加入一個內嵌翻譯按鈕。點擊郵件工具區裡的「翻譯」後，譯文會追加在原文下方，不覆蓋原文。",
      "options.generalSettingsTitle": "一般設定",
      "options.generalSettingsDescription": "這裡決定擴充功能預設使用哪個翻譯服務，以及翻譯成哪種目標語言。",
      "options.providerBehaviorNote": "建議優先使用正式 API。Google Web 只作為免 Key 的實驗性備援方案。你填寫的 API 憑據只會保存在目前瀏覽器工作階段中。",
      "options.uiLanguage": "介面語言",
      "options.translationProvider": "翻譯服務 Provider",
      "options.googlePanelTitle": "Google Cloud API 設定",
      "options.googlePanelDescription": "如果一般設定裡選擇了 Google Cloud API，這裡的 API Key 就會用於翻譯請求。",
      "options.googleApiKey": "Google Cloud Translation API Key",
      "options.googleApiKeyPlaceholder": "填入你的 Google Cloud API Key",
      "options.googleDocs": "官方開通說明",
      "options.googleKeys": "官方 API Key 管理",
      "options.googleConsole": "打開 Google API 控制台",
      "options.microsoftPanelTitle": "Microsoft API 設定",
      "options.microsoftPanelDescription": "如果一般設定裡選擇了 Microsoft Translator API，這裡的 Key 和 Region 會用於翻譯請求。",
      "options.microsoftApiKey": "Microsoft Translator API Key",
      "options.microsoftApiKeyPlaceholder": "填入你的 Microsoft Translator API Key",
      "options.microsoftRegion": "Microsoft Translator Region",
      "options.microsoftRegionPlaceholder": "例如 eastasia 或 global",
      "options.microsoftDocs": "官方申請與快速開始",
      "options.microsoftPortal": "打開 Azure Portal",
      "options.targetLanguage": "目標語言 Target language",
      "options.save": "儲存設定",
      "options.saved": "設定已儲存。",
      "options.saveFailed": "設定儲存失敗。",
      "options.loadFailed": "設定頁初始化失敗。",
      "uiLanguage.auto": "跟隨瀏覽器（預設）",
      "uiLanguage.zh-CN": "簡體中文",
      "uiLanguage.en": "English",
      "uiLanguage.zh-TW": "繁體中文（台灣）",
      "uiLanguage.zh-HK": "繁體中文（香港）",
      "provider.google-web": "Google Web（免 Key，實驗性）",
      "provider.google-api": "Google Cloud API",
      "provider.microsoft": "Microsoft Translator API",
      "targetLanguage.zh-CN": "簡體中文",
      "targetLanguage.zh-TW": "繁體中文（台灣）",
      "targetLanguage.en": "英文",
      "targetLanguage.ja": "日文",
      "targetLanguage.ko": "韓文",
      "targetLanguage.fr": "法文",
      "targetLanguage.de": "德文",
      "targetLanguage.es": "西班牙文",
      "targetLanguage.it": "義大利文",
      "targetLanguage.pt": "葡萄牙文",
      "targetLanguage.ru": "俄文",
      "content.translate": "翻譯",
      "content.restoreOriginal": "恢復原文",
      "content.loading": "翻譯中…",
      "content.pendingBody": "頁面正在更新，翻譯結果將自動重試。",
      "content.renderRetryStopped": "頁面結構持續變化，已停止自動重試。請稍後手動重試。",
      "content.noSegments": "未找到可翻譯內容。",
      "content.bodyNotFound": "無法定位郵件正文。",
      "content.titleTranslationEmpty": "標題翻譯結果為空。",
      "content.titleTranslationFailed": "標題翻譯失敗。",
      "content.segmentCountMismatch": "分段翻譯結果數量不匹配。",
      "error.translationCancelled": "翻譯請求已取消。",
      "error.settingsReadFailed": "讀取設定失敗。",
      "error.translationRequestFailed": "翻譯請求失敗。",
      "error.unsupportedTargetLanguage": "不支援目前目標語言。",
      "error.emptyTranslatableText": "沒有找到可翻譯的郵件正文。",
      "error.googleApiKeyMissing": "Google Cloud API Key 尚未設定，請先到設定頁填寫。",
      "error.microsoftApiKeyMissing": "Microsoft Translator API Key 尚未設定，請先到設定頁填寫。",
      "error.microsoftRegionMissing": "Microsoft Translator Region 尚未設定，請先到設定頁填寫。",
      "error.googleWebUnavailable": "Google Web 翻譯請求失敗，請稍後再試或切換到正式 API。",
      "error.googleApiUnavailable": "Google Cloud 翻譯請求失敗。",
      "error.microsoftUnavailable": "Microsoft 翻譯請求失敗。",
      "error.upstreamFailed": "翻譯服務暫時不可用，請稍後再試。"
    }),
    "zh-HK": Object.freeze({
      "shared.appName": "FastTrMail",
      "shared.iconAlt": "擴充功能圖示",
      "popup.documentTitle": "FastTrMail",
      "popup.subtitle": "Fastmail 網頁版郵件翻譯助手",
      "popup.currentProvider": "目前 Provider",
      "popup.currentTargetLanguage": "目前目標語言",
      "popup.currentStatus": "目前狀態",
      "popup.providerStatusConfigured": "已設定",
      "popup.providerStatusSetupRequired": "需要設定",
      "popup.providerStatusExperimental": "實驗模式",
      "popup.openSettings": "打開設定",
      "popup.tip": "進入郵件詳情頁後，點擊郵件右上操作區內的「翻譯」按鈕即可。",
      "popup.loadFailed": "讀取失敗",
      "options.documentTitle": "FastTrMail 設定",
      "options.heroIntro": "為 Fastmail 網頁版郵件正文加入一個內嵌翻譯按鈕。點擊郵件工具區內的「翻譯」後，譯文會附加在原文下方，不會覆蓋原文。",
      "options.generalSettingsTitle": "一般設定",
      "options.generalSettingsDescription": "這裡決定擴充功能預設使用哪個翻譯服務，以及翻譯成哪種目標語言。",
      "options.providerBehaviorNote": "建議優先使用正式 API。Google Web 只作為免 Key 的實驗性備援方案。你填寫的 API 憑據只會保存在目前瀏覽器工作階段中。",
      "options.uiLanguage": "介面語言",
      "options.translationProvider": "翻譯服務 Provider",
      "options.googlePanelTitle": "Google Cloud API 設定",
      "options.googlePanelDescription": "如果一般設定內選擇了 Google Cloud API，這裡的 API Key 會用於翻譯請求。",
      "options.googleApiKey": "Google Cloud Translation API Key",
      "options.googleApiKeyPlaceholder": "輸入你的 Google Cloud API Key",
      "options.googleDocs": "官方開通說明",
      "options.googleKeys": "官方 API Key 管理",
      "options.googleConsole": "打開 Google API 控制台",
      "options.microsoftPanelTitle": "Microsoft API 設定",
      "options.microsoftPanelDescription": "如果一般設定內選擇了 Microsoft Translator API，這裡的 Key 和 Region 會用於翻譯請求。",
      "options.microsoftApiKey": "Microsoft Translator API Key",
      "options.microsoftApiKeyPlaceholder": "輸入你的 Microsoft Translator API Key",
      "options.microsoftRegion": "Microsoft Translator Region",
      "options.microsoftRegionPlaceholder": "例如 eastasia 或 global",
      "options.microsoftDocs": "官方申請與快速開始",
      "options.microsoftPortal": "打開 Azure Portal",
      "options.targetLanguage": "目標語言 Target language",
      "options.save": "儲存設定",
      "options.saved": "設定已儲存。",
      "options.saveFailed": "設定儲存失敗。",
      "options.loadFailed": "設定頁初始化失敗。",
      "uiLanguage.auto": "跟隨瀏覽器（預設）",
      "uiLanguage.zh-CN": "簡體中文",
      "uiLanguage.en": "English",
      "uiLanguage.zh-TW": "繁體中文（台灣）",
      "uiLanguage.zh-HK": "繁體中文（香港）",
      "provider.google-web": "Google Web（免 Key，實驗性）",
      "provider.google-api": "Google Cloud API",
      "provider.microsoft": "Microsoft Translator API",
      "targetLanguage.zh-CN": "簡體中文",
      "targetLanguage.zh-TW": "繁體中文（台灣）",
      "targetLanguage.en": "英文",
      "targetLanguage.ja": "日文",
      "targetLanguage.ko": "韓文",
      "targetLanguage.fr": "法文",
      "targetLanguage.de": "德文",
      "targetLanguage.es": "西班牙文",
      "targetLanguage.it": "意大利文",
      "targetLanguage.pt": "葡萄牙文",
      "targetLanguage.ru": "俄文",
      "content.translate": "翻譯",
      "content.restoreOriginal": "恢復原文",
      "content.loading": "翻譯中…",
      "content.pendingBody": "頁面正在更新，翻譯結果將自動重試。",
      "content.renderRetryStopped": "頁面結構持續變化，已停止自動重試。請稍後手動重試。",
      "content.noSegments": "未找到可翻譯內容。",
      "content.bodyNotFound": "無法定位郵件正文。",
      "content.titleTranslationEmpty": "標題翻譯結果為空。",
      "content.titleTranslationFailed": "標題翻譯失敗。",
      "content.segmentCountMismatch": "分段翻譯結果數量不匹配。",
      "error.translationCancelled": "翻譯請求已取消。",
      "error.settingsReadFailed": "讀取設定失敗。",
      "error.translationRequestFailed": "翻譯請求失敗。",
      "error.unsupportedTargetLanguage": "不支援目前目標語言。",
      "error.emptyTranslatableText": "沒有找到可翻譯的郵件正文。",
      "error.googleApiKeyMissing": "Google Cloud API Key 尚未設定，請先到設定頁填寫。",
      "error.microsoftApiKeyMissing": "Microsoft Translator API Key 尚未設定，請先到設定頁填寫。",
      "error.microsoftRegionMissing": "Microsoft Translator Region 尚未設定，請先到設定頁填寫。",
      "error.googleWebUnavailable": "Google Web 翻譯請求失敗，請稍後再試或切換到正式 API。",
      "error.googleApiUnavailable": "Google Cloud 翻譯請求失敗。",
      "error.microsoftUnavailable": "Microsoft 翻譯請求失敗。",
      "error.upstreamFailed": "翻譯服務暫時不可用，請稍後再試。"
    })
  });

  function normalizeUiLanguage(value) {
    return UI_LANGUAGE_VALUES.includes(value) ? value : DEFAULT_UI_LANGUAGE;
  }

  function normalizeLocale(value) {
    return UI_LOCALES.includes(value) ? value : "en";
  }

  function detectBrowserLanguage({ chromeI18n = scope.chrome?.i18n, navigatorRef = scope.navigator } = {}) {
    if (chromeI18n && typeof chromeI18n.getUILanguage === "function") {
      const language = chromeI18n.getUILanguage();
      if (typeof language === "string" && language.trim()) {
        return language.trim();
      }
    }

    if (navigatorRef && typeof navigatorRef.language === "string" && navigatorRef.language.trim()) {
      return navigatorRef.language.trim();
    }

    return "en";
  }

  function resolveBrowserLocale(browserLanguage) {
    const normalized = String(browserLanguage || "").trim();
    const lower = normalized.toLowerCase();

    if (!lower) {
      return "en";
    }

    if (
      lower === "zh-cn" ||
      lower === "zh-sg" ||
      lower === "zh" ||
      lower === "zh-chs" ||
      lower.startsWith("zh-hans")
    ) {
      return "zh-CN";
    }

    if (
      lower === "zh-tw" ||
      lower === "zh-hant" ||
      lower === "zh-cht" ||
      lower.startsWith("zh-hant-tw")
    ) {
      return "zh-TW";
    }

    if (
      lower === "zh-hk" ||
      lower === "zh-mo" ||
      lower.startsWith("zh-hant-hk") ||
      lower.startsWith("zh-hant-mo")
    ) {
      return "zh-HK";
    }

    if (lower === "en" || lower.startsWith("en-")) {
      return "en";
    }

    return "en";
  }

  function resolveUiLanguage(settingValue, browserLanguage = detectBrowserLanguage()) {
    const normalizedSetting = normalizeUiLanguage(settingValue);
    if (normalizedSetting !== DEFAULT_UI_LANGUAGE) {
      return normalizedSetting;
    }

    return resolveBrowserLocale(browserLanguage);
  }

  function getMessages(locale) {
    return MESSAGE_CATALOG[normalizeLocale(locale)];
  }

  function formatMessage(template, replacements) {
    if (!replacements || typeof replacements !== "object") {
      return template;
    }

    return template.replace(/\{(\w+)\}/g, (_match, key) => {
      if (Object.prototype.hasOwnProperty.call(replacements, key)) {
        return String(replacements[key]);
      }

      return `{${key}}`;
    });
  }

  function t(locale, key, replacements) {
    const safeLocale = normalizeLocale(locale);
    const localizedMessages = MESSAGE_CATALOG[safeLocale];
    const fallbackMessages = MESSAGE_CATALOG.en;
    const template = localizedMessages[key] || fallbackMessages[key] || key;
    return formatMessage(template, replacements);
  }

  function getProviderLabel(locale, providerId) {
    return t(locale, `provider.${providerId}`);
  }

  function getTargetLanguageLabel(locale, languageId) {
    return t(locale, `targetLanguage.${languageId}`);
  }

  function getUiLanguageLabel(locale, value) {
    return t(locale, `uiLanguage.${normalizeUiLanguage(value)}`);
  }

  function getProviderOptions(locale, providers) {
    return Array.isArray(providers)
      ? providers.map((provider) => ({
          id: provider.id,
          label: getProviderLabel(locale, provider.id)
        }))
      : [];
  }

  function getTargetLanguageOptions(locale, languages) {
    return Array.isArray(languages)
      ? languages.map((language) => ({
          id: language.id,
          label: getTargetLanguageLabel(locale, language.id)
        }))
      : [];
  }

  function getUiLanguageOptions(locale) {
    return UI_LANGUAGE_VALUES.map((value) => ({
      id: value,
      label: getUiLanguageLabel(locale, value)
    }));
  }

  function getErrorMessage(locale, errorCode) {
    const messageKey = ERROR_MESSAGE_KEYS[errorCode] || "error.translationRequestFailed";
    return t(locale, messageKey);
  }

  function applyDocumentLanguage(documentRef, locale) {
    if (documentRef?.documentElement) {
      documentRef.documentElement.lang = normalizeLocale(locale);
    }
  }

  function applyTranslations(root, locale) {
    if (!root || typeof root.querySelectorAll !== "function") {
      return;
    }

    const mappings = [
      ["[data-i18n-text]", (node, key) => { node.textContent = t(locale, key); }],
      ["[data-i18n-placeholder]", (node, key) => { node.placeholder = t(locale, key); }],
      ["[data-i18n-title]", (node, key) => { node.setAttribute?.("title", t(locale, key)); }],
      ["[data-i18n-aria-label]", (node, key) => { node.setAttribute?.("aria-label", t(locale, key)); }],
      ["[data-i18n-alt]", (node, key) => { node.setAttribute?.("alt", t(locale, key)); }]
    ];

    for (const [selector, apply] of mappings) {
      for (const node of root.querySelectorAll(selector)) {
        const key = node.getAttribute(selector.slice(1, -1));
        if (key) {
          apply(node, key);
        }
      }
    }
  }

  function assertMessageCompleteness() {
    const canonicalKeys = Object.keys(MESSAGE_CATALOG.en).sort();
    const missingKeysByLocale = {};

    for (const locale of UI_LOCALES) {
      const localeKeys = new Set(Object.keys(MESSAGE_CATALOG[locale]));
      const missing = canonicalKeys.filter((key) => !localeKeys.has(key));
      if (missing.length > 0) {
        missingKeysByLocale[locale] = missing;
      }
    }

    return {
      ok: Object.keys(missingKeysByLocale).length === 0,
      canonicalKeys,
      missingKeysByLocale
    };
  }

  const api = {
    UI_LOCALES,
    UI_LANGUAGE_VALUES,
    DEFAULT_UI_LANGUAGE,
    ERROR_CODES,
    ERROR_MESSAGE_KEYS,
    MESSAGE_CATALOG,
    normalizeUiLanguage,
    normalizeLocale,
    detectBrowserLanguage,
    resolveBrowserLocale,
    resolveUiLanguage,
    getMessages,
    t,
    getProviderLabel,
    getTargetLanguageLabel,
    getUiLanguageLabel,
    getProviderOptions,
    getTargetLanguageOptions,
    getUiLanguageOptions,
    getErrorMessage,
    applyDocumentLanguage,
    applyTranslations,
    assertMessageCompleteness
  };

  scope.FastTrMailI18n = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : self);
