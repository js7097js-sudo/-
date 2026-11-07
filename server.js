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

// 11개 국가/권역의 검증된 실사 랜드마크 이미지 및 풍부한 교과서·현대 문화 연계 데이터
const REGIONS = {
  '바티칸·이탈리아': {
    name: '바티칸·이탈리아',
    type: 'pure',
    preferred: '크리스트교',
    img: 'https://images.unsplash.com/photo-1548625361-195fe5795df5?auto=format&fit=crop&w=800&q=80',
    desc: '로마 가톨릭의 총본산으로 성 베드로 대성당이 우뚝 솟은 크리스트교의 역사적 요람입니다.',
    events: [
      { text: '🏛️ [대표 랜드마크] 바티칸 성 베드로 대성당 완공! 전 세계에서 수백만 순례자가 운집합니다.', score: 25 },
      { text: '📜 [역사 사건] 로마 제국의 기독교 국교 공인으로 유럽 전역에 성당과 수도원이 건립됩니다.', score: 25 },
      { text: '⚔️ [돌발 위기] 지중해 제해권 분쟁과 십자군 전쟁의 후폭풍으로 선교단에 혼란이 발생합니다.', score: -10 }
    ]
  },
  '사우디아라비아': {
    name: '사우디아라비아',
    type: 'pure',
    preferred: '이슬람교',
    img: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80',
    desc: '예언자 무함마드가 창시하고 세계 무슬림들이 매일 향해 기도하는 성지 메카 카바 신전이 있습니다.',
    events: [
      { text: '🕌 [대표 랜드마크] 정기 대순례(하즈) 기간! 전 세계 무슬림들이 메카 카바 신전을 돌며 일체감을 다집니다.', score: 30 },
      { text: '🐪 [역사 전파] 사막 대상(카라반) 무역로를 따라 상인들이 교리를 정직하게 전파하며 신용을 얻습니다.', score: 20 },
      { text: '🌪️ [돌발 재해] 사막 한가운데서 거대한 모래폭풍(하둡)을 만나 교역 상단이 고립되었습니다.', score: -15 }
    ]
  },
  '인도': {
    name: '인도',
    type: 'pure',
    preferred: '힌두교',
    img: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
    desc: '어머니의 강 갠지스강을 중심으로 윤회와 업보, 카스트 질서가 깊게 깃든 힌두 문화의 고향입니다.',
    events: [
      { text: '🎆 [대표 축제] 바라나시 갠지스강 쿰브 멜라 대제전 개최! 수천만 명의 신자가 성스러운 강물에 몸을 씻습니다.', score: 30 },
      { text: '🛕 [대표 랜드마크] 웅장한 석조 조각이 돋보이는 전통 힌두 사원들이 곳곳에 세워져 번영을 누립니다.', score: 25 },
      { text: '⛈️ [돌발 재해] 몬순 폭우로 갠지스강이 크게 범람하여 순례길 도로가 끊겼습니다.', score: -10 }
    ]
  },
  '태국': {
    name: '태국',
    type: 'pure',
    preferred: '불교',
    img: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80',
    desc: '국민의 대다수가 상좌부 불교를 믿으며 국왕부터 서민까지 승려와 사찰을 각별히 공경하는 국가입니다.',
    events: [
      { text: '🏯 [대표 랜드마크] 방콕 왓 아룬(새벽 사원)과 에메랄드 사찰에 황금빛 예불 의식이 거행됩니다.', score: 25 },
      { text: '🧘 [문화 전통] 청년들이 성인이 되기 전 사원에서 단기 출가하여 불교적 도덕과 명상을 배웁니다.', score: 20 },
      { text: '🔥 [돌발 위기] 건기 정글 산불로 외곽 사원 건물이 일부 그을려 보수 작업이 필요해졌습니다.', score: -10 }
    ]
  },
  '미국': {
    name: '미국',
    type: 'pure',
    preferred: '크리스트교',
    img: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80',
    desc: '청교도 개척민들이 건너온 이래 개신교와 가톨릭이 사회 윤리와 공동체의 중추를 이룬 국가입니다.',
    events: [
      { text: '🚢 [역사 사건] 메이플라워호 이주민들이 정착하며 자유로운 신앙 공동체와 교회를 마을마다 세웁니다.', score: 25 },
      { text: '🔔 [현대 활동] 도시마다 설립된 기독교 청년회(YMCA)와 자원봉사 센터가 지역 사회의 호응을 얻습니다.', score: 20 },
      { text: '❄️ [돌발 위기] 혹독한 겨울 블리자드로 신대륙 초기 개척지 마을의 물자 공급이 끊겼습니다.', score: -15 }
    ]
  },
  '브라질': {
    name: '브라질',
    type: 'pure',
    preferred: '크리스트교',
    img: 'https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?auto=format&fit=crop&w=800&q=80',
    desc: '세계에서 가장 많은 가톨릭 신자가 살아가며 거대한 구속주 예수상으로 유명한 남미의 거점입니다.',
    events: [
      { text: '🗽 [대표 랜드마크] 리우데자네이루 코르코바두 산정의 거대한 구속주 예수상 아래 수만 명이 미사를 드립니다.', score: 30 },
      { text: '🎶 [문화 축제] 열정적인 삼바 음악 속에서도 수호성인을 기리는 가톨릭 축일 행렬이 성대히 열립니다.', score: 20 },
      { text: '⛈️ [돌발 재해] 안데스 산맥에서 불어온 폭풍우로 해안가 선교선의 발이 묶였습니다.', score: -10 }
    ]
  },
  '이집트': {
    name: '이집트',
    type: 'pure',
    preferred: '이슬람교',
    img: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=800&q=80',
    desc: '지중해와 아프리카를 연결하는 이슬람 지성사의 중심지로 천년 고도 카이로에 위치합니다.',
    events: [
      { text: '🏛️ [대표 랜드마크] 카이로 알아즈하르 모스크 대학에서 배출된 최고 석학들이 평화로운 교리를 설파합니다.', score: 25 },
      { text: '🏜️ [교역 전파] 나일강과 사하라 대상 무역로를 타고 북아프리카 일대에 모스크가 빠르게 세워집니다.', score: 20 },
      { text: '⚔️ [돌발 위기] 지중해 항로에서 해적선과의 조우로 교역 선교 물품이 일부 탈취되었습니다.', score: -10 }
    ]
  },
  // 다종교 공존·종합 국가들
  '한국': {
    name: '한국',
    type: 'hybrid',
    img: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=800&q=80',
    desc: '불교, 개신교, 가톨릭, 유교 전통이 갈등 없이 상호 존중하며 K-컬처와 융합된 다종교 모범 국가입니다.',
    events: [
      { text: '🎵 [K-컬처 융합] K-POP 아이돌의 한복 뮤직비디오와 사찰 템플스테이 열풍! 글로벌 청년들의 종교 문화 호감도 급상승!', score: 30 },
      { text: '🎄 [문화 공존] 석가탄신일과 성탄절이 모두 국가 공휴일! 전 국민이 연등회와 크리스마스를 함께 축하합니다.', score: 25 },
      { text: '🤝 [사회적 가치] 종교 간 평화 대화 기구가 발족하여 세계 평화와 환경 보호 봉사 활동을 함께 전개합니다.', score: 20 }
    ]
  },
  '인도네시아': {
    name: '인도네시아',
    type: 'hybrid',
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    desc: '세계 최대 무슬림 인구국이면서도 발리의 힌두 사원과 족자카르타 보로부두르 불교 유적이 공존합니다.',
    events: [
      { text: '🕌 [대표 랜드마크] 수도 자카르타의 거대한 이스티클랄 모스크와 마주 선 성당이 서로 주차장을 공유하며 우정을 나눕니다.', score: 30 },
      { text: '🛕 [세계유산] 유네스코 세계유산 보로부두르 거대 불탑에 전 세계 불교 순례객들이 모여 연등을 띄웁니다.', score: 25 },
      { text: '🌺 [발리 힌두 문화] 꽃과 향을 바치는 발리섬의 독특한 힌두 전통 의식이 세계 여행자들을 매료시킵니다.', score: 20 }
    ]
  },
  '싱가포르': {
    name: '싱가포르',
    type: 'hybrid',
    img: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80',
    desc: '한 거리에 불교 사찰, 이슬람 모스크, 힌두 사원, 기독교 교회가 나란히 이웃한 다문화 랜드마크입니다.',
    events: [
      { text: '🚶 [거리 공존] 차이나타운 불아사 바로 옆에 스리 마리암만 힌두 사원과 모스크가 공존하며 미식 축제를 엽니다!', score: 30 },
      { text: '📜 [제도적 조화] 종교화합법을 통해 종교 간 상호 존중 문화를 국가 차원에서 모범적으로 정착시켰습니다.', score: 25 },
      { text: '🤝 [다문화 축제] 디왈리(힌두), 하리 라야(이슬람), 부처님오신날, 성탄절을 다민족 시민들이 모두 함께 기념합니다.', score: 20 }
    ]
  },
  '나이지리아': {
    name: '나이지리아',
    type: 'hybrid',
    img: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=800&q=80',
    desc: '사하라 이남 아프리카의 중심국으로, 북부의 이슬람교와 남부의 크리스트교가 대등하게 양립합니다.',
    events: [
      { text: '🎶 [가스펠 열풍] 활기찬 아프리카 토착 리듬과 결합된 가스펠 성가 합창이 대륙 전역의 대형 교회를 뒤흔듭니다.', score: 30 },
      { text: '🕌 [북부 문화] 유서 깊은 북부 카노 에미리트의 전통 이슬람 축제와 마상 무예가 성대하게 펼쳐집니다.', score: 25 },
      { text: '🤝 [평화 선언] 종교 지도자들이 모여 인종과 신앙을 뛰어넘는 아프리카 대륙의 화합 포럼을 개최합니다.', score: 20 }
    ]
  }
};

// 비주류 권역 전파 시 재미와 편견 방지를 위한 특별 상호작용 풀
const SPECIAL_INTERACTION_EVENTS = [
  { text: '🌍 [특별 상호작용!] 글로벌 유학생과 청년 교류를 통해 현지인들이 새로운 종교 철학에 깊은 호기심을 갖습니다.', score: 25 },
  { text: '📖 [특별 상호작용!] 번역된 종교 고전 문학 서적이 지식인들 사이에서 베스트셀러에 오르며 큰 반향을 일으킵니다.', score: 20 },
  { text: '🍵 [특별 상호작용!] 전통 차(茶)와 종교 명상 체험 행사가 현지인들에게 힐링 프로그램으로 폭발적 인기를 끕니다.', score: 20 }
];

const BAD_DISASTERS = [
  { text: '🌊 [항로 조난] 대양을 건너던 선교 교역선이 태풍을 만나 암초에 부딪혔습니다! 선교 물자 파손', score: -15 },
  { text: '🌪️ [사막 고립] 횡단 중이던 대상(카라반)이 거대한 모래폭풍에 휘말려 일시적으로 길을 잃었습니다.', score: -15 },
  { text: '⚔️ [국경 봉쇄] 인접 영토 분쟁으로 인해 국경 검문소가 폐쇄되어 전파 활동이 지연되었습니다.', score: -10 }
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
      chosenEvent = region.events[Math.floor(Math.random() * region.events.length)];
    } else if (region.preferred === activeReligion) {
      isMatched = true;
      baseScore = 35;
      chosenEvent = region.events[Math.floor(Math.random() * region.events.length)];
    } else {
      isMatched = false;
      baseScore = 15;
      if (Math.random() < 0.5) {
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
      imgUrl: region.img,
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
