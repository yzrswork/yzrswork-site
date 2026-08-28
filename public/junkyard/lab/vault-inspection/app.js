(() => {
  'use strict';

  const sectors = [
    {
      id: 'power',
      title: 'POWER',
      vaultTitle: 'OBSIDIAN',
      question: '一般的な1.5V乾電池1本の両端を、乾いた指で触ると、普通は感電する。',
      correct: false,
      explanation: '通常、乾いた皮膚には電圧が低すぎて、感電として感じるほどの電流は流れません。',
      vaultNote: '低電圧でも、ショート・発熱・破損は別件です。',
      traversal: 'door',
      traversalCode: 'BULKHEAD RELEASE',
      traversalLabel: '効率化したら、整理する仕組みが欲しくなります。',
      status: '第1配電層 / 指先による点検は非推奨',
    },
    {
      id: 'cable',
      title: 'CABLE',
      vaultTitle: 'GITHUB',
      question: 'USB-Cケーブルは、端子の形が同じなら性能も同じである。',
      correct: false,
      explanation: '対応する充電電力・通信速度・映像出力は、ケーブルごとに異なります。',
      vaultNote: '端子が同じだからといって、中身まで仲良しとは限りません。',
      traversal: 'lift',
      traversalCode: 'FREIGHT LIFT / DOWN',
      traversalLabel: 'バックアップのつもりでした。現在は、変更するたびに審査が入ります。',
      status: '幹線層 / 同じ顔のケーブルが多数勤務中',
    },
    {
      id: 'audio',
      title: 'AUDIO',
      vaultTitle: 'note',
      question: '3.5mmジャックに端子が3本あれば、必ずステレオである。',
      correct: false,
      explanation: 'モノラル信号用の2端子に、プラグ連動スイッチ用の接点を加えた3端子ジャックもあります。',
      vaultNote: '見た目だけで配線すると、あとあともう一度全バラが待ってます。',
      traversal: 'stairs',
      traversalCode: 'SERVICE STAIR / UP',
      traversalLabel: '作業記録を書き始めました。気づけば、週刊誌になっています。',
      status: '音響層 / 左右とは限らない3端子',
    },
    {
      id: 'current',
      title: 'CURRENT',
      vaultTitle: 'CLOUDFLARE',
      question: '電圧を測るとき、テスターは測りたい部分に並列につなぐ。',
      correct: true,
      explanation: '電圧は2点間の差を測るため、測りたい部分の両端へ並列につなぎます。',
      vaultNote: '直列と並列は常に迷いがち。テスターマスターへの道のりは遠いです。',
      traversal: 'machinery',
      traversalCode: 'SERVICE PATH CLEAR',
      traversalLabel: '工務店の受付を頼んだはずが、地下に管制塔が設置されています。',
      status: '計測層 / 並列経路を確認',
    },
    {
      id: 'bench',
      title: 'BENCH',
      vaultTitle: 'CLAUDE → CHATGPT',
      question: '一般的なLEDは、5V電源へ直接つないでも問題ない。',
      correct: false,
      explanation: '裸の一般的なLEDには、抵抗などで電流を制限する必要があります。抵抗内蔵品やLEDモジュールは別です。',
      vaultNote: '一瞬とても明るくなる現象は、正常動作に含めません。',
      traversal: 'lights',
      traversalCode: 'BENCH LINE ACTIVE',
      traversalLabel: '担当者を交代しました。引継書だけは、順調に巨大化しています。',
      status: '工作層 / 抵抗箱は机の2段目',
    },
    {
      id: 'safety',
      title: 'SAFETY',
      vaultTitle: 'CHATGPT',
      question: 'テスターの導通チェックは、基本的に回路の電源を入れたまま使う。',
      correct: false,
      explanation: '導通・抵抗測定は、原則として回路を無通電にし、残留電荷にも注意して行います。',
      vaultNote: '測る側からも小さな電気を出しています。外部電源との会議は不要です。',
      traversal: 'shutter',
      traversalCode: 'ISOLATION SHUTTER',
      traversalLabel: '仕事を減らすために導入しました。空いた時間には、新しい仕事を思いついています。',
      status: '保全層 / 回路隔離を記録',
    },
    {
      id: 'rule',
      title: 'RULE',
      vaultTitle: 'SKILLS',
      question: 'ヒューズが何度も切れる場合、もっと大きな容量へ交換すれば解決する。',
      correct: false,
      explanation: '繰り返し切れるなら、過電流を起こす故障や条件を調べるのが先です。指定容量を勝手に上げると保護できません。',
      vaultNote: 'ヒューズが切れるときは、回路がキレ散らかしてます。危険。',
      traversal: 'bridge',
      traversalCode: 'OVERHEAD PASSAGE',
      traversalLabel: 'その結果、管理するための仕事が増えています。',
      status: '規定層 / 保護装置は抗議を継続中',
    },
    {
      id: 'review',
      title: 'REVIEW',
      vaultTitle: 'HOOKS',
      question: '同じサイズのDCプラグなら、別のACアダプターでも使える。',
      correct: false,
      explanation: 'プラグ径だけでなく、電圧・極性が一致し、アダプターの電流供給能力が機器の必要量以上か確認します。',
      vaultNote: '何V・プラマイ記号・必要な電流は、よく見ましょう。間違えると、普通に部品を焼きます。',
      traversal: 'racks',
      traversalCode: 'RECORD RACK BYPASS',
      traversalLabel: '自動化を見張るために、自動化を追加しました。',
      status: '照合層 / プラグ外形だけ一致',
    },
    {
      id: 'memory',
      title: 'MEMORY',
      vaultTitle: 'WRAPPER',
      question: '機械の電源を切っていても、中に入れっぱなしの乾電池が液漏れすることはある。',
      correct: true,
      explanation: '長期放置や過放電、劣化などで、機器がOFFでも液漏れすることがあります。',
      vaultNote: 'だいたいのジャンクは、液漏れでジャンク。基板がセーフならラッキージャンク。',
      traversal: 'tunnel',
      traversalCode: 'MEMORY TUNNEL',
      traversalLabel: '表面はボタン1個です。地下には巨大施設があります。',
      status: '保管層 / 撤去予定の電池を保管中',
    },
    {
      id: 'archive',
      title: 'CHARGE',
      vaultTitle: 'OBSIDIAN VAULT',
      question: '電子機器は電源を切れば、内部に電気が残っていることはない。',
      correct: false,
      explanation: '電源を切っても、コンデンサなどに電気が残ることがあります。特に100V系の機器は、プラグを抜いてもすぐ安全とは限りません。',
      vaultNote: 'コンセントを抜いた。よし、早速分解だ。……とは限りません。分解前は、放電を待って機械に残った電圧も確認しましょう。大変危険です。',
      traversal: 'core',
      traversalCode: 'CORE ACCESS',
      traversalLabel: '最初はメモ帳でした。現在は、九龍城ばりに改築されています。',
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
      traversalCode.textContent = `SECTOR ${destinationNumber} — ${destination.vaultTitle}`;
      visualSector.textContent = `${destinationNumber} ${destination.vaultTitle}`;
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
    visualSector.textContent = `${String(sectorIndex + 1).padStart(2, '0')} ${sector.vaultTitle}`;
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
    setTraversalDestination(sectorIndex);
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
