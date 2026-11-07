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
    description: '해상 실크로드의 요충지로,
