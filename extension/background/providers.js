(function initBackgroundProviders(scope) {
  const ns = scope.FastTrMailBackground;
  const GOOGLE_WEB_SEGMENT_CONCURRENCY = 4;

  ns.handleTranslateRequest = async function handleTranslateRequest(message) {
    const settings = await ns.getSettings();
    const languageDefinition = ns.getLanguageDefinition(settings.targetLanguage);

    if (!languageDefinition) {
      throw new Error("不支持当前目标语言。");
    }

    const segments = Array.isArray(message.segments)
      ? message.segments.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
      : [];

    if (segments.length > 0) {
      return ns.handleSegmentTranslateRequest(segments, settings, languageDefinition);
    }

    const text = typeof message.text === "string" ? message.text.trim() : "";
    if (!text) {
      throw new Error("没有找到可翻译的邮件正文。");
    }

    if (settings.provider === "google-web") {
      return ns.translateWithGoogleWeb(text, languageDefinition);
    }

    if (settings.provider === "edge-web") {
      return ns.translateWithEdgeWeb(text, languageDefinition);
    }

    if (settings.provider === "microsoft") {
      return ns.translateWithMicrosoft(text, settings, languageDefinition);
    }

    return ns.translateWithGoogleApi(text, settings, languageDefinition);
  };

  ns.handleSegmentTranslateRequest = async function handleSegmentTranslateRequest(segments, settings, languageDefinition) {
    if (settings.provider === "google-web") {
      const translatedSegments = await ns.mapWithConcurrency(
        segments,
        GOOGLE_WEB_SEGMENT_CONCURRENCY,
        async (segment) => ns.translateWithGoogleWeb(segment, languageDefinition)
      );

      return {
        provider: "google-web",
        providerLabel: "Google Web（免 Key）",
        targetLanguage: languageDefinition.id,
        targetLanguageLabel: languageDefinition.label,
        translatedSegments: translatedSegments.map((item) => item.translatedText)
      };
    }

    if (settings.provider === "edge-web") {
      return ns.translateSegmentsWithEdgeWeb(segments, languageDefinition);
    }

    if (settings.provider === "microsoft") {
      return ns.translateSegmentsWithMicrosoft(segments, settings, languageDefinition);
    }

    return ns.translateSegmentsWithGoogleApi(segments, settings, languageDefinition);
  };

  ns.translateWithGoogleWeb = async function translateWithGoogleWeb(text, languageDefinition) {
    const endpoint = new URL("https://translate.googleapis.com/translate_a/single");
    endpoint.searchParams.set("client", "gtx");
    endpoint.searchParams.set("sl", "auto");
    endpoint.searchParams.set("tl", languageDefinition.google);
    endpoint.searchParams.set("dt", "t");
    endpoint.searchParams.set("q", text);

    const response = await fetch(endpoint.toString(), {
      method: "GET"
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !Array.isArray(data)) {
      throw new Error("Google Web 翻译请求失败，请稍后重试或切换到正式 API。");
    }

    const translatedText = Array.isArray(data[0])
      ? data[0]
          .map((item) => (Array.isArray(item) ? item[0] || "" : ""))
          .join("")
          .trim()
      : "";

    if (!translatedText) {
      throw new Error("Google Web 翻译返回为空，请切换到正式 API。");
    }

    return {
      provider: "google-web",
      providerLabel: "Google Web（免 Key）",
      targetLanguage: languageDefinition.id,
      targetLanguageLabel: languageDefinition.label,
      translatedText: ns.decodeHtmlEntities(translatedText)
    };
  };

  ns.translateWithGoogleApi = async function translateWithGoogleApi(text, settings, languageDefinition) {
    if (!settings.googleApiKey) {
      throw new Error("Google Cloud API Key 未配置，请先到设置页填写。");
    }

    const endpoint = new URL("https://translation.googleapis.com/language/translate/v2");
    endpoint.searchParams.set("key", settings.googleApiKey);

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: text,
        target: languageDefinition.google,
        format: "text"
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || "Google Cloud 翻译请求失败。";
      throw new Error(message);
    }

    const translatedText = data?.data?.translations?.[0]?.translatedText;
    if (!translatedText) {
      throw new Error("Google Cloud 翻译返回为空。");
    }

    return {
      provider: "google-api",
      providerLabel: "Google Cloud API",
      targetLanguage: languageDefinition.id,
      targetLanguageLabel: languageDefinition.label,
      translatedText: ns.decodeHtmlEntities(translatedText)
    };
  };

  ns.translateWithEdgeWeb = async function translateWithEdgeWeb(text, languageDefinition) {
    const result = await ns.translateSegmentsWithEdgeWeb([text], languageDefinition);
    return {
      provider: result.provider,
      providerLabel: result.providerLabel,
      targetLanguage: result.targetLanguage,
      targetLanguageLabel: result.targetLanguageLabel,
      translatedText: result.translatedSegments[0]
    };
  };

  ns.translateWithMicrosoft = async function translateWithMicrosoft(text, settings, languageDefinition) {
    if (!settings.microsoftApiKey) {
      throw new Error("Microsoft Translator API Key 未配置，请先到设置页填写。");
    }

    if (!settings.microsoftRegion) {
      throw new Error("Microsoft Translator Region 未配置，请先到设置页填写。");
    }

    const endpoint = new URL("https://api.cognitive.microsofttranslator.com/translate");
    endpoint.searchParams.set("api-version", "3.0");
    endpoint.searchParams.set("to", languageDefinition.microsoft);

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": settings.microsoftApiKey,
        "Ocp-Apim-Subscription-Region": settings.microsoftRegion
      },
      body: JSON.stringify([{ text }])
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        "Microsoft 翻译请求失败。";
      throw new Error(message);
    }

    const translatedText = data?.[0]?.translations?.[0]?.text;
    if (!translatedText) {
      throw new Error("Microsoft 翻译返回为空。");
    }

    return {
      provider: "microsoft",
      providerLabel: "Microsoft Translator",
      targetLanguage: languageDefinition.id,
      targetLanguageLabel: languageDefinition.label,
      translatedText
    };
  };

  ns.translateSegmentsWithGoogleApi = async function translateSegmentsWithGoogleApi(segments, settings, languageDefinition) {
    if (!settings.googleApiKey) {
      throw new Error("Google Cloud API Key 未配置，请先到设置页填写。");
    }

    const endpoint = new URL("https://translation.googleapis.com/language/translate/v2");
    endpoint.searchParams.set("key", settings.googleApiKey);

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: segments,
        target: languageDefinition.google,
        format: "text"
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || "Google Cloud 翻译请求失败。";
      throw new Error(message);
    }

    const translatedSegments = Array.isArray(data?.data?.translations)
      ? data.data.translations.map((item) => ns.decodeHtmlEntities(item?.translatedText || ""))
      : [];

    if (translatedSegments.length !== segments.length) {
      throw new Error("Google Cloud 分段翻译结果数量不匹配。");
    }

    return {
      provider: "google-api",
      providerLabel: "Google Cloud API",
      targetLanguage: languageDefinition.id,
      targetLanguageLabel: languageDefinition.label,
      translatedSegments
    };
  };

  ns.translateSegmentsWithMicrosoft = async function translateSegmentsWithMicrosoft(segments, settings, languageDefinition) {
    if (!settings.microsoftApiKey) {
      throw new Error("Microsoft Translator API Key 未配置，请先到设置页填写。");
    }

    if (!settings.microsoftRegion) {
      throw new Error("Microsoft Translator Region 未配置，请先到设置页填写。");
    }

    const endpoint = new URL("https://api.cognitive.microsofttranslator.com/translate");
    endpoint.searchParams.set("api-version", "3.0");
    endpoint.searchParams.set("to", languageDefinition.microsoft);

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": settings.microsoftApiKey,
        "Ocp-Apim-Subscription-Region": settings.microsoftRegion
      },
      body: JSON.stringify(segments.map((text) => ({ text })))
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        "Microsoft 翻译请求失败。";
      throw new Error(message);
    }

    const translatedSegments = Array.isArray(data)
      ? data.map((item) => item?.translations?.[0]?.text || "")
      : [];

    if (translatedSegments.length !== segments.length) {
      throw new Error("Microsoft 分段翻译结果数量不匹配。");
    }

    return {
      provider: "microsoft",
      providerLabel: "Microsoft Translator",
      targetLanguage: languageDefinition.id,
      targetLanguageLabel: languageDefinition.label,
      translatedSegments
    };
  };

  ns.translateSegmentsWithEdgeWeb = async function translateSegmentsWithEdgeWeb(segments, languageDefinition) {
    const token = await ns.getEdgeAuthToken();
    const endpoint = new URL(ns.EDGE_TRANSLATE_URL);
    endpoint.searchParams.set("api-version", "3.0");
    endpoint.searchParams.set("to", languageDefinition.microsoft);

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(segments.map((text) => ({ text })))
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        "Microsoft Edge 免 Key 翻译请求失败。";
      throw new Error(message);
    }

    const translatedSegments = Array.isArray(data)
      ? data.map((item) => item?.translations?.[0]?.text || "")
      : [];

    if (translatedSegments.length !== segments.length) {
      throw new Error("Microsoft Edge 分段翻译结果数量不匹配。");
    }

    return {
      provider: "edge-web",
      providerLabel: "Microsoft Edge（免 Key）",
      targetLanguage: languageDefinition.id,
      targetLanguageLabel: languageDefinition.label,
      translatedSegments
    };
  };
})(self);
