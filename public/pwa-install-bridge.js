(function () {
  var listeners = [];
  var bridge = {
    deferredPrompt: null,
    installed: false,
    subscribe: function (listener) {
      listeners.push(listener);
      return function () {
        listeners = listeners.filter(function (candidate) { return candidate !== listener; });
      };
    },
    notify: function () {
      listeners.slice().forEach(function (listener) { listener(); });
    }
  };

  window.__makinaPwaInstallBridge = bridge;
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    bridge.deferredPrompt = event;
    bridge.notify();
  });
  window.addEventListener('appinstalled', function () {
    bridge.deferredPrompt = null;
    bridge.installed = true;
    bridge.notify();
  });
})();

