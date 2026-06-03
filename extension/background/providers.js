(function initBackgroundProviders(scope) {
  const ns = scope.FastTrMailBackground;
  const GOOGLE_WEB_SEGMENT_CONCURRENCY = 4;
  const { ERROR_CODES } = ns;

  ns.handleTranslateRequest = async function handleTranslateRequest(message) {
    const requestId = typeof message.requestId === "string" ? message.requestId.trim() : "";
    const requestEntry = requestId ? ns.requestRegistry.register(requestId) : null;

    try {
      const settings = await ns.getEffectiveSettings();
      const languageDefinition = ns.getLanguageDefinition(settings.targetLanguage);

      if (!languageDefinition) {
        throw ns.createError(ERROR_CODES.UNSUPPORTED_TARGET_LANGUAGE);
      }

      const segments = Array.isArray(message.segments)
        ? message.segments.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
        : [];

      if (segments.length > 0) {
        return ns.handleSegmentTranslateRequest(
          segments,
          settings,
          languageDefinition,
          requestEntry?.signal
        );
      }

      const text = typeof message.text === "string" ? message.text.trim() : "";
      if (!text) {
        throw ns.createError(ERROR_CODES.EMPTY_TRANSLATABLE_TEXT);
      }

      if (settings.provider === "google-web") {
        return ns.translateWithGoogleWeb(text, languageDefinition, requestEntry?.signal);
      }

      if (settings.provider === "microsoft") {
        return ns.translateWithMicrosoft(text, settings, languageDefinition, requestEntry?.signal);
      }

      return ns.translateWithGoogleApi(text, settings, languageDefinition, requestEntry?.signal);
    } finally {
      if (requestId) {
        ns.requestRegistry.finalize(requestId);
      }
    }
  };

  ns.cancelTranslateRequest = function cancelTranslateRequest(requestId) {
    if (typeof requestId !== "string" || !requestId.trim()) {
      return false;
    }

    return ns.requestRegistry.cancel(requestId.trim());
  };

  ns.handleSegmentTranslateRequest = async function handleSegmentTranslateRequest(segments, settings, languageDefinition, signal) {
    if (settings.provider === "google-web") {
      const translatedSegments = await ns.mapWithConcurrency(
        segments,
        GOOGLE_WEB_SEGMENT_CONCURRENCY,
        async (segment) => ns.translateWithGoogleWeb(segment, languageDefinition, signal)
      );

      return {
        provider: "google-web",
        providerLabel: ns.PROVIDER_LABELS["google-web"],
        targetLanguage: languageDefinition.id,
        targetLanguageLabel: languageDefinition.label,
        translatedSegments: translatedSegments.map((item) => item.translatedText)
      };
    }

    if (settings.provider === "microsoft") {
      return ns.translateSegmentsWithMicrosoft(segments, settings, languageDefinition, signal);
    }

    return ns.translateSegmentsWithGoogleApi(segments, settings, languageDefinition, signal);
  };

  ns.translateWithGoogleWeb = async function translateWithGoogleWeb(text, languageDefinition, signal) {
    const endpoint = new URL("https://translate.googleapis.com/translate_a/single");
    endpoint.searchParams.set("client", "gtx");
    endpoint.searchParams.set("sl", "auto");
    endpoint.searchParams.set("tl", languageDefinition.google);
    endpoint.searchParams.set("dt", "t");
    endpoint.searchParams.set("q", text);

    const response = await fetch(endpoint.toString(), {
      method: "GET",
      signal
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !Array.isArray(data)) {
      throw ns.createError(ERROR_CODES.GOOGLE_WEB_UNAVAILABLE);
    }

    const translatedText = Array.isArray(data[0])
      ? data[0]
          .map((item) => (Array.isArray(item) ? item[0] || "" : ""))
          .join("")
          .trim()
      : "";

    if (!translatedText) {
      throw ns.createError(ERROR_CODES.GOOGLE_WEB_UNAVAILABLE);
    }

    return {
      provider: "google-web",
      providerLabel: ns.PROVIDER_LABELS["google-web"],
      targetLanguage: languageDefinition.id,
      targetLanguageLabel: languageDefinition.label,
      translatedText: ns.decodeHtmlEntities(translatedText)
    };
  };

  ns.translateWithGoogleApi = async function translateWithGoogleApi(text, settings, languageDefinition, signal) {
    if (!settings.googleApiKey) {
      throw ns.createError(ERROR_CODES.GOOGLE_API_KEY_MISSING);
    }

    const endpoint = new URL("https://translation.googleapis.com/language/translate/v2");
    endpoint.searchParams.set("key", settings.googleApiKey);

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      signal,
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
      throw ns.createError(ERROR_CODES.GOOGLE_API_UNAVAILABLE, {
        metadata: {
          provider: "google-api",
          upstreamMessage: data?.error?.message || ""
        }
      });
    }

    const translatedText = data?.data?.translations?.[0]?.translatedText;
    if (!translatedText) {
      throw ns.createError(ERROR_CODES.GOOGLE_API_UNAVAILABLE);
    }

    return {
      provider: "google-api",
      providerLabel: ns.PROVIDER_LABELS["google-api"],
      targetLanguage: languageDefinition.id,
      targetLanguageLabel: languageDefinition.label,
      translatedText: ns.decodeHtmlEntities(translatedText)
    };
  };

  ns.translateWithMicrosoft = async function translateWithMicrosoft(text, settings, languageDefinition, signal) {
    if (!settings.microsoftApiKey) {
      throw ns.createError(ERROR_CODES.MICROSOFT_API_KEY_MISSING);
    }

    if (!settings.microsoftRegion) {
      throw ns.createError(ERROR_CODES.MICROSOFT_REGION_MISSING);
    }

    const endpoint = new URL("https://api.cognitive.microsofttranslator.com/translate");
    endpoint.searchParams.set("api-version", "3.0");
    endpoint.searchParams.set("to", languageDefinition.microsoft);

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": settings.microsoftApiKey,
        "Ocp-Apim-Subscription-Region": settings.microsoftRegion
      },
      body: JSON.stringify([{ text }])
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw ns.createError(ERROR_CODES.MICROSOFT_UNAVAILABLE, {
        metadata: {
          provider: "microsoft",
          upstreamMessage: data?.error?.message || data?.message || ""
        }
      });
    }

    const translatedText = data?.[0]?.translations?.[0]?.text;
    if (!translatedText) {
      throw ns.createError(ERROR_CODES.MICROSOFT_UNAVAILABLE);
    }

    return {
      provider: "microsoft",
      providerLabel: ns.PROVIDER_LABELS.microsoft,
      targetLanguage: languageDefinition.id,
      targetLanguageLabel: languageDefinition.label,
      translatedText
    };
  };

  ns.translateSegmentsWithGoogleApi = async function translateSegmentsWithGoogleApi(segments, settings, languageDefinition, signal) {
    if (!settings.googleApiKey) {
      throw ns.createError(ERROR_CODES.GOOGLE_API_KEY_MISSING);
    }

    const endpoint = new URL("https://translation.googleapis.com/language/translate/v2");
    endpoint.searchParams.set("key", settings.googleApiKey);

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      signal,
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
      throw ns.createError(ERROR_CODES.GOOGLE_API_UNAVAILABLE, {
        metadata: {
          provider: "google-api",
          upstreamMessage: data?.error?.message || ""
        }
      });
    }

    const translatedSegments = Array.isArray(data?.data?.translations)
      ? data.data.translations.map((item) => ns.decodeHtmlEntities(item?.translatedText || ""))
      : [];

    if (translatedSegments.length !== segments.length) {
      throw ns.createError(ERROR_CODES.GOOGLE_API_UNAVAILABLE);
    }

    return {
      provider: "google-api",
      providerLabel: ns.PROVIDER_LABELS["google-api"],
      targetLanguage: languageDefinition.id,
      targetLanguageLabel: languageDefinition.label,
      translatedSegments
    };
  };

  ns.translateSegmentsWithMicrosoft = async function translateSegmentsWithMicrosoft(segments, settings, languageDefinition, signal) {
    if (!settings.microsoftApiKey) {
      throw ns.createError(ERROR_CODES.MICROSOFT_API_KEY_MISSING);
    }

    if (!settings.microsoftRegion) {
      throw ns.createError(ERROR_CODES.MICROSOFT_REGION_MISSING);
    }

    const endpoint = new URL("https://api.cognitive.microsofttranslator.com/translate");
    endpoint.searchParams.set("api-version", "3.0");
    endpoint.searchParams.set("to", languageDefinition.microsoft);

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": settings.microsoftApiKey,
        "Ocp-Apim-Subscription-Region": settings.microsoftRegion
      },
      body: JSON.stringify(segments.map((text) => ({ text })))
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw ns.createError(ERROR_CODES.MICROSOFT_UNAVAILABLE, {
        metadata: {
          provider: "microsoft",
          upstreamMessage: data?.error?.message || data?.message || ""
        }
      });
    }

    const translatedSegments = Array.isArray(data)
      ? data.map((item) => item?.translations?.[0]?.text || "")
      : [];

    if (translatedSegments.length !== segments.length) {
      throw ns.createError(ERROR_CODES.MICROSOFT_UNAVAILABLE);
    }

    return {
      provider: "microsoft",
      providerLabel: ns.PROVIDER_LABELS.microsoft,
      targetLanguage: languageDefinition.id,
      targetLanguageLabel: languageDefinition.label,
      translatedSegments
    };
  };

})(self);
