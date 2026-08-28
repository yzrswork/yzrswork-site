(() => {
  'use strict';

  const sectors = [
    {
      id: 'power',
      title: 'POWER',
      question: '一般的な1.5V乾電池1本の両端を、乾いた指で触ると、普通は感電する。',
      correct: false,
      explanation: '通常、乾いた皮膚には電圧が低すぎて、感電として感じるほどの電流は流れません。',
      vaultNote: '低電圧でも、ショート・発熱・破損は別件です。',
      traversal: 'door',
      traversalCode: 'BULKHEAD RELEASE',
      traversalLabel: '防火扉が業務を思い出しました',
      status: '第1配電層 / 指先による点検は非推奨',
    },
    {
      id: 'cable',
      title: 'CABLE',
      question: 'USB-Cケーブルは、端子の形が同じなら性能も同じである。',
      correct: false,
      explanation: '対応する充電電力・通信速度・映像出力は、ケーブルごとに異なります。',
      vaultNote: '端子が同じだからといって、中身まで仲良しとは限りません。',
      traversal: 'lift',
      traversalCode: 'FREIGHT LIFT / DOWN',
      traversalLabel: '書類上は3階分、下降します',
      status: '幹線層 / 同じ顔のケーブルが多数勤務中',
    },
    {
      id: 'audio',
      title: 'AUDIO',
      question: '3.5mmジャックに端子が3本あれば、必ずステレオである。',
      correct: false,
      explanation: 'モノラル信号用の2端子に、プラグ連動スイッチ用の接点を加えた3端子ジャックもあります。',
      vaultNote: '見た目だけで配線すると、そこそこ楽しい事故が起きます。',
      traversal: 'stairs',
      traversalCode: 'SERVICE STAIR / UP',
      traversalLabel: '下層へ行くため上階を経由します',
      status: '音響層 / 左右とは限らない3端子',
    },
    {
      id: 'current',
      title: 'CURRENT',
      question: '電圧を測るとき、テスターは測りたい部分に並列につなぐ。',
      correct: true,
      explanation: '電圧は2点間の差を測るため、測りたい部分の両端へ並列につなぎます。',
      vaultNote: '測定モードとレンジの確認は、接続より先に処理されます。たぶん。',
      traversal: 'machinery',
      traversalCode: 'SERVICE PATH CLEAR',
      traversalLabel: '作業機械が少しだけ道を譲ります',
      status: '計測層 / 並列経路を確認',
    },
    {
      id: 'bench',
      title: 'BENCH',
      question: '部品単体の一般的なLEDは、5V電源へ直接つないでも問題ない。',
      correct: false,
      explanation: '裸の一般的なLEDには、抵抗などで電流を制限する必要があります。抵抗内蔵品やLEDモジュールは別です。',
      vaultNote: '一瞬とても明るくなる現象は、正常動作に含めません。',
      traversal: 'lights',
      traversalCode: 'BENCH LINE ACTIVE',
      traversalLabel: '照明が奥から順番に納得しました',
      status: '工作層 / 抵抗箱は机の2段目',
    },
    {
      id: 'safety',
      title: 'SAFETY',
      question: 'テスターの導通チェックは、基本的に回路の電源を入れたまま使う。',
      correct: false,
      explanation: '導通・抵抗測定は、原則として回路を無通電にし、残留電荷にも注意して行います。',
      vaultNote: '測る側からも小さな電気を出しています。外部電源との会議は不要です。',
      traversal: 'shutter',
      traversalCode: 'ISOLATION SHUTTER',
      traversalLabel: '無通電を確認したことにして開放します',
      status: '保全層 / 回路隔離を記録',
    },
    {
      id: 'rule',
      title: 'RULE',
      question: 'ヒューズが何度も切れる場合、もっと大きな容量へ交換すれば解決する。',
      correct: false,
      explanation: '繰り返し切れるなら、過電流を起こす故障や条件を調べるのが先です。指定容量を勝手に上げると保護できません。',
      vaultNote: '警報を止めても、火事は消えません。',
      traversal: 'bridge',
      traversalCode: 'OVERHEAD PASSAGE',
      traversalLabel: '規定容量の橋をそのまま渡ります',
      status: '規定層 / 保護装置は抗議を継続中',
    },
    {
      id: 'review',
      title: 'REVIEW',
      question: '同じサイズのDC丸型プラグなら、別のACアダプターでも基本的に使える。',
      correct: false,
      explanation: 'プラグ径だけでなく、電圧・極性が一致し、アダプターの電流供給能力が機器の必要量以上か確認します。',
      vaultNote: '刺さることと、使えることは、別の申請です。',
      traversal: 'racks',
      traversalCode: 'RECORD RACK BYPASS',
      traversalLabel: '一致しない台帳が左右へ退避します',
      status: '照合層 / プラグ外形だけ一致',
    },
    {
      id: 'memory',
      title: 'MEMORY',
      question: '機械の電源を切っていても、中に入れっぱなしの乾電池が液漏れすることはある。',
      correct: true,
      explanation: '長期放置や過放電、劣化などで、機器がOFFでも液漏れすることがあります。',
      vaultNote: '使わない機器の電池は、記憶より先に取り出します。',
      traversal: 'tunnel',
      traversalCode: 'MEMORY TUNNEL',
      traversalLabel: '保管年数の長い区画を通過します',
      status: '保管層 / 撤去予定の電池を保管中',
    },
    {
      id: 'archive',
      title: 'ARCHIVE',
      question: '測定可能な低電圧機器の電源が入らないとき、電源入力部に想定どおりの電圧が来ているか確認するのは、有効な初期切り分けである。',
      correct: true,
      explanation: '機器が必要とする電源が入口まで届いているかを確認すると、電源側と機器内部を早い段階で切り分けられます。',
      vaultNote: '犯人を探す前に、まず現場に電気が来ているか確認します。',
      traversal: 'core',
      traversalCode: 'CORE ACCESS',
      traversalLabel: '最終台帳の奥に、まだ部屋があります',
      status: '中央記録層 / 現物優先で運用中',
    },
  ];

  const vault = document.getElementById('vault');
  const world = vault.querySelector('.world');
  const introPanel = document.getElementById('introPanel');
  const questionPanel = document.getElementById('questionPanel');
  const resultPanel = document.getElementById('resultPanel');
  const startButton = document.getElementById('startButton');
  const restartButton = document.getElementById('restartButton');
  const progressDock = document.getElementById('progressDock');
  const continueButton = document.getElementById('continueButton');
  const traversalButton = document.getElementById('traversalButton');
  const sectorCount = document.getElementById('sectorCount');
  const sectorCode = document.getElementById('sectorCode');
  const sectorTitle = document.getElementById('sectorTitle');
  const questionText = document.getElementById('questionText');
  const feedback = document.getElementById('feedback');
  const judgement = document.getElementById('judgement');
  const explanation = document.getElementById('explanation');
  const vaultNote = document.getElementById('vaultNote');
  const visualSector = document.getElementById('visualSector');
  const worldStatus = document.getElementById('worldStatus');
  const depthFill = document.getElementById('depthFill');
  const traversalCode = document.getElementById('traversalCode');
  const traversalLabel = document.getElementById('traversalLabel');
  const scoreValue = document.getElementById('scoreValue');
  const answerButtons = [...document.querySelectorAll('[data-answer]')];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TRAVERSAL_MS = prefersReducedMotion ? 420 : 1150;

  let phase = 'intro';
  let sectorIndex = 0;
  let score = 0;
  let inputLocked = false;
  let traversalReady = false;
  let session = 0;
  let timers = [];

  function schedule(callback, delay, activeSession = session) {
    const timer = window.setTimeout(() => {
      timers = timers.filter((item) => item !== timer);
      if (activeSession === session) callback();
    }, delay);
    timers.push(timer);
    return timer;
  }

  function clearTimers() {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
  }

  function setTraversalReady(ready) {
    traversalReady = ready;
    vault.dataset.traversalReady = String(ready);
    const available = ready && phase === 'traversing';
    traversalButton.hidden = !available;
    traversalButton.disabled = !available;
    if (available) inputLocked = false;
  }

  function setPhase(nextPhase) {
    phase = nextPhase;
    vault.dataset.phase = nextPhase;
    document.body.classList.toggle('vault-traversing', nextPhase === 'traversing');
    progressDock.hidden = nextPhase !== 'answered';
    if (nextPhase !== 'traversing') {
      setTraversalReady(false);
    } else {
      traversalButton.hidden = !traversalReady;
      traversalButton.disabled = !traversalReady;
    }
  }

  function showOnly(panel) {
    [introPanel, questionPanel, resultPanel].forEach((candidate) => {
      candidate.hidden = candidate !== panel;
    });
  }

  function setAnswerButtonsEnabled(enabled) {
    answerButtons.forEach((button) => {
      button.disabled = !enabled;
      if (enabled) button.removeAttribute('aria-pressed');
    });
  }

  function revealPanelOnMobile(panel) {
    if (!window.matchMedia('(max-width: 759px)').matches || typeof panel.scrollIntoView !== 'function') return;
    const requestFrame = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
    requestFrame(() => panel.scrollIntoView({ behavior: 'auto', block: 'start' }));
  }

  function setTraversalDestination(destinationIndex) {
    const destination = sectors[destinationIndex];
    if (destination) {
      const destinationNumber = String(destinationIndex + 1).padStart(2, '0');
      traversalCode.textContent = `SECTOR ${destinationNumber} — ${destination.title}`;
      visualSector.textContent = `${destinationNumber} ${destination.title}`;
      worldStatus.textContent = destination.status;
      depthFill.style.height = `${Math.max(8, (destinationIndex + 1) * 8.5)}%`;
      return;
    }

    traversalCode.textContent = 'VAULT CORE';
    visualSector.textContent = 'VAULT CORE';
    worldStatus.textContent = '最深部 / VAULT COREへ進行中';
    depthFill.style.height = '100%';
  }

  function renderSector() {
    const sector = sectors[sectorIndex];
    setPhase('question');
    setTraversalReady(false);
    inputLocked = false;
    vault.dataset.sector = String(sectorIndex + 1);
    vault.dataset.traversal = 'none';
    vault.dataset.reaction = 'none';
    sectorCount.textContent = `${String(sectorIndex + 1).padStart(2, '0')} / 10`;
    sectorCode.textContent = `SECTOR ${String(sectorIndex + 1).padStart(2, '0')} / 10`;
    sectorTitle.textContent = sector.title;
    questionText.textContent = sector.question;
    visualSector.textContent = `${String(sectorIndex + 1).padStart(2, '0')} ${sector.title}`;
    worldStatus.textContent = sector.status;
    depthFill.style.height = `${Math.max(8, (sectorIndex + 1) * 8.5)}%`;
    continueButton.disabled = false;
    feedback.hidden = true;
    setAnswerButtonsEnabled(true);
    showOnly(questionPanel);
  }

  function startGame() {
    if (phase !== 'intro' || inputLocked) return;
    inputLocked = true;
    score = 0;
    sectorIndex = 0;
    renderSector();
    world.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  function answerQuestion(event) {
    if (phase !== 'question' || inputLocked) return;
    inputLocked = true;

    const selectedButton = event.currentTarget;
    const selected = selectedButton.dataset.answer === 'true';
    const sector = sectors[sectorIndex];
    const isCorrect = selected === sector.correct;

    if (isCorrect) score += 1;
    setPhase('answered');
    vault.dataset.reaction = isCorrect ? 'route' : 'mismatch';
    setAnswerButtonsEnabled(false);
    selectedButton.setAttribute('aria-pressed', 'true');

    judgement.textContent = isCorrect ? '判定：一致' : '判定：差異あり';
    explanation.textContent = sector.explanation;
    vaultNote.textContent = sector.vaultNote;
    continueButton.textContent = sectorIndex === sectors.length - 1 ? '最深部へ' : '次の区画へ';
    feedback.hidden = false;
    revealPanelOnMobile(feedback);
    inputLocked = false;
  }

  function continueDeeper() {
    if (phase !== 'answered' || inputLocked) return;
    inputLocked = true;
    const sector = sectors[sectorIndex];
    const currentSession = session;

    setPhase('traversing');
    setTraversalReady(false);
    vault.dataset.traversal = sector.traversal;
    setTraversalDestination(sectorIndex + 1);
    traversalLabel.textContent = sector.traversalLabel;
    traversalButton.textContent = sectorIndex === sectors.length - 1 ? '点検を完了する' : '区画へ進む';
    continueButton.disabled = true;

    schedule(() => {
      setTraversalReady(true);
    }, TRAVERSAL_MS, currentSession);
  }

  function advanceAfterTraversal() {
    if (phase !== 'traversing' || !traversalReady || inputLocked) return;
    inputLocked = true;
    setTraversalReady(false);
    if (sectorIndex < sectors.length - 1) {
      sectorIndex += 1;
      renderSector();
      revealPanelOnMobile(questionPanel);
    } else {
      showResult();
    }
  }

  function showResult() {
    if (phase !== 'traversing' || !inputLocked) return;
    inputLocked = true;
    setPhase('result');
    sectorCount.textContent = 'COMPLETE';
    scoreValue.textContent = String(score);
    showOnly(resultPanel);
    revealPanelOnMobile(resultPanel);
    inputLocked = false;
  }

  function restartGame() {
    if (phase !== 'result' || inputLocked) return;
    inputLocked = true;
    session += 1;
    clearTimers();
    setTraversalReady(false);
    score = 0;
    sectorIndex = 0;
    vault.dataset.sector = '0';
    vault.dataset.traversal = 'none';
    vault.dataset.reaction = 'none';
    visualSector.textContent = 'ACCESS GATE';
    worldStatus.textContent = '稼働状況：だいたい正常';
    depthFill.style.height = '5%';
    sectorCount.textContent = 'ENTRY';
    setPhase('intro');
    showOnly(introPanel);
    world.scrollIntoView({ behavior: 'auto', block: 'start' });
    inputLocked = false;
  }

  startButton.addEventListener('click', startGame);
  answerButtons.forEach((button) => button.addEventListener('click', answerQuestion));
  continueButton.addEventListener('click', continueDeeper);
  traversalButton.addEventListener('click', advanceAfterTraversal);
  restartButton.addEventListener('click', restartGame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden || phase !== 'traversing') return;
    // Safari may suspend the traversal timer while the tab is hidden. Its state
    // remains locked, so returning to the tab cannot skip more than one sector.
  });
})();
