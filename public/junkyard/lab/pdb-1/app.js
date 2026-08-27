(() => {
  'use strict';

  const app = document.getElementById('app');
  const cameraStage = document.querySelector('.camera-stage');
  const linkLayer = document.getElementById('linkLayer');
  const signalLost = document.getElementById('signalLost');
  const cameraNote = document.getElementById('cameraNote');
  const entryPanel = document.getElementById('entryPanel');
  const activeHeader = document.getElementById('activeHeader');
  const activeHeaderTitle = document.getElementById('activeHeaderTitle');
  const activePanel = document.getElementById('activePanel');
  const activeLinkState = document.getElementById('activeLinkState');
  const activeStateBadge = document.getElementById('activeStateBadge');
  const entryStateBadge = document.getElementById('entryStateBadge');
  const stateMessage = document.getElementById('stateMessage');
  const stateDetail = document.getElementById('stateDetail');
  const startButton = document.getElementById('startButton');
  const exitButton = document.getElementById('exitButton');
  const tabs = [...document.querySelectorAll('[data-mode]')];
  const tabPanels = [...document.querySelectorAll('[data-panel]')];

  const targetSource = './pdb-1-target.mind';
  const mindarSource = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';
  const css3dSource = 'three/addons/renderers/CSS3DRenderer.js';
  const LINK_HOLD_MS = 6500;
  const TARGET_ACQUIRED_MS = 480;
  const CAMERA_STATES = new Set(['scanning', 'acquired', 'active', 'hold', 'lost']);
  const LINKED_STATES = new Set(['acquired', 'active', 'hold']);

  let currentState = 'ready';
  let acquisitionTimer = null;
  let holdTimer = null;
  let lostTimer = null;
  let sessionId = 0;
  let isStopping = false;
  let trackingModulePromise = null;
  let trackingEngine = null;
  let trackingAnchor = null;
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
    scanning: {
      badge: 'SCANNING',
      message: 'SCANNING / AWAITING PDB-1',
      detail: 'Point the rear camera at PDB-1 to establish a link.',
    },
    acquired: {
      badge: 'ACQUIRED',
      message: 'TARGET ACQUIRED',
      detail: 'PDB-1 image registered. Opening the link channel.',
    },
    active: {
      badge: 'ACTIVE',
      message: 'ACTIVE / PDB-1 LINKED',
      detail: '',
    },
    hold: {
      badge: 'HOLD',
      message: 'LINK HOLD / REACQUIRE',
      detail: 'Target signal paused. Screen link held briefly.',
    },
    denied: {
      badge: 'DENIED',
      message: 'DENIED / CAMERA ACCESS BLOCKED',
      detail: 'Allow camera access in Safari site settings, then try again.',
    },
    error: {
      badge: 'ERROR',
      message: 'ERROR / MAINTENANCE DATA ONLY',
      detail: 'Live camera or image tracking is unavailable. The system snapshot remains available.',
    },
    lost: {
      badge: 'LOST',
      message: 'SIGNAL LOST',
      detail: 'PDB-1 moved out of view. Resuming the image scan.',
    },
  };

  function setTrackedOverlayVisible(visible) {
    linkLayer.setAttribute('aria-hidden', String(!visible));
    linkLayer.style.visibility = visible ? 'visible' : 'hidden';
  }

  function setState(nextState, detail = null) {
    currentState = nextState;
    const copy = stateCopy[nextState] || stateCopy.error;
    const isLinked = LINKED_STATES.has(nextState);
    const hasTrackedGeometry = nextState === 'acquired' || nextState === 'active';
    const isCameraSession = CAMERA_STATES.has(nextState);
    const showEntry = ['ready', 'requesting', 'denied', 'error'].includes(nextState);
    const headerTitle = nextState === 'acquired'
      ? 'PDB-1 / TARGET ACQUIRED'
      : nextState === 'hold'
        ? 'PDB-1 / LINK HOLD'
        : isLinked
          ? 'PDB-1 / LINK CHANNEL'
          : 'PDB-1 / IMAGE SEARCH';
    const cameraStatus = nextState === 'acquired'
      ? 'LIVE CAMERA / TARGET ACQUIRED'
      : nextState === 'hold'
        ? 'LIVE CAMERA / LINK HOLD'
        : nextState === 'lost'
          ? 'LIVE CAMERA / SIGNAL LOST'
          : isLinked
            ? 'LIVE CAMERA / LINKED'
            : 'LIVE CAMERA / SCANNING';
    const linkStatus = nextState === 'acquired'
      ? 'TARGET ACQUIRED'
      : nextState === 'hold'
        ? 'LINK HOLD'
        : 'LINK ESTABLISHED';

    app.dataset.state = nextState;
    entryStateBadge.textContent = copy.badge;
    activeStateBadge.textContent = copy.badge;
    stateMessage.textContent = copy.message;
    stateDetail.textContent = detail ?? copy.detail;
    activeHeaderTitle.textContent = headerTitle;
    activeLinkState.textContent = linkStatus;
    cameraNote.textContent = cameraStatus;

    entryPanel.hidden = !showEntry;
    activeHeader.hidden = !isCameraSession;
    activePanel.hidden = !isLinked;
    exitButton.hidden = !isCameraSession;
    signalLost.hidden = nextState !== 'lost';
    startButton.disabled = nextState === 'requesting' || isCameraSession || !cameraSupported;

    if (nextState === 'ready') startButton.textContent = 'CAMERA START';
    if (nextState === 'requesting') startButton.textContent = 'REQUESTING…';
    if (nextState === 'denied' || nextState === 'error') {
      startButton.textContent = cameraSupported ? 'TRY CAMERA AGAIN' : 'CAMERA UNAVAILABLE';
    }

    setTrackedOverlayVisible(hasTrackedGeometry);
  }

  function clearAcquisitionTimer() {
    if (acquisitionTimer) {
      window.clearTimeout(acquisitionTimer);
      acquisitionTimer = null;
    }
  }

  function clearHoldTimer() {
    if (holdTimer) {
      window.clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  function clearLostTimer() {
    if (lostTimer) {
      window.clearTimeout(lostTimer);
      lostTimer = null;
    }
  }

  function clearLinkTimers() {
    clearAcquisitionTimer();
    clearHoldTimer();
    clearLostTimer();
  }

  function readCameraPermission() {
    if (!navigator.permissions || typeof navigator.permissions.query !== 'function') return Promise.resolve(null);

    return navigator.permissions.query({ name: 'camera' })
      .then((status) => status.state)
      .catch(() => null);
  }

  function loadTrackingModules() {
    if (!trackingModulePromise) {
      trackingModulePromise = Promise.all([
        import(mindarSource),
        import(css3dSource),
      ]).then(([mindarModule, css3dModule]) => {
        if (typeof mindarModule.MindARThree !== 'function' || typeof css3dModule.CSS3DObject !== 'function') {
          throw new Error('Image tracking modules are incomplete.');
        }

        return {
          MindARThree: mindarModule.MindARThree,
          CSS3DObject: css3dModule.CSS3DObject,
        };
      }).catch((error) => {
        trackingModulePromise = null;
        throw error;
      });
    }

    return trackingModulePromise;
  }

  function closeLostLink() {
    clearAcquisitionTimer();
    clearHoldTimer();
    clearLostTimer();
    setState('lost');
    lostTimer = window.setTimeout(() => {
      if (currentState === 'lost') setState('scanning');
    }, 1200);
  }

  function holdLinkAfterTargetLoss() {
    if (!['acquired', 'active'].includes(currentState)) return;

    clearAcquisitionTimer();
    clearLostTimer();
    clearHoldTimer();
    setState('hold');
    holdTimer = window.setTimeout(() => {
      holdTimer = null;
      if (currentState === 'hold') closeLostLink();
    }, LINK_HOLD_MS);
  }

  function createTrackingEngine({ MindARThree, CSS3DObject }) {
    const engine = new MindARThree({
      container: cameraStage,
      imageTargetSrc: targetSource,
      maxTrack: 1,
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
      warmupTolerance: 2,
      missTolerance: 4,
      // With no environmentDeviceId, MindAR requests facingMode: "environment".
      environmentDeviceId: undefined,
    });

    engine.renderer.domElement.classList.add('tracking-renderer');
    engine.cssRenderer.domElement.classList.add('tracking-css-renderer');
    engine.renderer.domElement.setAttribute('aria-hidden', 'true');
    engine.cssRenderer.domElement.setAttribute('aria-hidden', 'true');

    const anchor = engine.addCSSAnchor(0);
    anchor.group.add(new CSS3DObject(linkLayer));

    trackingEngine = engine;
    trackingAnchor = anchor;

    anchor.onTargetFound = () => {
      if (trackingEngine !== engine) return;
      clearAcquisitionTimer();
      clearHoldTimer();
      clearLostTimer();

      // The screen-space panel resumes during the hold window without replaying acquisition.
      if (currentState === 'hold' || currentState === 'lost') {
        setState('active');
        return;
      }

      if (currentState === 'scanning') {
        setState('acquired');
        acquisitionTimer = window.setTimeout(() => {
          if (trackingEngine === engine && currentState === 'acquired') setState('active');
        }, TARGET_ACQUIRED_MS);
      }
    };

    anchor.onTargetLost = () => {
      if (trackingEngine !== engine) return;
      holdLinkAfterTargetLoss();
    };

    return engine;
  }

  function startRenderLoop(engine) {
    engine.renderer.setAnimationLoop(() => {
      if (trackingEngine !== engine) return;
      engine.renderer.render(engine.scene, engine.camera);
      engine.cssRenderer.render(engine.cssScene, engine.camera);
    });
  }

  function stopTrackingEngine() {
    const engine = trackingEngine;
    clearLinkTimers();
    if (!engine) {
      trackingAnchor = null;
      return;
    }

    isStopping = true;
    setTrackedOverlayVisible(false);
    if (trackingAnchor) {
      trackingAnchor.visible = false;
      trackingAnchor.group.visible = false;
    }
    engine.renderer?.setAnimationLoop(null);

    const video = engine.video;
    const stream = video?.srcObject;

    try {
      if (engine.controller) engine.stop();
    } catch {
      // The engine can fail before its controller or stream is ready.
    }

    try {
      engine.controller?.dispose();
    } catch {
      // Cleanup below still stops the local stream when disposal is unavailable.
    }

    stream?.getTracks().forEach((track) => track.stop());
    if (video) {
      video.pause();
      video.srcObject = null;
      video.remove();
    }

    trackingEngine = null;
    trackingAnchor = null;
    isStopping = false;
  }

  function describeCameraError(error) {
    if (!error || error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return {
        state: 'denied',
        detail: 'Allow camera access in Safari site settings, then try again.',
      };
    }

    return {
      state: 'error',
      detail: 'Live camera or image tracking is unavailable. The system snapshot remains available.',
    };
  }

  function showCameraLoss() {
    if (!CAMERA_STATES.has(currentState)) return;

    clearLinkTimers();
    setState('lost', 'The camera signal ended. Reopen CAMERA START to retry.');
    stopTrackingEngine();
    lostTimer = window.setTimeout(() => {
      if (currentState === 'lost') setState('ready');
    }, 1500);
  }

  function handleCameraEnded() {
    if (isStopping) return;
    showCameraLoss();
  }

  async function startCamera() {
    if (CAMERA_STATES.has(currentState) || currentState === 'requesting') return;

    clearLinkTimers();
    const thisSession = ++sessionId;

    if (!cameraSupported) {
      setState('error', 'This browser does not provide camera access. The system snapshot remains available.');
      return;
    }

    stopTrackingEngine();
    setState('requesting');

    try {
      const permissionState = await readCameraPermission();
      if (thisSession !== sessionId) return;
      if (permissionState === 'denied') {
        setState('denied');
        return;
      }

      const modules = await loadTrackingModules();
      if (thisSession !== sessionId) return;

      const engine = trackingEngine || createTrackingEngine(modules);
      setTrackedOverlayVisible(false);

      const startPromise = engine.start();
      if (currentState === 'requesting') setState('scanning');
      await startPromise;
      if (thisSession !== sessionId || trackingEngine !== engine) return;

      const video = engine.video;
      video.setAttribute('aria-label', 'Live rear camera feed');
      video.setAttribute('webkit-playsinline', '');
      video.muted = true;
      video.classList.add('tracking-video');
      video.addEventListener('ended', handleCameraEnded, { once: true });
      const videoTrack = video.srcObject?.getVideoTracks?.()[0];
      videoTrack?.addEventListener('ended', handleCameraEnded, { once: true });
      startRenderLoop(engine);
    } catch (error) {
      if (thisSession !== sessionId) return;
      stopTrackingEngine();
      const failure = describeCameraError(error);
      setState(failure.state, failure.detail);
    }
  }

  function exitCamera() {
    ++sessionId;
    clearLinkTimers();
    stopTrackingEngine();
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
    if (document.visibilityState === 'hidden' && CAMERA_STATES.has(currentState)) {
      ++sessionId;
      clearLinkTimers();
      stopTrackingEngine();
      setState('ready', 'Camera paused when this page was hidden. Tap CAMERA START to resume.');
    }
  });

  window.addEventListener('pagehide', () => {
    ++sessionId;
    clearLinkTimers();
    stopTrackingEngine();
  });

  selectMode('link');
  setState('ready');
  loadTrackingModules().catch(() => {
    // Loading is retried through the explicit CAMERA START action.
  });
})();
