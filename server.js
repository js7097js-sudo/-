const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const RELIGIONS = [
  { id: 'christianity', name: '크리스트교', symbol: '✝️', color: '#8b5cf6', origin: '바티칸·이탈리아' },
  { id: 'islam', name: '이슬람교', symbol: '☪️', color: '#10b981', origin: '사우디아라비아' },
  { id: 'buddhism', name: '불교', symbol: '☸️', color: '#f59e0b', origin: '태국' },
  { id: 'hinduism', name: '힌두교', symbol: '🕉️', color: '#ea580c', origin: '인도' }
];

// 세계 교과서 지도 기반 11개 주요 국가 데이터
const REGIONS = {
  '바티칸·이탈리아': {
    name: '바티칸·이탈리아',
    type: 'pure',
    preferred: '크리스트교',
    artType: 'cathedral',
    desc: '로마 가톨릭의 총본산으로 성 베드로 대성당이 있는 크리스트교의 중심지입니다.',
    goodEvents: [
      { text: '🏛️ 바티칸 성 베드로 대성당 완공! 전 세계 순례자가 몰려옵니다.', score: 25 },
      { text: '📜 로마 공인 칙령 발표! 유럽 전역으로 선교가 공식화됩니다.', score: 25 }
    ]
  },
  '사우디아라비아': {
    name: '사우디아라비아',
    type: 'pure',
    preferred: '이슬람교',
    artType: 'mosque',
    desc: '예언자 무함마드가 창시하고 성지 카바 신전이 있는 이슬람교의 성지입니다.',
    goodEvents: [
      { text: '🕌 정기 순례(하즈) 대성황! 전 세계 무슬림들이 메카에 모여듭니다.', score: 30 },
      { text: '🐪 대상(카라반) 무역로를 따라 오아시스 도시마다 모스크가 건립됩니다.', score: 20 }
    ]
  },
  '인도': {
    name: '인도',
    type: 'pure',
    preferred: '힌두교',
    artType: 'hindu_temple',
    desc: '갠지스강을 어머니로 모시며 카스트와 환생, 사원 의례를 지닌 힌두 문화의 모태입니다.',
    goodEvents: [
      { text: '🎆 바라나시 갠지스강 쿰브 멜라 축제 대성황! 수천만 명이 성수로 정화합니다.', score: 30 },
      { text: '🛕 정교한 석조 힌두 사원들이 번영하며 신앙의 정점을 이룹니다.', score: 25 }
    ]
  },
  '태국': {
    name: '태국',
    type: 'pure',
    preferred: '불교',
    artType: 'buddhist_temple',
    desc: '상좌부 불교가 국교 수준으로 깊게 정착하여 승려와 사원이 존경받는 국가입니다.',
    goodEvents: [
      { text: '🏯 방콕 왓 프라깨우 등 황금빛 사찰들이 왕실과 백성의 기도를 받습니다.', score: 25 },
      { text: '🧘 청년들의 단기 출가 문화가 확산되며 불교의 가르침이 대물림됩니다.', score: 20 }
    ]
  },
  '미국': {
    name: '미국',
    type: 'pure',
    preferred: '크리스트교',
    artType: 'church',
    desc: '청교도 이주 이후 다양한 기독교 종파가 발달한 아메리카 대륙의 거점입니다.',
    goodEvents: [
      { text: '🚢 메이플라워호 이주민들이 자유로운 개신교 공동체를 세웁니다.', score: 25 },
      { text: '🔔 대형 선교 집회와 자원봉사 운동이 사회 전반에 번져나갑니다.', score: 20 }
    ]
  },
  '브라질': {
    name: '브라질',
    type: 'pure',
    preferred: '크리스트교',
    artType: 'christ_statue',
    desc: '세계 최대의 가톨릭 신자 수를 가진 라틴아메리카의 핵심 국가입니다.',
    goodEvents: [
      { text: '🗽 코르코바두 산의 구속주 예수상 아래 수많은 인파가 미사를 드립니다.', score: 30 },
      { text: '🎶 삼바와 활기찬 카니발 속에서도 가톨릭 축일 의례가 성대하게 거행됩니다.', score: 20 }
    ]
  },
  '이집트': {
    name: '이집트',
    type: 'pure',
    preferred: '이슬람교',
    artType: 'al_azhar',
    desc: '지중해와 아프리카를 잇는 통로로 카이로 알아즈하르 등 이슬람 학문의 중심입니다.',
    goodEvents: [
      { text: '🏛️ 알아즈하르 모스크 대학에서 저명한 이슬람 학자들이 배출됩니다.', score: 25 },
      { text: '🏜️ 사하라 사막 무역로를 통해 대상들이 이슬람 교리를 안전하게 넓힙니다.', score: 20 }
    ]
  },
  // 다종교 공존·종합 국가들
  '한국': {
    name: '한국',
    type: 'hybrid',
    artType: 'korea_multifaith',
    desc: '불교, 개신교, 가톨릭, 유교가 서로 충돌 없이 조화를 이루는 모범적 다종교 사회입니다.',
    goodEvents: [
      { text: '🤝 종교 평화 협의회가 구성되어 종교 간 화합과 포용의 가치를 선언합니다!', score: 30 },
      { text: '📜 유네스코 세계유산 산사와 도심 성당·교회가 나란히 문화재로 사랑받습니다.', score: 25 },
      { text: '🌍 글로벌 K-컬처 팬들이 한국의 다양한 종교 건축물 순례를 즐깁니다.', score: 20 }
    ]
  },
  '인도네시아': {
    name: '인도네시아',
    type: 'hybrid',
    artType: 'indonesia_multifaith',
    desc: '세계 최대 무슬림 인구국이면서도 발리섬의 힌두교와 보로부두르 불교 유적이 함께 숨 쉽니다.',
    goodEvents: [
      { text: '⛵ 인도양 향신료 무역로를 통해 평화적으로 수용된 이슬람 공동체가 번영합니다.', score: 25 },
      { text: '🛕 세계 최대 불교 유적인 보로부두르 사원에 각국 순례자들의 발길이 이어집니다.', score: 25 },
      { text: '🌺 발리섬의 독특한 힌두 문화 의식이 세계인들의 찬사를 받습니다.', score: 20 }
    ]
  },
  '싱가포르': {
    name: '싱가포르',
    type: 'hybrid',
    artType: 'singapore_multifaith',
    desc: '차이나타운과 리틀인디아, 아랍스트리트가 이웃하며 모든 종교 휴일을 함께 축하합니다.',
    goodEvents: [
      { text: '🕌 한 거리 안에 교회, 모스크, 불교 사원, 힌두 사원이 나란히 축제를 엽니다!', score: 30 },
      { text: '🤝 다민족·다종교 조화법을 통해 종교 간 존중과 포용이 극대화됩니다.', score: 25 }
    ]
  },
  '나이지리아': {
    name: '나이지리아',
    type: 'hybrid',
    artType: 'nigeria_multifaith',
    desc: '북부의 이슬람교와 남부의 크리스트교가 대등하게 양립하며 아프리카의 중심축을 이룹니다.',
    goodEvents: [
      { text: '🎶 토착 리듬과 융합된 열정적인 기독교 가스펠 예배가 대성황을 이룹니다.', score: 25 },
      { text: '🕌 사하라 이남 대상 무역로를 통해 북부 이슬람 에미리트가 번성합니다.', score: 25 }
    ]
  }
};

// 돌발 위기 및 특별 상호작용 사건
const BAD_DISASTERS = [
  { text: '🌊 대양을 건너던 전파선이 거센 폭풍우를 만나 암초에 부딪혔습니다! 선교 물자 손실', score: -15 },
  { text: '🌪️ 사막을 횡단하던 대상(카라반)이 거대한 모래폭풍(하둡)에 갇혀 일시 고립되었습니다.', score: -15 },
  { text: '⚔️ 인접 지역의 영토 분쟁 및 외세 침입으로 무역로와 국경이 봉쇄되었습니다.', score: -10 },
  { text: '📜 보수적 현지 관료들의 외국 종교 배척령으로 포교 활동이 일시 중단됩니다.', score: -10 }
];

const SPECIAL_INTERACTION_EVENTS = [
  { text: '🌍 [특별 상호작용!] 현대 글로벌 문화 교류로 현지 청년들의 종교적 호기심 폭발!', score: 25 },
  { text: '🤝 [특별 상호작용!] 국제 평화 무역 박람회에서 현지인들과 감동적인 문화 대화를 나누었습니다.', score: 20 },
  { text: '📖 [특별 상호작용!] 번역된 종교 서적이 현지 지식인들에게 신선한 영감을 주었습니다.', score: 15 }
];

let players = [];
let currentTurnIndex = 0;
let gameStarted = false;
let soloMode = false;

let mapOwnership = {
  '바티칸·이탈리아': '크리스트교',
  '사우디아라비아': '이슬람교',
  '인도': '힌두교',
  '태국': '불교',
  '한국': null,
  '인도네시아': null,
  '싱가포르': null,
  '나이지리아': null,
  '미국': null,
  '브라질': null,
  '이집트': null
};

let religionStates = {
  '크리스트교': { score: 60, regions: ['바티칸·이탈리아'], ownerId: null },
  '이슬람교': { score: 60, regions: ['사우디아라비아'], ownerId: null },
  '불교': { score: 60, regions: ['태국'], ownerId: null },
  '힌두교': { score: 60, regions: ['인도'], ownerId: null }
};

const turnOrder = ['크리스트교', '이슬람교', '불교', '힌두교'];

io.on('connection', (socket) => {
  socket.emit('initSync', {
    players,
    hostId: players.length > 0 ? players[0].id : null,
    gameStarted,
    mapOwnership,
    religionStates,
    currentReligion: turnOrder[currentTurnIndex],
    soloMode
  });

  socket.on('joinGame', (name) => {
    if (players.length >= 4 || gameStarted) {
      socket.emit('errorMsg', '이미 정원이 찼거나 게임이 진행 중입니다.');
      return;
    }
    const pName = (name && name.trim()) ? name.trim() : `참가자 ${players.length + 1}`;
    players.push({ id: socket.id, name: pName, religion: null });

    io.emit('updateLobby', {
      players,
      hostId: players[0].id,
      gameStarted
    });
  });

  socket.on('startGame', () => {
    if (players.length === 0 || socket.id !== players[0].id) return;
    gameStarted = true;
    soloMode = (players.length === 1);

    if (soloMode) {
      players[0].religion = 'ALL';
      turnOrder.forEach(r => religionStates[r].ownerId = players[0].id);
    } else {
      const shuffled = [...turnOrder].sort(() => Math.random() - 0.5);
      players.forEach((p, idx) => {
        p.religion = shuffled[idx];
        religionStates[p.religion].ownerId = p.id;
      });
    }

    currentTurnIndex = 0;
    io.emit('gameStarted', {
      players,
      soloMode,
      mapOwnership,
      religionStates,
      currentReligion: turnOrder[currentTurnIndex]
    });
  });

  socket.on('spreadReligion', ({ regionKey, method }) => {
    if (!gameStarted) return;
    const activeReligion = turnOrder[currentTurnIndex];
    const rState = religionStates[activeReligion];

    if (!soloMode && rState.ownerId !== socket.id) {
      socket.emit('errorMsg', '지금은 본인 종교의 턴이 아닙니다.');
      return;
    }

    const region = REGIONS[regionKey];
    if (!region) return;

    let isMatched = false;
    let baseScore = 15;
    let methodBonus = (method === '장거리') ? 15 : 10;
    let chosenEvent = null;

    if (region.type === 'hybrid') {
      isMatched = true;
      baseScore = 30;
      chosenEvent = region.goodEvents[Math.floor(Math.random() * region.goodEvents.length)];
    } else if (region.preferred === activeReligion) {
      isMatched = true;
      baseScore = 35;
      if (Math.random() < 0.8) {
        chosenEvent = region.goodEvents[Math.floor(Math.random() * region.goodEvents.length)];
      } else {
        chosenEvent = BAD_DISASTERS[Math.floor(Math.random() * BAD_DISASTERS.length)];
      }
    } else {
      isMatched = false;
      baseScore = 15;
      if (Math.random() < 0.45) {
        chosenEvent = SPECIAL_INTERACTION_EVENTS[Math.floor(Math.random() * SPECIAL_INTERACTION_EVENTS.length)];
      } else {
        chosenEvent = BAD_DISASTERS[Math.floor(Math.random() * BAD_DISASTERS.length)];
      }
    }

    const totalGain = Math.max(0, baseScore + methodBonus + chosenEvent.score);
    rState.score += totalGain;

    const prevOwner = mapOwnership[regionKey];
    if (prevOwner && prevOwner !== activeReligion) {
      religionStates[prevOwner].regions = religionStates[prevOwner].regions.filter(r => r !== regionKey);
    }
    mapOwnership[regionKey] = activeReligion;
    if (!rState.regions.includes(regionKey)) {
      rState.regions.push(regionKey);
    }

    io.emit('turnResultModal', {
      actorReligion: activeReligion,
      regionKey,
      regionName: region.name,
      artType: region.artType,
      method,
      isMatched,
      isHybrid: (region.type === 'hybrid'),
      eventText: chosenEvent.text,
      eventScore: chosenEvent.score,
      totalGain,
      regionDesc: region.desc,
      mapOwnership,
      religionStates
    });

    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
    io.emit('nextTurn', { currentReligion: turnOrder[currentTurnIndex] });
  });

  socket.on('disconnect', () => {
    players = players.filter(p => p.id !== socket.id);
    if (players.length === 0) {
      gameStarted = false;
      soloMode = false;
      currentTurnIndex = 0;
      mapOwnership = {
        '바티칸·이탈리아': '크리스트교', '사우디아라비아': '이슬람교', '인도': '힌두교', '태국': '불교',
        '한국': null, '인도네시아': null, '싱가포르': null, '나이지리아': null, '미국': null, '브라질': null, '이집트': null
      };
      turnOrder.forEach(r => {
        religionStates[r].score = 60;
        religionStates[r].regions = [RELIGIONS.find(i => i.name === r).origin];
        religionStates[r].ownerId = null;
      });
    }
    io.emit('updateLobby', {
      players,
      hostId: players[0]?.id || null,
      gameStarted
    });
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`서버 정상 가동: 포트 ${PORT}`));
