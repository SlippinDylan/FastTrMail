try {
  importScripts(
    "background/shared.js",
    "background/settings.js",
    "background/edge-auth.js",
    "background/providers.js",
    "background/handlers.js"
  );

  const backgroundApp = self.FastTrMailBackground;
  if (!backgroundApp || typeof backgroundApp.initialize !== "function") {
    throw new Error("FastTrMail background modules failed to initialize.");
  }

  backgroundApp.initialize();
} catch (error) {
  void error;
}
