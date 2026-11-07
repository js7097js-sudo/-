const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const RELIGIONS = ['크리스트교', '이슬람교', '불교', '힌두교'];
let players = [];
let currentTurnIndex = 0;
let gameStarted = false;

const REGIONS = {
  '유럽': {
    target: '크리스트교',
    events: [
      { text: '십자군 전쟁 발발! 크리스트교 명성 변동', scoreChange: -10 },
      { text: '바티칸 대성당 완공! 성지 순례 급증', scoreChange: 20 }
    ]
  },
  '서남아시아': {
    target: '이슬람교',
    events: [
      { text: '메카 성지 순례(하즈) 대성황!', scoreChange: 25 },
      { text: '지역 분쟁으로 전파로 차단', scoreChange: -5 }
    ]
  },
  '동아시아': {
    target: '불교',
    events: [
      { text: '조선 시대 숭유억불 정책/박해 발생!', scoreChange: -15 },
      { text: '팔만대장경 판각! 불교 문화 융성', scoreChange: 20 }
    ]
  },
  '남아시아': {
    target: '힌두교',
    events: [
      { text: '바라나시 갠지스강 대제전 개최', scoreChange: 25 },
      { text: '타 종교 유입 갈등 발생', scoreChange: -10 }
    ]
  }
};

io.on('connection', (socket) => {
  console.log('접속:', socket.id);

  socket.on('joinGame', (name) => {
    if (players.length >= 4 || gameStarted) {
      socket.emit('errorMsg', '이미 4명이 찼거나 게임이 진행 중입니다.');
      return;
    }
    players.push({ id: socket.id, name: name || `학생 ${players.length + 1}`, score: 0 });
    io.emit('updateLobby', { players, isHost: players[0].id });
  });

  socket.on('startGame', () => {
    if (socket.id !== players[0].id) return;
    gameStarted = true;

    const shuffled = [...RELIGIONS].sort(() => Math.random() - 0.5);
    players.forEach((p, idx) => {
      p.religion = shuffled[idx];
    });

    currentTurnIndex = 0;
    io.emit('gameStarted', { players, currentTurn: players[currentTurnIndex] });
  });

  socket.on('spreadReligion', ({ regionName, method }) => {
    const activePlayer = players[currentTurnIndex];
    if (socket.id !== activePlayer.id) return;

    const region = REGIONS[regionName];
    let baseScore = (region.target === activePlayer.religion) ? 30 : 10;
    
    if (method === '장거리') baseScore += 5;

    const randomEvent = region.events[Math.floor(Math.random() * region.events.length)];
    const totalTurnScore = baseScore + randomEvent.scoreChange;
    activePlayer.score += totalTurnScore;

    io.emit('turnResult', {
      player: activePlayer,
      regionName,
      method,
      eventText: randomEvent.text,
      scoreGained: totalTurnScore,
      players
    });

    currentTurnIndex = (currentTurnIndex + 1) % players.length;
    io.emit('nextTurn', { currentTurn: players[currentTurnIndex] });
  });

  socket.on('disconnect', () => {
    players = players.filter(p => p.id !== socket.id);
    io.emit('updateLobby', { players, isHost: players[0]?.id });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`서버 오픈: 포트 ${PORT}`));
