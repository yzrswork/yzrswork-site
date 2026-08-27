(() => {
  'use strict';

  const app = document.getElementById('app');
  const cameraStage = document.querySelector('.camera-stage');
  const entryPanel = document.getElementById('entryPanel');
  const scanStatus = document.getElementById('scanStatus');
  const statusPrimary = document.getElementById('statusPrimary');
  const statusSecondary = document.getElementById('statusSecondary');
  const stateMessage = document.getElementById('stateMessage');
  const stateDetail = document.getElementById('stateDetail');
  const startButton = document.getElementById('startButton');
  const exitButton = document.getElementById('exitButton');

  const configSource = './targets.json';
  const targetSource = './junkyard-six-targets.mind';
  const mindarSource = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';
  const css3dSource = 'three/addons/renderers/CSS3DRenderer.js';
  const CAMERA_STATES = new Set(['scanning', 'recognized', 'lost']);

  let currentState = 'ready';
  let currentTargetIndex = null;
  let sessionId = 0;
  let isStopping = false;
  let lostTimer = null;
  let modulePromise = null;
  let configPromise = null;
  let trackingEngine = null;
  let trackingAnchors = [];
  const recognizedTargets = new Set();
  const cameraSupported = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const stateCopy = {
    ready: ['READY / CAMERA STANDBY', 'Six existing artwork images. One target is tracked at a time.'],
    requesting: ['REQUESTING / CAMERA ACCESS', 'Allow Safari to use the rear camera for this trial.'],
    denied: ['DENIED / CAMERA ACCESS', 'Allow camera access in Safari site settings, then try again.'],
    error: ['ERROR / RECOGNITION UNAVAILABLE', 'Camera or image tracking could not start on this browser.'],
  };

  function clearLostTimer() {
    if (!lostTimer) return;
    window.clearTimeout(lostTimer);
    lostTimer = null;
  }

  function setStatus(primary, secondary = `${recognizedTargets.size} / 6`) {
    statusPrimary.textContent = primary;
    statusSecondary.textContent = secondary;
  }

  function setState(nextState, detail = null) {
    currentState = nextState;
    const isCameraState = CAMERA_STATES.has(nextState);
    const copy = stateCopy[nextState] || stateCopy.error;

    app.dataset.state = nextState;
    entryPanel.hidden = isCameraState;
    scanStatus.hidden = !isCameraState;
    exitButton.hidden = !isCameraState;
    startButton.disabled = nextState === 'requesting' || isCameraState || !cameraSupported;

    if (!isCameraState) {
      stateMessage.textContent = copy[0];
      stateDetail.textContent = detail ?? copy[1];
    }

    if (nextState === 'ready') startButton.textContent = 'CAMERA START';
    if (nextState === 'requesting') startButton.textContent = 'REQUESTING…';
    if (nextState === 'denied' || nextState === 'error') {
      startButton.textContent = cameraSupported ? 'TRY CAMERA AGAIN' : 'CAMERA UNAVAILABLE';
    }
  }

  function loadConfig() {
    if (!configPromise) {
      configPromise = fetch(configSource, { cache: 'no-cache' })
        .then((response) => {
          if (!response.ok) throw new Error(`Target configuration failed: ${response.status}`);
          return response.json();
        })
        .then((config) => {
          if (!Array.isArray(config.targets) || config.targets.length !== 6) {
            throw new Error('Target configuration must contain exactly six targets.');
          }
          config.targets.forEach((target, index) => {
            if (target.targetIndex !== index || !target.artwork || target.compiledDimensions?.length !== 2) {
              throw new Error(`Invalid target configuration at index ${index}.`);
            }
          });
          return config;
        })
        .catch((error) => {
          configPromise = null;
          throw error;
        });
    }
    return configPromise;
  }

  function loadModules() {
    if (!modulePromise) {
      modulePromise = Promise.all([
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
        modulePromise = null;
        throw error;
      });
    }
    return modulePromise;
  }

  function hideAllTargetLabels() {
    trackingAnchors.forEach(({ element }) => {
      element.style.visibility = 'hidden';
    });
  }

  function handleTargetFound(engine, target, element) {
    if (trackingEngine !== engine) return;
    clearLostTimer();
    hideAllTargetLabels();
    currentTargetIndex = target.targetIndex;
    recognizedTargets.add(target.targetIndex);
    element.style.visibility = 'visible';
    setStatus(target.artwork, 'RECOGNIZED');
    setState('recognized');
  }

  function handleTargetLost(engine, target, element) {
    if (trackingEngine !== engine) return;
    element.style.visibility = 'hidden';
    if (currentTargetIndex !== target.targetIndex) return;

    currentTargetIndex = null;
    setStatus(`LOST / ${target.artwork}`, `${recognizedTargets.size} / 6`);
    setState('lost');
    clearLostTimer();
    lostTimer = window.setTimeout(() => {
      if (trackingEngine === engine && currentTargetIndex === null) {
        setStatus('SCANNING', `${recognizedTargets.size} / 6`);
        setState('scanning');
      }
    }, 650);
  }

  function createTargetElement(target) {
    const element = document.createElement('div');
    element.className = 'target-anchor';
    element.style.width = `${target.compiledDimensions[0]}px`;
    element.style.height = `${target.compiledDimensions[1]}px`;
    element.setAttribute('aria-hidden', 'true');

    const label = document.createElement('div');
    label.className = 'recognition-tag';
    const name = document.createElement('strong');
    name.textContent = target.artwork;
    const state = document.createElement('span');
    state.textContent = 'RECOGNIZED';
    label.append(name, state);
    element.append(label);
    return element;
  }

  function createTrackingEngine({ MindARThree, CSS3DObject }, config) {
    const engine = new MindARThree({
      container: cameraStage,
      imageTargetSrc: targetSource,
      maxTrack: 1,
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
      warmupTolerance: 2,
      missTolerance: 4,
      environmentDeviceId: undefined,
    });

    engine.renderer.domElement.classList.add('tracking-renderer');
    engine.cssRenderer.domElement.classList.add('tracking-css-renderer');
    engine.renderer.domElement.setAttribute('aria-hidden', 'true');
    engine.cssRenderer.domElement.setAttribute('aria-hidden', 'true');

    trackingAnchors = config.targets.map((target) => {
      const element = createTargetElement(target);
      const anchor = engine.addCSSAnchor(target.targetIndex);
      anchor.group.add(new CSS3DObject(element));
      anchor.onTargetFound = () => handleTargetFound(engine, target, element);
      anchor.onTargetLost = () => handleTargetLost(engine, target, element);
      return { anchor, element, target };
    });

    trackingEngine = engine;
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
    if (!engine) return;

    isStopping = true;
    trackingEngine = null;
    clearLostTimer();
    hideAllTargetLabels();
    trackingAnchors.forEach(({ anchor }) => {
      anchor.onTargetFound = null;
      anchor.onTargetLost = null;
      anchor.group.visible = false;
    });

    engine.renderer?.setAnimationLoop(null);
    const video = engine.video;
    const stream = video?.srcObject;

    try { engine.stop(); } catch { /* Engine may be partially initialized. */ }
    try { engine.controller?.dispose(); } catch { /* Track cleanup continues below. */ }

    stream?.getTracks().forEach((track) => track.stop());
    if (video) {
      video.pause();
      video.srcObject = null;
      video.remove();
    }
    engine.renderer?.domElement?.remove();
    engine.cssRenderer?.domElement?.remove();

    trackingAnchors = [];
    currentTargetIndex = null;
    isStopping = false;
  }

  function describeError(error) {
    if (!error || error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return ['denied', 'Allow camera access in Safari site settings, then try again.'];
    }
    return ['error', 'Camera or image tracking could not start. Check network access and try again.'];
  }

  function handleCameraEnded() {
    if (isStopping || !CAMERA_STATES.has(currentState)) return;
    ++sessionId;
    stopTrackingEngine();
    setState('ready', 'The camera signal ended. Tap CAMERA START to retry.');
  }

  async function startCamera() {
    if (currentState === 'requesting' || CAMERA_STATES.has(currentState)) return;
    if (!cameraSupported) {
      setState('error', 'This browser does not provide camera access.');
      return;
    }

    const thisSession = ++sessionId;
    recognizedTargets.clear();
    clearLostTimer();
    stopTrackingEngine();
    setState('requesting');

    try {
      const [modules, config] = await Promise.all([loadModules(), loadConfig()]);
      if (thisSession !== sessionId) return;

      const engine = createTrackingEngine(modules, config);
      await engine.start();
      if (thisSession !== sessionId || trackingEngine !== engine) {
        stopTrackingEngine();
        return;
      }

      const video = engine.video;
      video.setAttribute('aria-label', 'Live rear camera feed');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.muted = true;
      video.classList.add('tracking-video');
      video.addEventListener('ended', handleCameraEnded, { once: true });
      video.srcObject?.getVideoTracks?.()[0]?.addEventListener('ended', handleCameraEnded, { once: true });

      startRenderLoop(engine);
      setStatus('SCANNING', '0 / 6');
      setState('scanning');
    } catch (error) {
      if (thisSession !== sessionId) return;
      stopTrackingEngine();
      const [state, detail] = describeError(error);
      setState(state, detail);
    }
  }

  function exitCamera() {
    ++sessionId;
    recognizedTargets.clear();
    stopTrackingEngine();
    setState('ready');
  }

  startButton.addEventListener('click', startCamera);
  exitButton.addEventListener('click', exitCamera);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && CAMERA_STATES.has(currentState)) {
      ++sessionId;
      stopTrackingEngine();
      setState('ready', 'Camera paused when this page was hidden. Tap CAMERA START to resume.');
    }
  });

  window.addEventListener('pagehide', () => {
    ++sessionId;
    stopTrackingEngine();
  });

  setState('ready');
  Promise.all([loadModules(), loadConfig()]).catch(() => {
    // Both resources are retried from the explicit CAMERA START action.
  });
})();
