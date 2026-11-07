const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const RELIGIONS = [
  { id: 'christianity', name: '크리스트교', color: '#3b82f6', origin: '남유럽' },
  { id: 'islam', name: '이슬람교', color: '#10b981', origin: '서남아시아' },
  { id: 'buddhism', name: '불교', color: '#f59e0b', origin: '동남아시아' },
  { id: 'hinduism', name: '힌두교', color: '#8b5cf6', origin: '남아시아' }
];

// 세계 8대 권역별 선호 종교 및 역사적 돌발 사건 풀
const REGIONS = {
  '서유럽': { preferred: '크리스트교', events: [
    { text: '로마 성 베드로 대성당 완공! 순례자 급증', score: 20 },
    { text: '종교 개혁 발발로 인한 신구교 갈등', score: -5 }
  ]},
  '남유럽': { preferred: '크리스트교', events: [
    { text: '바티칸 교황청의 강력한 선교 칙령 발표', score: 25 },
    { text: '지중해 해상 교역을 통한 복음 전파', score: 15 }
  ]},
  '서남아시아': { preferred: '이슬람교', events: [
    { text: '메카 성지 순례(하즈) 대성황 및 신도 결집', score: 30 },
    { text: '사막 대상(카라반) 무역로를 통한 급속 전파', score: 15 },
    { text: '지역 정권 교체로 인한 전파 지연', score: -10 }
  ]},
  '남아시아': { preferred: '힌두교', events: [
    { text: '갠지스강 쿰브 멜라 축제 대성황', score: 30 },
    { text: '베다 경전 기반의 전통 사원 대거 건립', score: 20 },
    { text: '외세 침입으로 인한 사원 파괴', score: -10 }
  ]},
  '동아시아': { preferred: '불교', events: [
    { text: '실크로드 승려의 경전 번역 및 대장경 판각', score: 25 },
    { text: '국가 주도 호국불교 융성', score: 20 },
    { text: '조선 왕조의 숭유억불 정책으로 사찰 탄압', score: -15 }
  ]},
  '동남아시아': { preferred: '불교', events: [
    { text: '앙코르와트 등 거대 불교 유적 건립', score: 25 },
    { text: '인도양 해상 실크로드를 통한 교역 전파', score: 15 }
  ]},
  '북아메리카': { preferred: '크리스트교', events: [
    { text: '대서양 횡단 개척단의 대규모 정착과 선교', score: 25 },
    { text: '원주민 신앙과의 갈등 발생', score: -10 }
  ]},
  '라틴아메리카': { preferred: '크리스트교', events: [
    { text: '가톨릭 선교단의 라틴 대륙 대규모 포교', score: 25 },
    { text: '식민지 지배 체제와의 마찰', score: -5 }
  ]}
};

let players = [];
let currentTurnIndex = 0;
let gameStarted = false;
let soloMode = false;

// 보드판 상태: 각 지역을 점유한 종교 (초기 발상지 점유)
let mapOwnership = {
  '남유럽': '크리스트교',
  '서남아시아': '이슬람교',
  '동남아시아': '불교',
  '남아시아': '힌두교',
  '서유럽': null,
  '동아시아': null,
  '북아메리카': null,
  '라틴아메리카': null
};

// 4개 종교의 통합 상태
let religionStates = {
  '크리스트교': { score: 50, regions: ['남유럽'], color: '#3b82f6', ownerId: null },
  '이슬람교': { score: 50, regions: ['서남아시아'], color: '#10b981', ownerId: null },
  '불교': { score: 50, regions: ['동남아시아'], color: '#f59e0b', ownerId: null },
  '힌두교': { score: 50, regions: ['남아시아'], color: '#8b5cf6', ownerId: null }
};

const turnOrder = ['크리스트교', '이슬람교', '불교', '힌두교'];

io.on('connection', (socket) => {
  // 최초 접속 시 현재 상태 동기화
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
      socket.emit('errorMsg', '이미 4명이 입장했거나 게임이 진행 중입니다.');
      return;
    }

    const playerName = (name && name.trim()) ? name.trim() : `참가자 ${players.length + 1}`;
    players.push({ id: socket.id, name: playerName, religion: null });

    io.emit('updateLobby', {
      players,
      hostId: players[0].id,
      gameStarted
    });
  });

  socket.on('startGame', () => {
    if (players.length === 0 || socket.id !== players[0].id) return;

    gameStarted = true;
    soloMode = (players.length === 1); // 1명이면 솔로 테스트 모드 활성화

    if (soloMode) {
      // 솔로 모드: 방장 혼자서 모든 종교를 조작할 수 있음
      players[0].religion = 'ALL';
      RELIGIONS.forEach(r => religionStates[r.name].ownerId = players[0].id);
    } else {
      // 2~4인 멀티 모드: 셔플 후 각 플레이어에게 종교 1개씩 고유 배정
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

    // 권한 검증: 솔로 모드가 아니고 해당 종교의 소유자가 아닌 경우 차단
    if (!soloMode && rState.ownerId !== socket.id) {
      socket.emit('errorMsg', '지금은 회원님의 종교 차례가 아닙니다.');
      return;
    }

    const region = REGIONS[regionName];
    if (!region) return;

    // 실제 선호도 판별 및 점수 산정
    const isMatched = (region.preferred === activeReligion);
    let baseScore = isMatched ? 30 : 10;
    let methodBonus = (method === '장거리') ? (isMatched ? 15 : 5) : 5;

    // 역사적 돌발 사건 무작위 추첨
    const event = region.events[Math.floor(Math.random() * region.events.length)];
    const totalGain = baseScore + methodBonus + event.score;

    // 점수 및 영토 업데이트
    rState.score += totalGain;
    const prevOwner = mapOwnership[regionName];
    if (prevOwner && prevOwner !== activeReligion) {
      // 기존 종교의 영토 목록에서 제거
      religionStates[prevOwner].regions = religionStates[prevOwner].regions.filter(r => r !== regionName);
    }
    mapOwnership[regionName] = activeReligion;
    if (!rState.regions.includes(regionName)) {
      rState.regions.push(regionName);
    }

    io.emit('turnResult', {
      actorReligion: activeReligion,
      regionName,
      method,
      isMatched,
      eventText: event.text,
      eventScore: event.score,
      totalGain,
      mapOwnership,
      religionStates
    });

    // 다음 종교로 턴 이동
    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
    io.emit('nextTurn', {
      currentReligion: turnOrder[currentTurnIndex]
    });
  });

  socket.on('disconnect', () => {
    const wasHost = (players[0]?.id === socket.id);
    players = players.filter(p => p.id !== socket.id);

    if (players.length === 0) {
      gameStarted = false;
      soloMode = false;
      currentTurnIndex = 0;
      // 초기화
      mapOwnership = {
        '남유럽': '크리스트교', '서남아시아': '이슬람교', '동남아시아': '불교', '남아시아': '힌두교',
        '서유럽': null, '동아시아': null, '북아메리카': null, '라틴아메리카': null
      };
      Object.keys(religionStates).forEach(k => {
        religionStates[k].score = 50;
        religionStates[k].regions = [RELIGIONS.find(r => r.name === k).origin];
        religionStates[k].ownerId = null;
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
