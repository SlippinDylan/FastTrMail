const fastTrMailContent = globalThis.FastTrMailContent;

if (!fastTrMailContent?.controller || typeof fastTrMailContent.controller.initialize !== "function") {
  throw new Error("FastTrMail content modules failed to load.");
}

fastTrMailContent.controller.initialize();
