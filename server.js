const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const RELIGIONS = [
  { id: 'christianity', name: '크리스트교', symbol: '✝️', color: '#8b5cf6', origin: '이탈리아(로마)' },
  { id: 'islam', name: '이슬람교', symbol: '☪️', color: '#10b981', origin: '사우디아라비아(메카)' },
  { id: 'buddhism', name: '불교', symbol: '☸️', color: '#f59e0b', origin: '인도 북동부' },
  { id: 'hinduism', name: '힌두교', symbol: '🕉️', color: '#ea580c', origin: '인도(남아시아)' }
];

// 교과서 기반 대표 국가 + 종합 국가 데이터 (위키미디어 고화질 실사 및 교육용 검증 이미지)
const REGIONS = {
  '이탈리아(로마)': {
    name: '이탈리아(바티칸)',
    type: 'pure',
    preferred: '크리스트교',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/St_Peter%27s_Square%2C_Vatican_City_-_April_2007.jpg/800px-St_Peter%27s_Square%2C_Vatican_City_-_April_2007.jpg',
    desc: '로마 가톨릭의 본산인 바티칸 성 베드로 대성당이 위치한 크리스트교의 역사적 중심지입니다.',
    goodEvents: [
      { text: '🏛️ 바티칸 성 베드로 대성당 완공! 전 세계에서 순례 행렬이 모여듭니다.', score: 25 },
      { text: '📜 로마 황제의 기독교 공인(밀라노 칙령)으로 교세가 급격히 확장됩니다.', score: 25 }
    ]
  },
  '사우디아라비아(메카)': {
    name: '사우디아라비아(메카)',
    type: 'pure',
    preferred: '이슬람교',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Kaaba_Masjid_Haraam_Makkah.jpg/800px-Kaaba_Masjid_Haraam_Makkah.jpg',
    desc: '무함마드가 창시하고 성지 카바 신전이 위치한 이슬람교의 발상지입니다.',
    goodEvents: [
      { text: '🕌 정기 순례(하즈) 기간을 맞아 전 세계 수백만 무슬림이 메카 카바 신전에 집결합니다!', score: 30 },
      { text: '🐪 사막 대상(카라반) 무역로를 따라 오아시스 도시마다 모스크가 세워집니다.', score: 20 }
    ]
  },
  '인도': {
    name: '인도(갠지스강)',
    type: 'pure',
    preferred: '힌두교',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Varanasi_Ghats_River_Ganga.jpg/800px-Varanasi_Ghats_River_Ganga.jpg',
    desc: '갠지스강 유역을 중심으로 카스트와 환생, 사원 의례가 발달한 힌두교의 모태입니다.',
    goodEvents: [
      { text: '🎆 바라나시 갠지스강 쿰브 멜라 축제 대성황! 수많은 신자가 성스러운 강물로 정화합니다.', score: 30 },
      { text: '🛕 정교한 석조 힌두 사원들이 대거 건립되어 찬란한 신앙 문화를 뽐냅니다.', score: 25 }
    ]
  },
  '태국·캄보디아': {
    name: '태국·캄보디아(동남아)',
    type: 'pure',
    preferred: '불교',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Angkor_Wat_from_North.jpg/800px-Angkor_Wat_from_North.jpg',
    desc: '상좌부 불교가 깊게 뿌리내려 국민 대다수가 불교를 믿으며 거대한 사원(앙코르 등)이 번성한 권역입니다.',
    goodEvents: [
      { text: '🏯 앙코르와트와 황금 불교 사원 건립! 왕실과 백성이 한마음으로 불심을 기립니다.', score: 25 },
      { text: '🧘 청년들이 단기 출가하여 승려 생활을 체험하는 불교 전통이 활발합니다.', score: 20 }
    ]
  },
  '한국': {
    name: '한국(동아시아 종합)',
    type: 'hybrid', // 종합 다종교 국가
    preferred: null,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Bulguksa_Dabotap.jpg/800px-Bulguksa_Dabotap.jpg',
    desc: '불교, 개신교, 가톨릭 및 유교 전통이 공존하며 서로를 존중하는 대표적인 다종교 화합 국가입니다.',
    goodEvents: [
      { text: '🤝 종교 간 평화 대화 포럼 개최! 모든 종교가 화합하며 전파 지지도가 상승합니다.', score: 25 },
      { text: '📜 팔만대장경과 유서 깊은 전통 산사(사찰)가 유네스코 세계유산으로 찬사를 받습니다.', score: 20 },
      { text: '⛪ 도심 곳곳의 교회와 성당이 사회 봉사 활동을 펼치며 큰 신뢰를 얻습니다.', score: 20 }
    ]
  },
  '미국': {
    name: '미국(북아메리카)',
    type: 'pure',
    preferred: '크리스트교',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Washington_National_Cathedral_exterior.jpg/800px-Washington_National_Cathedral_exterior.jpg',
    desc: '청교도 개척 이주 이후 다양한 기독교 종파가 사회의 근간을 형성한 권역입니다.',
    goodEvents: [
      { text: '🚢 메이플라워호 이주민들이 자유로운 신앙 공동체와 교회를 마을마다 세웁니다.', score: 25 },
      { text: '🔔 대규모 부흥 전도 대회가 열려 수많은 시민들이 신앙을 고백합니다.', score: 20 }
    ]
  },
  '브라질': {
    name: '브라질(라틴아메리카)',
    type: 'pure',
    preferred: '크리스트교',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Christ_the_Redeemer_-_Cristo_Redentor.jpg/800px-Christ_the_Redeemer_-_Cristo_Redentor.jpg',
    desc: '세계 최대 가톨릭 신자 수를 자랑하며 코르코바두 산의 구속주 예수상으로 유명합니다.',
    goodEvents: [
      { text: '🗽 리우데자네이루 거대 구속주 예수상 아래 수많은 순례자가 모여 미사를 드립니다.', score: 30 },
      { text: '🎶 삼바 리듬과 결합한 감동적인 종교 축제가 대륙 전체를 뜨겁게 달굽니다.', score: 20 }
    ]
  },
  '인도네시아': {
    name: '인도네시아(동남아 해상)',
    type: 'pure',
    preferred: '이슬람교',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Istiqlal_Mosque_Jakarta_Indonesia.jpg/800px-Istiqlal_Mosque_Jakarta_Indonesia.jpg',
    desc: '인도양 해상 향신료 무역을 통해 이슬람교를 수용하여 현재 세계 최대 무슬림 인구를 가진 국가입니다.',
    goodEvents: [
      { text: '⛵ 인도양 해상 상인들이 공정하고 성실한 교역으로 현지 술탄과 주민들을 감화시킵니다.', score: 25 },
      { text: '🕌 자카르타 이스티클랄 대모스크에 신도들이 운집하여 성대한 축제를 엽니다.', score: 25 }
    ]
  },
  '이집트·북아프리카': {
    name: '이집트·북아프리카',
    type: 'pure',
    preferred: '이슬람교',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Al-Azhar_Mosque_Cairo_Egypt.jpg/800px-Al-Azhar_Mosque_Cairo_Egypt.jpg',
    desc: '지중해와 사하라 사막을 잇는 통로로, 카이로 알아즈하르 등 이슬람 학문이 꽃핀 지역입니다.',
    goodEvents: [
      { text: '🏛️ 카이로 알아즈하르 이슬람 대학에서 명망 높은 학자들이 배출되어 교리를 넓힙니다.', score: 25 },
      { text: '🏜️ 사하라 사막 소금-비단 무역로를 따라 상인들이 교리를 안전하게 확산시킵니다.', score: 20 }
    ]
  }
};

// 공통 재난 및 특별 상호작용 사건 풀
const BAD_DISASTERS = [
  { text: '🌊 대양을 건너던 전파선이 거센 폭풍우를 만나 암초에 부딪혔습니다! 선교 물자 손실', score: -15 },
  { text: '🌪️ 사막을 횡단하던 교역 대상이 거대한 모래폭풍에 갇혀 일시 고립되었습니다.', score: -15 },
  { text: '⚔️ 인접 세력 간의 영토 분쟁 및 전쟁 발발로 교역로와 국경이 봉쇄되었습니다.', score: -10 },
  { text: '📜 보수적 현지 관료들의 외국 종교 배척령으로 포교 활동이 일시 중단됩니다.', score: -10 }
];

const SPECIAL_INTERACTION_EVENTS = [
  { text: '🌍 [특별 상호작용!] 현대 K-컬처와 글로벌 문화 교류로 현지 청년들의 종교적 호기심 폭발!', score: 25 },
  { text: '🤝 [특별 상호작용!] 국제 평화 박람회에서 현지인들과 감동적인 문화 대화를 나누었습니다.', score: 20 },
  { text: '📖 [특별 상호작용!] 번역된 종교 서적이 현지 지식인들에게 큰 영감을 주었습니다.', score: 15 }
];

let players = [];
let currentTurnIndex = 0;
let gameStarted = false;
let soloMode = false;

let mapOwnership = {
  '이탈리아(로마)': '크리스트교',
  '사우디아라비아(메카)': '이슬람교',
  '인도': '힌두교',
  '태국·캄보디아': '불교',
  '한국': null,
  '미국': null,
  '브라질': null,
  '인도네시아': null,
  '이집트·북아프리카': null
};

let religionStates = {
  '크리스트교': { score: 60, regions: ['이탈리아(로마)'], ownerId: null },
  '이슬람교': { score: 60, regions: ['사우디아라비아(메카)'], ownerId: null },
  '불교': { score: 60, regions: ['태국·캄보디아'], ownerId: null },
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
      // 한국 등 다종교 종합 국가: 누구에게나 열려 있음
      isMatched = true;
      baseScore = 30;
      chosenEvent = region.goodEvents[Math.floor(Math.random() * region.goodEvents.length)];
    } else if (region.preferred === activeReligion) {
      // 역사적 주류 일치
      isMatched = true;
      baseScore = 35;
      // 80% 확률로 대표 건축물/축제 호재, 20% 확률로 폭풍우 등 재난
      if (Math.random() < 0.8) {
        chosenEvent = region.goodEvents[Math.floor(Math.random() * region.goodEvents.length)];
      } else {
        chosenEvent = BAD_DISASTERS[Math.floor(Math.random() * BAD_DISASTERS.length)];
      }
    } else {
      // 비주류 권역 전파 (편견 방지용 특별 상호작용 40% / 돌발재해 60%)
      isMatched = false;
      baseScore = 15;
      if (Math.random() < 0.4) {
        chosenEvent = SPECIAL_INTERACTION_EVENTS[Math.floor(Math.random() * SPECIAL_INTERACTION_EVENTS.length)];
      } else {
        chosenEvent = BAD_DISASTERS[Math.floor(Math.random() * BAD_DISASTERS.length)];
      }
    }

    const totalGain = Math.max(0, baseScore + methodBonus + chosenEvent.score);
    rState.score += totalGain;

    // 영토 점유 갱신
    const prevOwner = mapOwnership[regionKey];
    if (prevOwner && prevOwner !== activeReligion) {
      religionStates[prevOwner].regions = religionStates[prevOwner].regions.filter(r => r !== regionKey);
    }
    mapOwnership[regionKey] = activeReligion;
    if (!rState.regions.includes(regionKey)) {
      rState.regions.push(regionKey);
    }

    // 결과 전송
    io.emit('turnResultModal', {
      actorReligion: activeReligion,
      regionKey,
      regionName: region.name,
      method,
      isMatched,
      isHybrid: (region.type === 'hybrid'),
      eventText: chosenEvent.text,
      eventScore: chosenEvent.score,
      totalGain,
      imgUrl: region.img,
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
        '이탈리아(로마)': '크리스트교', '사우디아라비아(메카)': '이슬람교', '인도': '힌두교', '태국·캄보디아': '불교',
        '한국': null, '미국': null, '브라질': null, '인도네시아': null, '이집트·북아프리카': null
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
