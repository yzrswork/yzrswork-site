(() => {
  'use strict';

  const app = document.getElementById('app');
  const cameraStage = document.querySelector('.camera-stage');
  const linkLayer = document.getElementById('linkLayer');
  const routeMap = document.getElementById('routeMap');
  const fourthRouteFlow = document.getElementById('fourthRouteFlow');
  const fourthRouteResponse = document.getElementById('fourthRouteResponse');
  const fourthRouteLabel = document.getElementById('fourthRouteLabel');
  const signalLost = document.getElementById('signalLost');
  const cameraNote = document.getElementById('cameraNote');
  const entryPanel = document.getElementById('entryPanel');
  const activeHeader = document.getElementById('activeHeader');
  const activeHeaderTitle = document.getElementById('activeHeaderTitle');
  const activePanel = document.getElementById('activePanel');
  const gameTitle = document.getElementById('gameTitle');
  const activeLinkState = document.getElementById('activeLinkState');
  const activeStateBadge = document.getElementById('activeStateBadge');
  const entryStateBadge = document.getElementById('entryStateBadge');
  const stateMessage = document.getElementById('stateMessage');
  const stateDetail = document.getElementById('stateDetail');
  const gameInstruction = document.getElementById('gameInstruction');
  const gameProgress = document.getElementById('gameProgress');
  const gameFeedback = document.getElementById('gameFeedback');
  const anomalyReadout = document.getElementById('anomalyReadout');
  const startButton = document.getElementById('startButton');
  const exitButton = document.getElementById('exitButton');
  const routeHitAreas = [...document.querySelectorAll('.route-hit-area')];
  const routePaths = [...document.querySelectorAll('[data-route-path]')];
  const routeFlows = [...document.querySelectorAll('[data-route-flow]')];
  const routeStatusRows = [...document.querySelectorAll('[data-route-status]')];

  const targetSource = './pdb-1-target.mind';
  const mindarSource = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';
  const css3dSource = 'three/addons/renderers/CSS3DRenderer.js';
  const LINK_HOLD_MS = 6500;
  const TARGET_ACQUIRED_MS = 900;
  const ROUTE_FLOW_MS = 1200;
  const NEXT_ROUTE_DELAY_MS = 420;
  const SYSTEM_PAUSE_MS = 1000;
  const FOURTH_RESPONSE_DELAY_MS = 650;
  const COMPLETE_RESET_MS = 20000;
  const CAMERA_STATES = new Set(['scanning', 'acquired', 'active', 'hold', 'lost', 'restored', 'fourth', 'complete']);
  const LINKED_STATES = new Set(['acquired', 'active', 'hold', 'restored', 'fourth', 'complete']);
  const TRACKED_STATES = new Set(['acquired', 'active', 'restored', 'fourth', 'complete']);

  const routeDefinitions = [
    { id: 'OUT-01', label: 'MO-1' },
    { id: 'OUT-02', label: 'IM-1' },
    { id: 'OUT-03', label: 'volt-1' },
  ];

  const routeStates = routeDefinitions.map((route) => ({ ...route, state: 'open' }));

  let currentState = 'ready';
  let gamePhase = 'idle';
  let activeRouteIndex = 0;
  let gameStarted = false;
  let targetIsTracked = false;
  let fourthStarted = false;
  let fourthResponsePlayed = false;
  let ackDisplay = null;
  let acquisitionTimer = null;
  let holdTimer = null;
  let lostTimer = null;
  let routeAnimationTimer = null;
  let nextRouteTimer = null;
  let routeStepTimers = [];
  let synchronizationTimer = null;
  let fourthStartTimer = null;
  let fourthTravelTimer = null;
  let fourthResponseTimer = null;
  let completeResetTimer = null;
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
      detail: 'PDB-1 image registered. Opening the route channel.',
    },
    active: {
      badge: 'ACTIVE',
      message: 'ACTIVE / ROUTE RESTORE',
      detail: '',
    },
    hold: {
      badge: 'HOLD',
      message: 'LINK HOLD / REACQUIRE',
      detail: 'Target signal paused. Completed routes remain held.',
    },
    restored: {
      badge: 'RESTORED',
      message: '3 / 3 / SYSTEM RESTORED',
      detail: '',
    },
    fourth: {
      badge: 'ROUTE 04',
      message: 'ROUTE 04 / DEST: —',
      detail: '',
    },
    complete: {
      badge: 'COMPLETE',
      message: 'LINK COMPLETE',
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
    linkLayer.style.pointerEvents = visible ? 'auto' : 'none';
  }

  function routeProgressLabel() {
    if (ackDisplay) return `${String(ackDisplay.index + 1).padStart(2, '0')} / 03`;
    if (activeRouteIndex >= routeDefinitions.length || ['restored', 'fourth', 'complete'].includes(currentState)) return '3 / 3';
    return `${String(activeRouteIndex + 1).padStart(2, '0')} / 03`;
  }

  function routeStateLabel(route) {
    if (route.state === 'ack') return 'LIVE';
    return route.state.toUpperCase();
  }

  function updateGamePanel() {
    const activeRoute = routeStates[activeRouteIndex];
    const hasResponse = fourthResponsePlayed;

    gameProgress.textContent = routeProgressLabel();

    if (currentState === 'acquired') {
      gameTitle.textContent = 'PDB-1 / LINKED';
      gameInstruction.textContent = 'LINK ESTABLISHED';
      gameFeedback.textContent = 'CHANNEL 05 / LOCAL';
    } else if (currentState === 'active' && gamePhase === 'routes' && ackDisplay) {
      gameTitle.textContent = 'PDB-1 / ROUTE RESTORE';
      gameInstruction.textContent = `ACK / ${ackDisplay.id}`;
      gameFeedback.textContent = `${ackDisplay.label} / LIVE`;
    } else if (currentState === 'active' && gamePhase === 'routes' && activeRoute) {
      gameTitle.textContent = 'PDB-1 / ROUTE RESTORE';
      gameInstruction.textContent = activeRoute.state === 'pulsing'
        ? `FLOW / ${activeRoute.id}`
        : `ACTIVATE ${activeRoute.id} / ${activeRoute.label}`;
      gameFeedback.textContent = activeRoute.state === 'pulsing'
        ? `→ FLOW / ${activeRoute.label}`
        : 'TOUCH ARMED OUTPUT';
    } else if (currentState === 'hold') {
      gameTitle.textContent = 'PDB-1 / LINK HOLD';
      gameInstruction.textContent = 'REACQUIRE / PROGRESS HELD';
      gameFeedback.textContent = 'ACK ROUTES PRESERVED';
    } else if (currentState === 'restored') {
      gameTitle.textContent = 'PDB-1 / RESTORED';
      gameInstruction.textContent = '3 / 3 / SYSTEM RESTORED';
      gameFeedback.textContent = 'CHANNEL QUIET / STANDBY';
    } else if (currentState === 'fourth') {
      gameTitle.textContent = 'PDB-1 / ROUTE 04';
      gameInstruction.textContent = hasResponse ? 'RSP-04 / RETURN' : 'ROUTE 04 / DEST: —';
      gameFeedback.textContent = hasResponse ? 'UNREGISTERED RESPONSE' : 'REMOTE PATH / UNRESOLVED';
    } else if (currentState === 'complete') {
      gameTitle.textContent = 'PDB-1 / COMPLETE';
      gameInstruction.textContent = 'RSP-04 / UNREGISTERED RESPONSE';
      gameFeedback.textContent = 'LINK REMAINS OPEN';
    } else {
      gameTitle.textContent = 'PDB-1 / LINKED';
      gameInstruction.textContent = 'RESTORE OUTPUTS';
      gameFeedback.textContent = 'TOUCH ARMED OUTPUT';
    }

    routeStatusRows.forEach((row, index) => {
      const route = routeStates[index];
      row.dataset.state = route.state;
      row.querySelector('[data-route-state]').textContent = routeStateLabel(route);
    });

    anomalyReadout.hidden = !hasResponse;
  }

  function updateRouteVisuals() {
    routeStates.forEach((route, index) => {
      const path = routePaths[index];
      const flow = routeFlows[index];
      const button = routeHitAreas[index];
      const isArmed = currentState === 'active'
        && gamePhase === 'routes'
        && activeRouteIndex === index
        && route.state === 'armed'
        && targetIsTracked;

      path.dataset.state = route.state;
      path.classList.toggle('is-active', route.state === 'pulsing');
      path.classList.toggle('is-ack', route.state === 'ack');
      flow.classList.toggle('is-running', route.state === 'pulsing' && targetIsTracked);
      flow.classList.toggle('is-ack', route.state === 'ack');

      button.classList.toggle('is-armed', isArmed);
      button.classList.toggle('is-pulsing', route.state === 'pulsing');
      button.classList.toggle('is-ack', route.state === 'ack');
      button.setAttribute('aria-disabled', String(!isArmed));
    });

    routeMap.classList.toggle('is-synchronized', currentState === 'restored' && targetIsTracked);
    routeMap.classList.toggle('is-fourth-active', fourthStarted && targetIsTracked);
    fourthRouteFlow.classList.toggle('is-visible', fourthStarted);
    fourthRouteFlow.classList.toggle('is-running', currentState === 'fourth' && !fourthResponsePlayed && targetIsTracked);
    fourthRouteFlow.classList.toggle('is-complete', fourthResponsePlayed);
    fourthRouteResponse.classList.toggle('is-visible', fourthResponsePlayed);
    fourthRouteLabel.classList.toggle('is-visible', fourthStarted);
  }

  function setState(nextState, detail = null) {
    currentState = nextState;
    const copy = stateCopy[nextState] || stateCopy.error;
    const isLinked = LINKED_STATES.has(nextState);
    const hasTrackedGeometry = targetIsTracked && TRACKED_STATES.has(nextState);
    const isCameraSession = CAMERA_STATES.has(nextState);
    const showEntry = ['ready', 'requesting', 'denied', 'error'].includes(nextState);
    const headerTitles = {
      acquired: 'PDB-1 / TARGET ACQUIRED',
      active: 'PDB-1 / ROUTE RESTORE',
      hold: 'PDB-1 / LINK HOLD',
      restored: 'PDB-1 / SYSTEM RESTORED',
      fourth: 'PDB-1 / ROUTE 04',
      complete: 'PDB-1 / LINK COMPLETE',
    };
    const cameraStatuses = {
      acquired: 'LIVE CAMERA / TARGET ACQUIRED',
      active: 'LIVE CAMERA / LINKED',
      hold: 'LIVE CAMERA / LINK HOLD',
      restored: 'LIVE CAMERA / SYSTEM RESTORED',
      fourth: 'LIVE CAMERA / ROUTE 04',
      complete: targetIsTracked ? 'LIVE CAMERA / COMPLETE' : 'LIVE CAMERA / LINK HOLD',
      lost: 'LIVE CAMERA / SIGNAL LOST',
    };
    const linkStatuses = {
      acquired: 'TARGET ACQUIRED',
      hold: 'LINK HOLD',
      restored: 'SYSTEM RESTORED',
      fourth: fourthResponsePlayed ? 'RESPONSE RECEIVED' : 'ROUTE 04 ACTIVE',
      complete: 'COMPLETE / LINKED',
    };

    app.dataset.state = nextState;
    entryStateBadge.textContent = copy.badge;
    activeStateBadge.textContent = copy.badge;
    stateMessage.textContent = copy.message;
    stateDetail.textContent = detail ?? copy.detail;
    activeHeaderTitle.textContent = headerTitles[nextState] || 'PDB-1 / IMAGE SEARCH';
    activeLinkState.textContent = linkStatuses[nextState] || 'LINK ESTABLISHED';
    cameraNote.textContent = cameraStatuses[nextState] || (isCameraSession ? 'LIVE CAMERA / SCANNING' : '');

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

    updateGamePanel();
    updateRouteVisuals();
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

  function clearRoutePulseTimers() {
    if (routeAnimationTimer) {
      window.clearTimeout(routeAnimationTimer);
      routeAnimationTimer = null;
    }
    if (nextRouteTimer) {
      window.clearTimeout(nextRouteTimer);
      nextRouteTimer = null;
    }
    routeStepTimers.forEach((timer) => window.clearTimeout(timer));
    routeStepTimers = [];
  }

  function clearFourthTimers() {
    if (synchronizationTimer) {
      window.clearTimeout(synchronizationTimer);
      synchronizationTimer = null;
    }
    if (fourthStartTimer) {
      window.clearTimeout(fourthStartTimer);
      fourthStartTimer = null;
    }
    if (fourthTravelTimer) {
      window.clearTimeout(fourthTravelTimer);
      fourthTravelTimer = null;
    }
    if (fourthResponseTimer) {
      window.clearTimeout(fourthResponseTimer);
      fourthResponseTimer = null;
    }
  }

  function clearCompleteResetTimer() {
    if (completeResetTimer) {
      window.clearTimeout(completeResetTimer);
      completeResetTimer = null;
    }
  }

  function clearGameTimers() {
    clearRoutePulseTimers();
    clearFourthTimers();
    clearCompleteResetTimer();
  }

  function clearLinkTimers() {
    clearAcquisitionTimer();
    clearHoldTimer();
    clearLostTimer();
  }

  function clearAllTimers() {
    clearLinkTimers();
    clearGameTimers();
  }

  function resetGame() {
    clearGameTimers();
    routeStates.forEach((route) => {
      route.state = 'open';
    });
    activeRouteIndex = 0;
    gamePhase = 'idle';
    gameStarted = false;
    targetIsTracked = false;
    fourthStarted = false;
    fourthResponsePlayed = false;
    ackDisplay = null;
    routeFlows.forEach((flow, index) => {
      flow.querySelector('span').textContent = index === 1 ? '← ← ← ←' : '→ → → →';
    });
    updateGamePanel();
    updateRouteVisuals();
    setTrackedOverlayVisible(false);
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

  function armActiveRoute() {
    if (!targetIsTracked || currentState !== 'active') return;
    if (activeRouteIndex >= routeStates.length) {
      startSystemRestore();
      return;
    }

    clearRoutePulseTimers();
    const route = routeStates[activeRouteIndex];
    if (route.state === 'pulsing') route.state = 'armed';
    route.state = 'armed';
    ackDisplay = null;
    gamePhase = 'routes';
    updateGamePanel();
    updateRouteVisuals();
  }

  function isReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function finishRoutePulse(index) {
    routeAnimationTimer = null;
    if (!targetIsTracked || currentState !== 'active') return;
    const route = routeStates[index];
    if (!route || route.state !== 'pulsing' || activeRouteIndex !== index) return;

    route.state = 'ack';
    activeRouteIndex = index + 1;
    routeFlows[index].querySelector('span').textContent = index === 1 ? '←' : '→';
    ackDisplay = { ...route, index };
    clearRoutePulseTimers();
    updateGamePanel();
    updateRouteVisuals();

    nextRouteTimer = window.setTimeout(() => {
      nextRouteTimer = null;
      ackDisplay = null;
      if (!targetIsTracked || currentState !== 'active') return;
      if (activeRouteIndex >= routeStates.length) {
        startSystemRestore();
      } else {
        armActiveRoute();
      }
    }, NEXT_ROUTE_DELAY_MS);
  }

  function startRoutePulse(index) {
    if (!targetIsTracked || currentState !== 'active' || gamePhase !== 'routes' || activeRouteIndex !== index) return;
    const route = routeStates[index];
    if (!route || route.state !== 'armed') return;

    clearRoutePulseTimers();
    route.state = 'pulsing';
    const flow = routeFlows[index];
    flow.querySelector('span').textContent = index === 1 ? '← ← ← ←' : '→ → → →';

    if (isReducedMotion()) {
      const progressiveSteps = index === 1 ? ['·', '←', '← ←', '← ← ←', '← ← ← ←'] : ['·', '→', '→ →', '→ → →', '→ → → →'];
      flow.querySelector('span').textContent = progressiveSteps[0];
      progressiveSteps.slice(1).forEach((step, stepIndex) => {
        routeStepTimers.push(window.setTimeout(() => {
          if (route.state === 'pulsing') flow.querySelector('span').textContent = step;
        }, stepIndex * 220));
      });
    }

    updateGamePanel();
    updateRouteVisuals();
    routeAnimationTimer = window.setTimeout(() => finishRoutePulse(index), ROUTE_FLOW_MS);
  }

  function nudgeActiveRoute() {
    const activeButton = routeHitAreas[activeRouteIndex];
    if (!activeButton) return;
    activeButton.classList.remove('is-nudge');
    void activeButton.offsetWidth;
    activeButton.classList.add('is-nudge');
    window.setTimeout(() => activeButton.classList.remove('is-nudge'), 280);
  }

  function handleRouteTap(event) {
    const index = Number(event.currentTarget.dataset.routeIndex);
    if (currentState !== 'active' || gamePhase !== 'routes' || !targetIsTracked) return;
    if (routeStates[index]?.state === 'pulsing') return;
    if (index !== activeRouteIndex || routeStates[index]?.state !== 'armed') {
      nudgeActiveRoute();
      return;
    }

    startRoutePulse(index);
  }

  function scheduleFourthRoute() {
    if (fourthStarted || fourthResponsePlayed || !targetIsTracked || currentState !== 'restored') return;
    if (fourthStartTimer) window.clearTimeout(fourthStartTimer);
    fourthStartTimer = window.setTimeout(() => {
      fourthStartTimer = null;
      beginFourthRoute();
    }, SYSTEM_PAUSE_MS);
  }

  function showFourthResponse() {
    fourthTravelTimer = null;
    if (!targetIsTracked || currentState !== 'fourth') return;
    fourthResponsePlayed = true;
    updateGamePanel();
    updateRouteVisuals();
    fourthResponseTimer = window.setTimeout(() => {
      fourthResponseTimer = null;
      finishComplete();
    }, FOURTH_RESPONSE_DELAY_MS);
  }

  function beginFourthRoute() {
    if (fourthResponsePlayed || !targetIsTracked) return;
    clearFourthTimers();
    fourthStarted = true;
    gamePhase = 'fourth';
    setState('fourth');
    fourthTravelTimer = window.setTimeout(showFourthResponse, ROUTE_FLOW_MS);
  }

  function finishComplete() {
    if (!targetIsTracked || !['fourth', 'complete'].includes(currentState)) return;
    clearFourthTimers();
    gamePhase = 'complete';
    setState('complete');
  }

  function startSystemRestore() {
    if (activeRouteIndex < routeStates.length || currentState !== 'active') return;
    clearRoutePulseTimers();
    gamePhase = 'restored';
    setState('restored');
    synchronizationTimer = window.setTimeout(() => {
      synchronizationTimer = null;
      routeMap.classList.remove('is-synchronized');
    }, 850);
    scheduleFourthRoute();
  }

  function resetPulsingRoute() {
    const route = routeStates[activeRouteIndex];
    if (route?.state === 'pulsing') route.state = 'armed';
    clearRoutePulseTimers();
    updateGamePanel();
    updateRouteVisuals();
  }

  function closeLostLink() {
    clearAcquisitionTimer();
    clearHoldTimer();
    clearLostTimer();
    resetPulsingRoute();
    if (currentState !== 'hold') return;
    setState('lost');
    lostTimer = window.setTimeout(() => {
      lostTimer = null;
      if (currentState === 'lost') setState('scanning');
    }, 1200);
  }

  function holdLinkAfterTargetLoss() {
    if (!['acquired', 'active', 'restored', 'fourth'].includes(currentState)) return;

    clearAcquisitionTimer();
    clearLostTimer();
    clearHoldTimer();
    resetPulsingRoute();
    clearFourthTimers();
    setState('hold');
    holdTimer = window.setTimeout(() => {
      holdTimer = null;
      closeLostLink();
    }, LINK_HOLD_MS);
  }

  function holdCompletedLinkAfterTargetLoss() {
    clearLostTimer();
    clearHoldTimer();
    clearFourthTimers();
    clearCompleteResetTimer();
    setState('complete');
    completeResetTimer = window.setTimeout(() => {
      completeResetTimer = null;
      if (currentState === 'complete' && !targetIsTracked) {
        resetGame();
        setState('scanning');
      }
    }, COMPLETE_RESET_MS);
  }

  function resumeAfterTargetFound() {
    clearHoldTimer();
    clearLostTimer();
    clearCompleteResetTimer();

    if (currentState === 'complete') {
      setState('complete');
      return;
    }

    if (gamePhase === 'fourth' && !fourthResponsePlayed) {
      beginFourthRoute();
      return;
    }

    if (gamePhase === 'fourth' && fourthResponsePlayed) {
      gamePhase = 'complete';
      setState('complete');
      return;
    }

    if (gamePhase === 'restored') {
      setState('restored');
      scheduleFourthRoute();
      return;
    }

    setState('active');
    armActiveRoute();
  }

  function handleTargetFound() {
    targetIsTracked = true;
    clearLostTimer();
    clearHoldTimer();
    clearCompleteResetTimer();

    if (currentState === 'complete') {
      setState('complete');
      return;
    }

    if (currentState === 'hold' || currentState === 'lost') {
      resumeAfterTargetFound();
      return;
    }

    if (currentState === 'scanning') {
      if (gameStarted) {
        resumeAfterTargetFound();
        return;
      }

      gameStarted = true;
      gamePhase = 'link';
      setState('acquired');
      acquisitionTimer = window.setTimeout(() => {
        acquisitionTimer = null;
        if (targetIsTracked && currentState === 'acquired') {
          setState('active');
          armActiveRoute();
        }
      }, TARGET_ACQUIRED_MS);
    }
  }

  function handleTargetLost() {
    targetIsTracked = false;
    setTrackedOverlayVisible(false);

    if (currentState === 'complete') {
      holdCompletedLinkAfterTargetLoss();
      return;
    }

    if (currentState === 'fourth' && fourthResponsePlayed) {
      gamePhase = 'complete';
      holdCompletedLinkAfterTargetLoss();
      return;
    }

    holdLinkAfterTargetLoss();
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
    engine.cssRenderer.domElement.setAttribute('aria-hidden', 'false');

    const anchor = engine.addCSSAnchor(0);
    anchor.group.add(new CSS3DObject(linkLayer));

    trackingEngine = engine;
    trackingAnchor = anchor;

    anchor.onTargetFound = () => {
      if (trackingEngine !== engine) return;
      handleTargetFound();
    };

    anchor.onTargetLost = () => {
      if (trackingEngine !== engine) return;
      handleTargetLost();
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
    clearAllTimers();
    targetIsTracked = false;
    setTrackedOverlayVisible(false);
    if (!engine) {
      trackingAnchor = null;
      return;
    }

    isStopping = true;
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

    ++sessionId;
    clearAllTimers();
    stopTrackingEngine();
    resetGame();
    setState('lost', 'The camera signal ended. Reopen CAMERA START to retry.');
    lostTimer = window.setTimeout(() => {
      lostTimer = null;
      if (currentState === 'lost') setState('ready');
    }, 1500);
  }

  function handleCameraEnded() {
    if (isStopping) return;
    showCameraLoss();
  }

  async function startCamera() {
    if (CAMERA_STATES.has(currentState) || currentState === 'requesting') return;

    ++sessionId;
    clearAllTimers();
    resetGame();
    const thisSession = sessionId;

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
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.classList.add('tracking-video');
      video.addEventListener('ended', handleCameraEnded, { once: true });
      const videoTrack = video.srcObject?.getVideoTracks?.()[0];
      videoTrack?.addEventListener('ended', handleCameraEnded, { once: true });
      startRenderLoop(engine);
    } catch (error) {
      if (thisSession !== sessionId) return;
      stopTrackingEngine();
      resetGame();
      const failure = describeCameraError(error);
      setState(failure.state, failure.detail);
    }
  }

  function exitCamera() {
    ++sessionId;
    clearAllTimers();
    stopTrackingEngine();
    resetGame();
    setState('ready');
  }

  routeHitAreas.forEach((button) => {
    button.addEventListener('click', handleRouteTap);
  });

  startButton.addEventListener('click', startCamera);
  exitButton.addEventListener('click', exitCamera);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && CAMERA_STATES.has(currentState)) {
      ++sessionId;
      clearAllTimers();
      stopTrackingEngine();
      resetGame();
      setState('ready', 'Camera paused when this page was hidden. Tap CAMERA START to resume.');
    }
  });

  window.addEventListener('pagehide', () => {
    ++sessionId;
    clearAllTimers();
    stopTrackingEngine();
  });

  resetGame();
  setState('ready');
  loadTrackingModules().catch(() => {
    // Loading is retried through the explicit CAMERA START action.
  });
})();
