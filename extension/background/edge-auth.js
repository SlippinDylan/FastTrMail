(function initBackgroundEdgeAuth(scope) {
  const ns = scope.FastTrMailBackground;

  ns.getEdgeAuthToken = async function getEdgeAuthToken() {
    if (ns.edgeAuthCache?.token && ns.edgeAuthCache.expiresAt > Date.now() + 60 * 1000) {
      return ns.edgeAuthCache.token;
    }

    if (!ns.edgeAuthPromise) {
      ns.edgeAuthPromise = ns.fetchEdgeAuthToken().finally(() => {
        ns.edgeAuthPromise = null;
      });
    }

    return ns.edgeAuthPromise;
  };

  ns.fetchEdgeAuthToken = async function fetchEdgeAuthToken() {
    let token = await ns.requestEdgeAuthToken(false);
    if (!ns.isJwtLikeToken(token)) {
      token = await ns.requestEdgeAuthToken(true);
    }

    if (!ns.isJwtLikeToken(token)) {
      throw new Error("Microsoft Edge 认证 Token 获取失败。");
    }

    ns.edgeAuthCache = {
      token,
      expiresAt: ns.getJwtExpiry(token)
    };
    return token;
  };

  ns.requestEdgeAuthToken = async function requestEdgeAuthToken(useEdgeHeaders) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    if (useEdgeHeaders) {
      await ns.enableEdgeAuthHeaders();
    }

    try {
      const response = await fetch(ns.EDGE_AUTH_URL, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "*/*"
        },
        signal: controller.signal
      });

      return (await response.text()).trim();
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Microsoft Edge 认证超时。");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (useEdgeHeaders) {
        await ns.disableEdgeAuthHeaders();
      }
    }
  };

  ns.enableEdgeAuthHeaders = async function enableEdgeAuthHeaders() {
    if (!chrome.declarativeNetRequest?.updateSessionRules) {
      return;
    }

    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ns.EDGE_AUTH_RULE_ID],
      addRules: [
        {
          id: ns.EDGE_AUTH_RULE_ID,
          priority: 1,
          action: {
            type: "modifyHeaders",
            requestHeaders: [
              { header: "user-agent", operation: "set", value: ns.EDGE_USER_AGENT },
              { header: "sec-ch-ua", operation: "set", value: ns.EDGE_SEC_CH_UA },
              { header: "sec-ch-ua-mobile", operation: "set", value: "?0" },
              { header: "sec-ch-ua-platform", operation: "set", value: '"Windows"' }
            ]
          },
          condition: {
            urlFilter: "||edge.microsoft.com/translate/auth",
            resourceTypes: ["xmlhttprequest"]
          }
        }
      ]
    });
  };

  ns.disableEdgeAuthHeaders = async function disableEdgeAuthHeaders() {
    if (!chrome.declarativeNetRequest?.updateSessionRules) {
      return;
    }

    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ns.EDGE_AUTH_RULE_ID]
    });
  };
})(self);
