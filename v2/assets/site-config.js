// Public control-plane location only. The access-key digest and GitHub token
// belong in the private dispatch gateway and must never be added here.
window.MBbotSiteConfig = Object.freeze({
  backtestDispatchUrl:
    "https://mbbot-backtest-dispatch.alhazmimeshari.workers.dev",
  localDataCapabilities: Object.freeze({
    greeks: true,
    tradeSide: false,
  }),
});
