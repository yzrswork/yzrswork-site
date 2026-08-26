(() => {
  'use strict';

  const app = document.getElementById('app');
  const camera = document.getElementById('camera');
  const entryPanel = document.getElementById('entryPanel');
  const activeHeader = document.getElementById('activeHeader');
  const activePanel = document.getElementById('activePanel');
  const activeStateBadge = document.getElementById('activeStateBadge');
  const entryStateBadge = document.getElementById('entryStateBadge');
  const stateMessage = document.getElementById('stateMessage');
  const stateDetail = document.getElementById('stateDetail');
  const startButton = document.getElementById('startButton');
  const exitButton = document.getElementById('exitButton');
  const tabs = [...document.querySelectorAll('[data-mode]')];
  const tabPanels = [...document.querySelectorAll('[data-panel]')];

  let stream = null;
  let currentState = 'ready';
  const cameraSupported = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const stateCopy = {
    ready: {
      badge: 'READY',
      message: 'READY / CAMERA STANDBY',
      detail: 'Tap CAMERA START to request the rear camera.',
    },
    requesting: {
      badge: 'REQUESTING',
      message: 'REQUESTING / CAMERA ACCESS',
      detail: 'Allow Safari to use the rear camera for this view.',
    },
    active: {
      badge: 'ACTIVE',
      message: 'ACTIVE / LOCAL CAMERA VIEW',
      detail: '',
    },
    denied: {
      badge: 'DENIED',
      message: 'DENIED / CAMERA ACCESS BLOCKED',
      detail: 'Allow camera access in Safari site settings, then try again.',
    },
    error: {
      badge: 'ERROR',
      message: 'ERROR / MAINTENANCE DATA ONLY',
      detail: 'Live camera is unavailable. The system snapshot remains available on this screen.',
    },
  };

  function setState(nextState, detail = null) {
    currentState = nextState;
    const copy = stateCopy[nextState] || stateCopy.error;
    app.dataset.state = nextState;
    entryStateBadge.textContent = copy.badge;
    activeStateBadge.textContent = copy.badge;
    stateMessage.textContent = copy.message;
    stateDetail.textContent = detail ?? copy.detail;
    entryPanel.hidden = nextState === 'active';
    activeHeader.hidden = nextState !== 'active';
    activePanel.hidden = nextState !== 'active';
    startButton.disabled = nextState === 'requesting' || !cameraSupported;

    if (nextState === 'ready') startButton.textContent = 'CAMERA START';
    if (nextState === 'requesting') startButton.textContent = 'REQUESTING…';
    if (nextState === 'denied' || nextState === 'error') startButton.textContent = cameraSupported ? 'TRY CAMERA AGAIN' : 'CAMERA UNAVAILABLE';
  }

  function stopCameraTracks() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    camera.pause();
    camera.srcObject = null;
  }

  function describeCameraError(error) {
    if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
      return {
        state: 'denied',
        detail: 'Allow camera access in Safari site settings, then try again.',
      };
    }

    return {
      state: 'error',
      detail: 'Live camera is unavailable. The system snapshot remains available on this screen.',
    };
  }

  async function startCamera() {
    if (currentState === 'requesting' || currentState === 'active') return;

    if (!cameraSupported) {
      setState('error', 'This browser does not provide camera access. The system snapshot remains available on this screen.');
      return;
    }

    stopCameraTracks();
    setState('requesting');

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      camera.srcObject = stream;
      await camera.play();
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack?.addEventListener('ended', handleCameraEnded, { once: true });
      setState('active');
    } catch (error) {
      stopCameraTracks();
      const failure = describeCameraError(error);
      setState(failure.state, failure.detail);
    }
  }

  function handleCameraEnded() {
    if (currentState !== 'active') return;
    stopCameraTracks();
    setState('error', 'The camera ended unexpectedly. The system snapshot remains available on this screen.');
  }

  function exitCamera() {
    stopCameraTracks();
    setState('ready');
  }

  function selectMode(mode) {
    tabs.forEach((tab) => {
      const selected = tab.dataset.mode === mode;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });

    tabPanels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== mode;
    });
  }

  startButton.addEventListener('click', startCamera);
  exitButton.addEventListener('click', exitCamera);
  tabs.forEach((tab) => tab.addEventListener('click', () => selectMode(tab.dataset.mode)));

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && currentState === 'active') exitCamera();
  });
  window.addEventListener('pagehide', () => {
    stopCameraTracks();
    if (currentState === 'active') setState('ready');
  });

  selectMode('system');
  setState('ready');
})();
