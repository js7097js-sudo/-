const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const RELIGIONS = [
  { id: 'christianity', name: '크리스트교', color: '#8b5cf6', origin: '유럽' },
  { id: 'islam', name: '이슬람교', color: '#10b981', origin: '서남아시아' },
  { id: 'buddhism', name: '불교', color: '#f59e0b', origin: '동아시아' },
  { id: 'hinduism', name: '힌두교', color: '#ea580c', origin: '남아시아' }
];

// 세계 10대 권역 데이터: 역사적 사실과 고화질 교육용 이미지, 대표 건축물/축제 및 돌발 재난
const REGIONS = {
  '유럽': {
    name: '유럽',
    preferred: '크리스트교',
    img: 'https://images.unsplash.com/photo-1548625361-195fe5795df5?w=600&auto=format&fit=crop&q=80',
    description: '로마 가톨릭과 개신교, 정교회가 형성된 크리스트교의 중심 권역입니다.',
    events: [
      { type: 'good', text: '🏛️ 바티칸 성 베드로 대성당 완공! 전 유럽에서 성지 순례 행렬이 이어집니다.', score: 25 },
      { type: 'good', text: '⛪ 고딕 양식의 대성당들이 세워지며 종교 예술과 신앙이 꽃을 피웁니다.', score: 20 },
      { type: 'bad', text: '⚔️ 십자군 전쟁 발발! 오랜 원정과 전쟁으로 인한 혼란이 발생합니다.', score: -15 },
      { type: 'bad', text: '🌊 대서양 선교선이 거센 폭풍우를 만나 항로를 이탈하고 피해를 입었습니다.', score: -10 }
    ]
  },
  '서남아시아': {
    name: '서남아시아',
    preferred: '이슬람교',
    img: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&auto=format&fit=crop&q=80',
    description: '메카와 메디나를 중심으로 사막 무역로를 통해 이슬람 공동체가 확산된 발상지입니다.',
    events: [
      { type: 'good', text: '🕌 성지 메카 카바 신전의 성지순례(하즈) 대성황! 전 세계 무슬림이 결집합니다.', score: 25 },
      { type: 'good', text: '🐪 사막 대상(카라반) 무역로를 따라 오아시스 도시마다 모스크가 건립됩니다.', score: 20 },
      { type: 'bad', text: '🌪️ 사막의 거대한 모래폭풍(하둡)을 만나 교역 상단이 고립되었습니다.', score: -15 },
      { type: 'bad', text: '⚔️ 유목 세력과의 오아시스 쟁탈전으로 전파 거점이 일시 차단됩니다.', score: -10 }
    ]
  },
  '남아시아': {
    name: '남아시아',
    preferred: '힌두교',
    img: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=600&auto=format&fit=crop&q=80',
    description: '갠지스강을 어머니의 강으로 여기며 카스트 제도와 독특한 사원 문화를 지닌 힌두 문화권입니다.',
    events: [
      { type: 'good', text: '🎆 바라나시 갠지스강 쿰브 멜라 대축제! 수천만 명의 순례자가 정화 의식을 치릅니다.', score: 30 },
      { type: 'good', text: '🛕 웅장한 힌두 석조 사원과 카일라사 사원이 완공되어 신앙의 중심지가 됩니다.', score: 25 },
      { type: 'bad', text: '⛈️ 몬순 폭우와 강 범람으로 순례길이 끊어지고 마을이 고립되었습니다.', score: -15 },
      { type: 'bad', text: '⚔️ 외세 침공군에 의해 전통 사원이 일부 훼손되었습니다.', score: -10 }
    ]
  },
  '동아시아': {
    name: '동아시아',
    preferred: '불교',
    img: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&auto=format&fit=crop&q=80',
    description: '실크로드를 거쳐 전래된 대승불교가 유교, 도교와 어우러지며 찬란한 문화재를 남겼습니다.',
    events: [
      { type: 'good', text: '📜 팔만대장경 판각과 불국사 석가탑 건립! 국가를 수호하는 호국불교가 번영합니다.', score: 25 },
      { type: 'good', text: '🧘 혜초 등 구법승들이 인도에서 경전을 가져와 사찰마다 불경 연구가 활발해집니다.', score: 20 },
      { type: 'bad', text: '📜 조선 왕조의 숭유억불 정책과 유생들의 반발로 승려의 도성 출입이 금지됩니다.', score: -15 },
      { type: 'bad', text: '🔥 험난한 겨울 산맥을 넘다 눈보라(조난)를 만나 불경 서적 일부가 유실되었습니다.', score: -10 }
    ]
  },
  '동남아시아': {
    name: '동남아시아',
    preferred: '불교', // 인도네시아 해상 이슬람, 인도차이나 불교
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80',
    description: '해상 실크로드의 요충지로, 앙코르와트 같은 불교 유적과 말라카 해역의 무역이 공존합니다.',
    events: [
      { type: 'good', text: '🏯 정글 속 거대한 사원 앙코르와트와 불교 탑들이 번영을 누립니다.', score: 25 },
      { type: 'good', text: '⛵ 인도양 향신료 무역선을 타고 온 평화로운 상인들이 현지 왕족을 감화시킵니다.', score: 20 },
      { type: 'bad', text: '🏴‍☠️ 말라카 해협 해적들의 약탈로 전파 무역선이 피해를 입었습니다.', score: -15 },
      { type: 'bad', text: '🌊 열대 몬순 태풍으로 인해 선박이 좌초되었습니다.', score: -10 }
    ]
  },
  '북부아프리카': {
    name: '북부아프리카',
    preferred: '이슬람교',
    img: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=600&auto=format&fit=crop&q=80',
    description: '사하라 사막 이북 지중해 연안으로, 일찍부터 이슬람 아랍 문화권에 편입되었습니다.',
    events: [
      { type: 'good', text: '🕌 카이로 알아즈하르 대학교 완공! 이슬람 학문과 법학의 메카로 성장합니다.', score: 25 },
      { type: 'good', text: '🏜️ 사하라 사막 소금-금 무역로를 통해 대상들이 이슬람 교리를 널리 전파합니다.', score: 20 },
      { type: 'bad', text: '⚔️ 지중해 패권을 둘러싼 해상 분쟁으로 무역로가 차단되었습니다.', score: -10 }
    ]
  },
  '북아메리카': {
    name: '북아메리카',
    preferred: '크리스트교',
    img: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&auto=format&fit=crop&q=80',
    description: '유럽에서 건너온 이주민(청교도 등)들에 의해 개신교와 가톨릭이 주류로 자리 잡았습니다.',
    events: [
      { type: 'good', text: '🚢 메이플라워호 청교도 정착 성공! 신대륙 전역에 자유로운 교회 공동체가 확산됩니다.', score: 25 },
      { type: 'good', text: '🔔 개척지마다 마을 중심에 교회가 세워지고 대부흥 전도 집회가 열립니다.', score: 20 },
      { type: 'bad', text: '❄️ 혹독한 신대륙의 첫 겨울 추위와 식량 부족으로 초기 정착민들이 고난을 겪습니다.', score: -15 }
    ]
  },
  '라틴아메리카': {
    name: '라틴아메리카',
    preferred: '크리스트교',
    img: 'https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=600&auto=format&fit=crop&q=80',
    description: '대항해시대 스페인과 포르투갈의 선교로 현재 세계 최대의 가톨릭 신도 인구를 보유하고 있습니다.',
    events: [
      { type: 'good', text: '🗽 리우데자네이루의 거대 구속주 예수상처럼 가톨릭 신앙이 대륙 전체에 확고히 뿌리내립니다.', score: 25 },
      { type: 'good', text: '⛪ 과달루페 성모 발현 신앙이 원주민 사회와 융합되어 대규모 개종이 일어납니다.', score: 20 },
      { type: 'bad', text: '⛈️ 안데스 고산 지대의 험준한 지형과 열대 우림 풍토병으로 전도 활동이 지연됩니다.', score: -10 }
    ]
  },
  '사하라남부아프리카': {
    name: '사하라 이남 아프리카',
    preferred: '크리스트교', // 실제 지도상 남부는 크리스트교 우세
    img: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&auto=format&fit=crop&q=80',
    description: '전통 토착 신앙과 함께 해안 선교를 통한 크리스트교와 북부의 이슬람이 교차하는 지역입니다.',
    events: [
      { type: 'good', text: '🎶 아프리카 토착 음악과 결합한 활기찬 복음 성가 예배가 대중의 열렬한 호응을 얻습니다.', score: 25 },
      { type: 'good', text: '🏥 의료 선교단과 학교 설립을 통해 지역 주민들의 자발적 개종이 급증합니다.', score: 20 },
      { type: 'bad', text: '🦟 말라리아 등 열대 풍토병으로 선교단 캠프가 일시 철수합니다.', score: -15 }
    ]
  },
  '오세아니아': {
    name: '오세아니아',
    preferred: '크리스트교',
    img: 'https://images.unsplash.com/photo-1506973035172-1b74107b3992?w=600&auto=format&fit=crop&q=80',
    description: '유럽 이주민의 정착과 남태평양 섬 선교를 통해 크리스트교가 자리 잡은 권역입니다.',
    events: [
      { type: 'good', text: '⛪ 시드니 세인트 메리 대성당 등 도시 중심가에 거대한 종교 랜드마크가 들어섭니다.', score: 25 },
      { type: 'bad', text: '🌊 남태평양 산호초 군도 해역에서 암초에 부딪혀 선박 수리가 필요해졌습니다.', score: -10 }
    ]
  }
};

let players = [];
let currentTurnIndex = 0;
let gameStarted = false;
let soloMode = false;

// 10대 권역 초기 점유 (발상지 점유)
let mapOwnership = {
  '유럽': '크리스트교',
  '서남아시아': '이슬람교',
  '남아시아': '힌두교',
  '동아시아': '불교',
  '동남아시아': null,
  '북부아프리카': null,
  '북아메리카': null,
  '라틴아메리카': null,
  '사하라남부아프리카': null,
  '오세아니아': null
};

// 4개 종교 기본 점수 (초기 점수 60점으로 균등 분배)
let religionStates = {
  '크리스트교': { score: 60, regions: ['유럽'], color: '#8b5cf6', ownerId: null },
  '이슬람교': { score: 60, regions: ['서남아시아'], color: '#10b981', ownerId: null },
  '불교': { score: 60, regions: ['동아시아'], color: '#f59e0b', ownerId: null },
  '힌두교': { score: 60, regions: ['남아시아'], color: '#ea580c', ownerId: null }
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
      socket.emit('errorMsg', '이미 정원(4명)이 찼거나 게임이 시작되었습니다.');
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

  socket.on('spreadReligion', ({ regionName, method }) => {
    if (!gameStarted) return;
    const activeReligion = turnOrder[currentTurnIndex];
    const rState = religionStates[activeReligion];

    if (!soloMode && rState.ownerId !== socket.id) {
      socket.emit('errorMsg', '지금은 본인의 종교 턴이 아닙니다.');
      return;
    }

    const region = REGIONS[regionName];
    if (!region) return;

    // 실제 지리 분포와 일치 여부
    const isMatched = (region.preferred === activeReligion);

    // 기본 점수: 역사적 일치 시 35점, 타종교 권역 무리한 전파 시 10점
    let baseScore = isMatched ? 35 : 10;
    let methodBonus = (method === '장거리') ? 15 : 10;

    // 운 요소: 일치할 경우 긍정 이벤트 80% / 부정 20%, 불일치할 경우 부정 이벤트 70% / 긍정 30%
    const pool = region.events;
    const goodEvents = pool.filter(e => e.type === 'good');
    const badEvents = pool.filter(e => e.type === 'bad');

    let selectedEvent;
    const roll = Math.random();
    if (isMatched) {
      selectedEvent = (roll < 0.8 && goodEvents.length > 0) 
        ? goodEvents[Math.floor(Math.random() * goodEvents.length)]
        : badEvents[Math.floor(Math.random() * badEvents.length)];
    } else {
      selectedEvent = (roll < 0.7 && badEvents.length > 0)
        ? badEvents[Math.floor(Math.random() * badEvents.length)]
        : goodEvents[Math.floor(Math.random() * goodEvents.length)];
    }

    const totalGain = Math.max(0, baseScore + methodBonus + selectedEvent.score);
    rState.score += totalGain;

    // 점유권 갱신
    const prevOwner = mapOwnership[regionName];
    if (prevOwner && prevOwner !== activeReligion) {
      religionStates[prevOwner].regions = religionStates[prevOwner].regions.filter(r => r !== regionName);
    }
    mapOwnership[regionName] = activeReligion;
    if (!rState.regions.includes(regionName)) {
      rState.regions.push(regionName);
    }

    // 결과 브로드캐스트 (사진 및 스토리 포함)
    io.emit('turnResultModal', {
      actorReligion: activeReligion,
      regionName: region.name,
      method,
      isMatched,
      baseScore,
      methodBonus,
      eventText: selectedEvent.text,
      eventScore: selectedEvent.score,
      totalGain,
      imgUrl: region.img,
      regionDesc: region.description,
      mapOwnership,
      religionStates
    });

    // 다음 턴 전환
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
        '유럽': '크리스트교', '서남아시아': '이슬람교', '남아시아': '힌두교', '동아시아': '불교',
        '동남아시아': null, '북부아프리카': null, '북아메리카': null, '라틴아메리카': null, '사하라남부아프리카': null, '오세아니아': null
      };
      turnOrder.forEach(r => {
        religionStates[r].score = 60;
        religionStates[r].regions = [RELIGIONS.find(item => item.name === r).origin];
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
