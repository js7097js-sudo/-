const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const RELIGIONS = [
  { id: 'christianity', name: '크리스트교', symbol: '✝', color: '#7c3aed', origin: '유럽(바티칸)' },
  { id: 'islam', name: '이슬람교', symbol: '☪', color: '#059669', origin: '서남아시아(메카)' },
  { id: 'buddhism', name: '불교', symbol: '☸', color: '#d97706', origin: '동남아(태국·미얀마)' },
  { id: 'hinduism', name: '힌두교', symbol: '🕉', color: '#ea580c', origin: '인도북부(바라나시)' }
];

// 모든 기기에서 절대 깨지지 않는 고정 해시 실사 이미지 풀 (Unsplash Global CDN)
const IMG = {
  vatican: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?auto=format&fit=crop&w=900&q=80',
  nyCathedral: 'https://images.unsplash.com/photo-1548625361-195fe5795df5?auto=format&fit=crop&w=900&q=80',
  rioChrist: 'https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?auto=format&fit=crop&w=900&q=80',
  mecca: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=900&q=80',
  cairoMosque: 'https://images.unsplash.com/photo-1572252821143-035a024857ac?auto=format&fit=crop&w=900&q=80',
  samarkand: 'https://images.unsplash.com/photo-1580655653885-65763b2597d0?auto=format&fit=crop&w=900&q=80',
  thaiTemple: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=900&q=80',
  eastAsiaBud: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=900&q=80',
  sriLankaBud: 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&w=900&q=80',
  varanasi: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=900&q=80',
  southIndia: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=900&q=80',
  nepalTemple: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=900&q=80',
  // 다종교 혼합국 및 역사 사건용 이미지
  koreaTemple: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=900&q=80',
  koreaChurch: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=900&q=80',
  borobudur: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=900&q=80',
  baliHindu: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80',
  istiqlal: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&w=900&q=80',
  singapore: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=900&q=80',
  nigeria: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=900&q=80',
  // 역사적 사건 테마 일러스트/배경
  sailingShip: 'https://images.unsplash.com/photo-1500930287596-c1ecaa373bb2?auto=format&fit=crop&w=900&q=80',
  desertCaravan: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=900&q=80',
  mongolSteppe: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=900&q=80',
  fortressWall: 'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&w=900&q=80',
  ancientBook: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=900&q=80'
};

// 16개 권역 데이터 (종교별 대표국 3곳씩 12곳 + 다종교 혼합국 4곳)
const REGIONS = {
  // ==================== 1. 크리스트교 대표 권역 (3곳) ====================
  '유럽(바티칸)': {
    name: '유럽(바티칸·이탈리아)',
    type: 'pure',
    preferred: '크리스트교',
    correctMethod: '직접전파',
    landmarkImg: IMG.vatican,
    landmarkName: '바티칸 성 베드로 대성당',
    desc: '로마 제국의 국교 공인 이후 유럽 전역으로 크리스트교가 확산된 역사적 중심지입니다.',
    learnPoint: '크리스트교는 팔레스타인에서 기원한 후 로마 제국을 거쳐 유럽 전역에 직접 전파되었습니다.',
    goodEvent: {
      title: '로마 제국의 국교 공인과 대성당 건립',
      desc: '박해받던 크리스트교가 로마 제국의 밀라노 칙령으로 공인되고 국교로 채택되면서 유럽 전역에 성당이 세워집니다.',
      img: IMG.vatican,
      score: 10
    },
    badEvent: {
      title: '루터의 종교 개혁과 신·구교 종교 전쟁',
      desc: '면벌부 판매에 반발한 루터와 칼뱅의 종교 개혁으로 가톨릭과 개신교가 분리되며 유럽 내 종교 전쟁으로 혼란을 겪습니다.',
      img: IMG.ancientBook,
      score: -5
    }
  },
  '미국·캐나다': {
    name: '앵글로아메리카(미국·캐나다)',
    type: 'pure',
    preferred: '크리스트교',
    correctMethod: '장거리',
    landmarkImg: IMG.nyCathedral,
    landmarkName: '뉴욕 세인트 패트릭 대성당 및 개신교 교회',
    desc: '종교의 자유를 찾아 대서양을 건넌 영국 청교도와 유럽 이주민들에 의해 크리스트교가 정착한 대륙입니다.',
    learnPoint: '앵글로아메리카는 북서부 유럽 이주민들의 해양 이주(장거리 전파)로 개신교 비율이 높게 나타납니다.',
    goodEvent: {
      title: '메이플라워호 청교도의 신대륙 개척',
      desc: '대서양을 건넌 청교도들이 북미 동부 해안에 정착촌을 세우고 도시마다 교회와 대학을 설립하며 교세를 넓힙니다.',
      img: IMG.sailingShip,
      score: 10
    },
    badEvent: {
      title: '신대륙 개척 초기 고난과 원주민 갈등',
      desc: '낯선 신대륙의 혹독한 환경과 북미 원주민들과의 영토 분쟁으로 인해 초기 정착촌 선교 활동이 시련을 겪습니다.',
      img: IMG.fortressWall,
      score: -5
    }
  },
  '브라질·남미': {
    name: '라틴아메리카(브라질·남미)',
    type: 'pure',
    preferred: '크리스트교',
    correctMethod: '장거리',
    landmarkImg: IMG.rioChrist,
    landmarkName: '리우데자네이루 구속주 예수상',
    desc: '대항해시대 스페인과 포르투갈의 신대륙 진출과 함께 가톨릭교가 대륙 전역으로 전파된 지역입니다.',
    learnPoint: '라틴아메리카는 남부 유럽(스페인·포르투갈)의 식민 지배 영향으로 가톨릭교의 비중이 압도적입니다.',
    goodEvent: {
      title: '콜럼버스의 신대륙 항해와 대항해시대 선교',
      desc: '신항로 개척 이후 스페인·포르투갈 선교사들이 대서양을 건너와 남미 전역에 가톨릭 성당을 세우고 교세를 확장합니다.',
      img: IMG.sailingShip,
      score: 10
    },
    badEvent: {
      title: '원주민 문명(잉카·아즈텍) 파괴와 저항',
      desc: '유럽 정복자들의 가혹한 식민 통치와 강제 개종에 맞서 남미 원주민들이 봉기하면서 선교 활동이 지체됩니다.',
      img: IMG.fortressWall,
      score: -5
    }
  },

  // ==================== 2. 이슬람교 대표 권역 (3곳) ====================
  '서남아시아(메카)': {
    name: '서남아시아(사우디·메카)',
    type: 'pure',
    preferred: '이슬람교',
    correctMethod: '직접전파',
    landmarkImg: IMG.mecca,
    landmarkName: '메카 마스지드 알하람과 카바 신전',
    desc: '무함마드가 이슬람교를 창시하고 전 세계 무슬림이 향해 기도하는 성지 메카가 위치한 발상지입니다.',
    learnPoint: '이슬람교는 7세기 사우디아라비아 메카에서 창시되어 서남아시아 전역으로 빠르게 확산되었습니다.',
    goodEvent: {
      title: '이슬람 제국의 영토 확장과 성지 순례(하즈)',
      desc: '아라비아반도를 통일한 이슬람 제국이 대제국으로 성장하고, 매년 메카 성지 순례를 통해 신도들이 굳게 결속합니다.',
      img: IMG.mecca,
      score: 10
    },
    badEvent: {
      title: '몽골 제국의 침략과 바그다드 함락',
      desc: '기마군단을 앞세운 몽골 제국(훌라구)의 서남아시아 침공으로 이슬람 수도 바그다드가 함락되고 종교 활동이 위축됩니다.',
      img: IMG.mongolSteppe,
      score: -5
    }
  },
  '북아프리카(이집트)': {
    name: '북부 아프리카(이집트·모로코)',
    type: 'pure',
    preferred: '이슬람교',
    correctMethod: '직접전파',
    landmarkImg: IMG.cairoMosque,
    landmarkName: '카이로 무함마드 알리 대모스크',
    desc: '서남아시아와 인접하여 일찍부터 이슬람화되었으며 사하라 사막 무역의 중심지가 된 지역입니다.',
    learnPoint: '아프리카 북부는 서남아시아와 지리적으로 인접하여 이슬람교와 아랍어가 지배적인 문화권을 형성했습니다.',
    goodEvent: {
      title: '사하라 사막 황금·소금 대상 교역로 개척',
      desc: '낙타를 이끈 무슬림 상인들이 사하라 사막의 오아시스 교역로를 장악하며 북아프리카 전역에 모스크와 학당을 세웁니다.',
      img: IMG.desertCaravan,
      score: 10
    },
    badEvent: {
      title: '십자군 전쟁 발발과 지중해 교역로 봉쇄',
      desc: '성지 회복을 내세운 유럽 십자군과의 오랜 전쟁으로 이집트와 지중해 연안의 상업 및 포교 활동이 타격을 입습니다.',
      img: IMG.fortressWall,
      score: -5
    }
  },
  '중앙아시아(우즈베크)': {
    name: '중앙아시아(사마르칸트)',
    type: 'pure',
    preferred: '이슬람교',
    correctMethod: '장거리',
    landmarkImg: IMG.samarkand,
    landmarkName: '사마르칸트 레기스탄 이슬람 신학교',
    desc: '동서양을 잇는 실크로드의 중심지로, 상업 교역을 통해 이슬람교가 깊이 뿌리내린 내륙 권역입니다.',
    learnPoint: '이슬람교는 상업 활동을 긍정하여 실크로드 육상 교역로를 따라 중앙아시아 내륙까지 널리 전파되었습니다.',
    goodEvent: {
      title: '실크로드 교역 번영과 티무르 제국의 후원',
      desc: '실크로드 오아시스 상인들이 이슬람교를 수용하고 사마르칸트에 푸른 타일의 웅장한 모스크와 신학교를 건립합니다.',
      img: IMG.samarkand,
      score: 10
    },
    badEvent: {
      title: '칭기즈 칸의 몽골군 침입과 도시 파괴',
      desc: '몽골 제국의 대규모 중앙아시아 원정으로 실크로드의 번성하던 이슬람 도시들과 도서관이 파괴되는 시련을 겪습니다.',
      img: IMG.mongolSteppe,
      score: -5
    }
  },

  // ==================== 3. 불교 대표 권역 (3곳) ====================
  '동남아(태국·미얀마)': {
    name: '동남아 대륙부(태국·미얀마)',
    type: 'pure',
    preferred: '불교',
    correctMethod: '직접전파',
    landmarkImg: IMG.thaiTemple,
    landmarkName: '방콕 왕궁 에메랄드 사원(왓 프라깨우)',
    desc: '개인의 수행과 해탈을 중시하는 상좌부 불교가 인도차이나반도 전역에 국교 수준으로 자리 잡은 권역입니다.',
    learnPoint: '동남아시아 대륙부(태국, 미얀마, 캄보디아 등)는 남방 전파를 통해 상좌부 불교가 주민의 삶을 지배합니다.',
    goodEvent: {
      title: '동남아 왕실의 불교 국교화와 황금 불탑 건립',
      desc: '역대 국왕들이 불교를 국가 통치 이념으로 삼고 거대한 황금 사원을 건립하며 출가 전통이 일상으로 자리 잡습니다.',
      img: IMG.thaiTemple,
      score: 10
    },
    badEvent: {
      title: '왕조 간 전쟁과 서구 제국주의 식민 침략',
      desc: '인접 왕국 간의 전쟁으로 고대 사원이 파손되고 영국·프랑스의 식민 지배가 시작되면서 왕실 사원 후원이 축소됩니다.',
      img: IMG.fortressWall,
      score: -5
    }
  },
  '동아시아(중국·티베트)': {
    name: '동부 아시아(중국·티베트·일본)',
    type: 'pure',
    preferred: '불교',
    correctMethod: '장거리',
    landmarkImg: IMG.eastAsiaBud,
    landmarkName: '동아시아 대승 불교 대사찰과 석굴',
    desc: '실크로드 교역로를 따라 인도에서 중국, 한반도, 일본으로 대승 불교가 확산된 문화권입니다.',
    learnPoint: '동부 아시아에는 실크로드 육상 교역로를 통해 중생 구제를 강조하는 대승 불교가 장거리 전파되었습니다.',
    goodEvent: {
      title: '실크로드 구법승(현장·혜초)의 경전 번역과 석굴 조성',
      desc: '험난한 사막을 건너 인도에 다녀온 구법승들이 불경을 한자로 번역하고 둔황·용문석굴 등 대불상을 조성합니다.',
      img: IMG.eastAsiaBud,
      score: 10
    },
    badEvent: {
      title: '황실의 사원 탄압(회창폐불)과 유교 세력의 견제',
      desc: '사찰의 토지와 면세 특권이 지나치게 커지자 황실이 사원을 강제 철거하고 승려를 환속시켜 교세가 위축됩니다.',
      img: IMG.ancientBook,
      score: -5
    }
  },
  '스리랑카': {
    name: '스리랑카(남부 아시아 불교 거점)',
    type: 'pure',
    preferred: '불교',
    correctMethod: '직접전파',
    landmarkImg: IMG.sriLankaBud,
    landmarkName: '스리랑카 캔디 불치사(부처님 치아 사리 사원)',
    desc: '인도 아소카왕 시기 가장 먼저 불교가 전해져 원형 경전을 보존하고 동남아로 불교를 전파한 섬나라입니다.',
    learnPoint: '스리랑카는 인도 바로 남쪽에 위치하여 기원전 3세기경 불교가 직접 전파된 상좌부 불교의 핵심 거점입니다.',
    goodEvent: {
      title: '인도 아소카왕의 전법사 파견과 불경 결집',
      desc: '마우리아 왕조 아소카왕의 아들 마힌다 승려가 스리랑카에 불교를 전하고 팔리어 경전을 기록하여 교세를 확립합니다.',
      img: IMG.sriLankaBud,
      score: 10
    },
    badEvent: {
      title: '유럽 열강(포르투갈·영국)의 식민 통치와 개종 압박',
      desc: '대항해시대 이후 포르투갈, 네덜란드, 영국이 차례로 섬을 지배하며 기독교 선교를 강요해 전통 사원이 시련을 겪습니다.',
      img: IMG.sailingShip,
      score: -5
    }
  },

  // ==================== 4. 힌두교 대표 권역 (3곳) ====================
  '인도북부(바라나시)': {
    name: '인도 북부(바라나시·갠지스강)',
    type: 'pure',
    preferred: '힌두교',
    correctMethod: '직접전파',
    landmarkImg: IMG.varanasi,
    landmarkName: '바라나시 갠지스강 가트와 힌두 사원',
    desc: '갠지스강을 성스러운 강으로 숭배하며 윤회 사상과 카스트 제도가 뿌리내린 힌두교의 발상지입니다.',
    learnPoint: '힌두교는 인도에서 자연 발생한 민족 종교로, 갠지스강 정화 의식 등 인도인의 일상생활과 밀접합니다.',
    goodEvent: {
      title: '굽타 왕조의 힌두교 부흥과 갠지스강 순례 정착',
      desc: '인도 고전 문화의 황금기인 굽타 왕조의 후원으로 힌두 경전이 보급되고 갠지스강 쿰브 멜라 순례가 번성합니다.',
      img: IMG.varanasi,
      score: 10
    },
    badEvent: {
      title: '이슬람 왕조(무굴 제국)의 북인도 정복과 갈등',
      desc: '이슬람 세력이 북인도를 정복하여 왕조를 세우면서 일부 힌두 사원이 파괴되고 비무슬림 세금(지즈야)이 부과됩니다.',
      img: IMG.fortressWall,
      score: -5
    }
  },
  '인도남부(마두라이)': {
    name: '인도 남부(타밀나두·마두라이)',
    type: 'pure',
    preferred: '힌두교',
    correctMethod: '직접전파',
    landmarkImg: IMG.southIndia,
    landmarkName: '남인도 마두라이 미나크시 사원(고푸람 탑문)',
    desc: '외세의 침입이 비교적 적어 화려하고 거대한 석조 탑문(고푸람)을 가진 정통 힌두 사원들이 밀집한 지역입니다.',
    learnPoint: '인도 남부는 힌두교 전통이 가장 원형에 가깝게 보존되어 있으며 화려한 신상 조각의 사원 건축이 발달했습니다.',
    goodEvent: {
      title: '남인도 힌두 왕조의 거대 탑문(고푸람) 사원 건립',
      desc: '촐라·비자야나가르 왕조의 강력한 후원 아래 수천 개의 신상이 조각된 거대한 사원 도시가 건설되어 신앙이 꽃피웁니다.',
      img: IMG.southIndia,
      score: 10
    },
    badEvent: {
      title: '영국 동인도회사의 인도 식민 지배와 근대화 마찰',
      desc: '영국의 인도 식민 통치가 본격화되면서 사원의 자치권이 축소되고 서구 문물과의 충돌로 혼란이 빚어집니다.',
      img: IMG.sailingShip,
      score: -5
    }
  },
  '네팔(카트만두)': {
    name: '네팔(카트만두 분지)',
    type: 'pure',
    preferred: '힌두교',
    correctMethod: '직접전파',
    landmarkImg: IMG.nepalTemple,
    landmarkName: '네팔 카트만두 파슈파티나트 힌두 사원',
    desc: '인도와 맞닿은 히말라야 산맥의 국가로, 인구의 80% 이상이 힌두교를 믿는 대표적인 힌두 문화권입니다.',
    learnPoint: '힌두교는 인도와 인접한 네팔 등 남부 아시아 주변 지역으로 직접 전파되어 다수 종교를 이루고 있습니다.',
    goodEvent: {
      title: '히말라야 왕실의 힌두교 수호와 성지 번영',
      desc: '네팔 왕실이 힌두교를 국교로 수호하고 시바 신을 모시는 파슈파티나트 사원을 확장하여 순례자들이 모여듭니다.',
      img: IMG.nepalTemple,
      score: 10
    },
    badEvent: {
      title: '히말라야 대지진으로 인한 고대 사원 파손',
      desc: '카트만두 분지를 강타한 대규모 지진과 험준한 산악 지형의 고립으로 유서 깊은 사원 건축물들이 피해를 입었습니다.',
      img: IMG.mongolSteppe,
      score: -5
    }
  },

  // ==================== 5. 다종교 혼합·교차 권역 (4곳) — 종교별 역사 완전 분리 ====================
  '한국(종합)': {
    name: '한국(동아시아 다종교 공존)',
    type: 'hybrid',
    desc: '삼국·고려시대의 불교 전통과 조선의 유교, 근현대의 천주교·개신교가 유입되어 평화롭게 공존하는 국가입니다.',
    learnPoint: '한국은 불교와 크리스트교(개신교·천주교)가 고르게 분포하며 종교 간 갈등 없이 공존하는 대표적인 다종교 국가입니다.',
    byReligion: {
      '불교': {
        landmarkImg: IMG.koreaTemple,
        landmarkName: '경주 불국사와 다보탑·석가탑',
        good: {
          title: '삼국·고려시대 불교 국교 채택과 팔만대장경 판각',
          desc: '왕실이 불교를 공인하고 호국불교로 발전시켜 불국사 창건과 고려 팔만대장경 판각 등 찬란한 불교 문화를 꽃피웠습니다.',
          img: IMG.koreaTemple,
          score: 10
        },
        bad: {
          title: '조선 건국과 성리학 중심의 숭유억불 정책',
          desc: '조선을 세운 사대부들이 성리학(유교)을 국교로 삼으면서 도성 내 사찰을 폐쇄하고 승려의 도성 출입을 금지했습니다.',
          img: IMG.ancientBook,
          score: -5
        }
      },
      '크리스트교': {
        landmarkImg: IMG.koreaChurch,
        landmarkName: '서울 명동성당 및 근대 선교 학교',
        good: {
          title: '실학자의 자발적 서학 수용과 개화기 학교·병원 설립',
          desc: '조선 후기 학자들이 서학(천주교)을 스스로 연구해 받아들이고, 개화기 선교사들이 근대 학교와 병원을 세워 크게 확산됩니다.',
          img: IMG.koreaChurch,
          score: 10
        },
        bad: {
          title: '조선 후기 천주교 탄압(신유박해·병인박해)',
          desc: '조상 제사 거부를 유교 질서 파괴로 여긴 흥선대원군과 조선 조정의 대규모 박해로 수많은 신자가 순교했습니다.',
          img: IMG.fortressWall,
          score: -5
        }
      },
      '이슬람교': {
        landmarkImg: IMG.cairoMosque,
        landmarkName: '서울 한남동 중앙성원 및 고려 벽란도 교역소',
        good: {
          title: '고려 벽란도 아랍 상인(대식국) 교역과 서울 중앙성원',
          desc: '고려시대 국제 무역항 벽란도에 아랍 상인들이 내왕하며 코리아(Korea)를 알리고, 현대에는 서울 중앙성원이 건립됩니다.',
          img: IMG.desertCaravan,
          score: 10
        },
        bad: {
          title: '조선 세종 시기 회회교(이슬람) 고유 풍습 금지령',
          desc: '유교적 예법을 정비하던 조선 세종이 국내 거주 무슬림(회회인)의 고유 복장과 의식을 금하여 초기 교세가 끊어졌습니다.',
          img: IMG.ancientBook,
          score: -5
        }
      },
      '힌두교': {
        landmarkImg: IMG.varanasi,
        landmarkName: '김해 가야 허황옥 기념 파사석탑 및 인도 문화원',
        good: {
          title: '가야 김수로왕·인도 허황옥 설화와 현대 요가 열풍',
          desc: '고대 인도 아유타국 공주 허황옥의 도래 설화와 더불어 현대 한국 사회의 인도 요가·명상 열풍으로 문화적 친밀도가 높아집니다.',
          img: IMG.varanasi,
          score: 10
        },
        bad: {
          title: '동아시아 유교·불교 중심 사회와의 문화적 거리감',
          desc: '오랫동안 불교·유교·크리스트교가 자리 잡은 한국 사회에서 카스트 제도와 다신교 교리가 정착하는 데 한계를 겪었습니다.',
          img: IMG.ancientBook,
          score: -5
        }
      }
    }
  },

  '인도네시아(종합)': {
    name: '인도네시아·말레이(동남아 도서 종합)',
    type: 'hybrid',
    desc: '고대 힌두교·불교 왕국이 번성한 후 인도양 무슬림 상인의 해상 무역으로 이슬람교가 주류가 된 중층 문화권입니다.',
    learnPoint: '동남아시아 도서 지역은 불교(보로부두르)·힌두교(발리) 유적 위에 해상 무역으로 전파된 이슬람교가 공존합니다.',
    byReligion: {
      '이슬람교': {
        landmarkImg: IMG.istiqlal,
        landmarkName: '자카르타 이스티클랄 대모스크',
        good: {
          title: '인도양 향신료 해상 무역과 이슬람 술탄국의 성립',
          desc: '향신료를 거래하던 아랍·인도 무슬림 상인들을 통해 해안 왕국들이 평화적으로 이슬람을 수용하여 세계 최대 무슬림 국가가 됩니다.',
          img: IMG.sailingShip,
          score: 10
        },
        bad: {
          title: '포르투갈·네덜란드 동인도회사(VOC)의 무역항 침략',
          desc: '대항해시대 유럽 함대가 말라카 해협과 향신료 제도를 무력 점령하면서 현지 이슬람 상권과 술탄국이 타격을 입었습니다.',
          img: IMG.fortressWall,
          score: -5
        }
      },
      '불교': {
        landmarkImg: IMG.borobudur,
        landmarkName: '자바섬 세계 최대 불교 유적 보로부두르 대불탑',
        good: {
          title: '고대 해상 왕국(스리위자야·샤일렌드라)과 보로부두르 건립',
          desc: '해상 실크로드를 장악한 고대 불교 왕국들이 자바섬에 세계 최대 규모의 석조 불탑인 보로부두르를 건설합니다.',
          img: IMG.borobudur,
          score: 10
        },
        bad: {
          title: '자바섬 화산 대폭발과 해상 주도권의 이동',
          desc: '머라피 화산 폭발로 보로부두르가 화산재에 묻히고, 해상 무역 주도권이 이슬람 세력으로 넘어가며 불교 왕국이 쇠퇴합니다.',
          img: IMG.mongolSteppe,
          score: -5
        }
      },
      '힌두교': {
        landmarkImg: IMG.baliHindu,
        landmarkName: '발리 울룬 다누 브라탄 힌두 사원',
        good: {
          title: '마자파힛 힌두 제국의 번영과 발리 힌두 문화 수호',
          desc: '고대 인도네시아를 통일한 마자파힛 힌두 제국의 전통이 발리섬에 보존되어 세계적인 사원과 축제 문화를 꽃피웁니다.',
          img: IMG.baliHindu,
          score: 10
        },
        bad: {
          title: '이슬람 데막 술탄국의 부상과 힌두 왕조의 후퇴',
          desc: '해안 무역 도시들이 이슬람화되면서 내륙의 마자파힛 힌두 왕조가 멸망하고 힌두 세력이 발리섬으로 축소되었습니다.',
          img: IMG.fortressWall,
          score: -5
        }
      },
      '크리스트교': {
        landmarkImg: IMG.nyCathedral,
        landmarkName: '자카르타 대성당 및 동부 도서 교회',
        good: {
          title: '대항해시대 선교사의 활동과 동부 도서 지역 정착',
          desc: '프란치스코 하비에르 등 유럽 선교사들의 활동과 근대 학교 설립으로 플로레스섬 등 동부 도서에 크리스트교가 정착합니다.',
          img: IMG.sailingShip,
          score: 10
        },
        bad: {
          title: '서구 식민 통치에 맞선 아체 술탄국 등 현지인의 저항',
          desc: '네덜란드 식민 지배에 대한 반감이 서구 종교에 대한 경계로 이어져 이슬람 세력이 강한 지역에서 선교가 저지됩니다.',
          img: IMG.fortressWall,
          score: -5
        }
      }
    }
  },

  '싱가포르(종합)': {
    name: '싱가포르(국제 교통 허브 다종교 공존)',
    type: 'hybrid',
    desc: '동서양 해상 무역의 요충지로 중국계(불교), 말레이계(이슬람), 인도계(힌두교), 유럽계(크리스트교)가 함께 살아가는 도시국가입니다.',
    learnPoint: '싱가포르는 국제 무역항으로 성장하며 이주해 온 다양한 민족에 의해 4대 종교가 한 도시에 조화롭게 분포합니다.',
    byReligion: {
      '불교': {
        landmarkImg: IMG.singapore,
        landmarkName: '싱가포르 차이나타운 불아사(부처님 치아 사리 사원)',
        good: {
          title: '중국 남부 화교의 대거 이주와 차이나타운 불아사 건립',
          desc: '19세기 중반 이후 무역항 싱가포르로 이주한 수많은 중국계 화교들이 사찰을 건립하여 불교가 최대 종교로 자리 잡습니다.',
          img: IMG.singapore,
          score: 10
        },
        bad: {
          title: '다민족 국가의 엄격한 종교화합유지법(MRHA) 규제',
          desc: '종교 간 갈등을 막기 위해 제정된 싱가포르 법률에 따라 공공장소에서의 과열 포교 활동이 엄격히 통제됩니다.',
          img: IMG.ancientBook,
          score: -5
        }
      },
      '이슬람교': {
        landmarkImg: IMG.cairoMosque,
        landmarkName: '싱가포르 캄퐁글람 술탄 모스크',
        good: {
          title: '말레이 토착 무슬림과 아랍 무역상 거점(술탄 모스크) 번영',
          desc: '말라카 해협의 원주민인 말레이계 무슬림과 아랍 상인들이 캄퐁글람에 황금 돔의 술탄 모스크를 세우고 교류합니다.',
          img: IMG.desertCaravan,
          score: 10
        },
        bad: {
          title: '영국 자유무역항 개항과 타 민족 유입에 따른 비중 감소',
          desc: '영국 식민 당국이 중국·인도계 이민자를 대거 받아들이면서 원래 다수였던 말레이계 무슬림이 약 15% 비중으로 축소됩니다.',
          img: IMG.sailingShip,
          score: -5
        }
      },
      '힌두교': {
        landmarkImg: IMG.southIndia,
        landmarkName: '싱가포르 스리 마리암만 힌두 사원',
        good: {
          title: '남인도 타밀족 이주와 리틀인디아 디파발리 축제',
          desc: '영국 식민 시기 인도 남부에서 이주한 타밀족들이 가장 오래된 힌두 사원인 스리 마리암만 사원을 세우고 문화를 보존합니다.',
          img: IMG.southIndia,
          score: 10
        },
        bad: {
          title: '고밀도 금융 도시 재개발과 높은 사원 부지 비용',
          desc: '좁은 국토 면적과 세계 최고 수준의 부동산 비용으로 인해 도심 내 추가적인 사원 확장이 공간적 한계에 부딪힙니다.',
          img: IMG.singapore,
          score: -5
        }
      },
      '크리스트교': {
        landmarkImg: IMG.nyCathedral,
        landmarkName: '싱가포르 세인트 앤드류 대성당',
        good: {
          title: '영국 동인도회사의 개항과 서구식 미션스쿨 교육 확산',
          desc: '1819년 영국인 래플스의 싱가포르 개항 이후 대성당과 기독교 학교들이 설립되어 고학력 시민층을 중심으로 교세가 성장합니다.',
          img: IMG.sailingShip,
          score: 10
        },
        bad: {
          title: '다종교 화합 보호를 위한 거리 전도 및 집회 제한',
          desc: '타 종교 신자에게 불쾌감을 주는 공격적인 전도를 싱가포르 정부가 법적으로 제지하여 포교 방식에 제약을 받습니다.',
          img: IMG.ancientBook,
          score: -5
        }
      }
    }
  },

  '나이지리아(종합)': {
    name: '나이지리아(아프리카 북부·남부 종교 교차지)',
    type: 'hybrid',
    desc: '사하라 사막 무역로로 전파된 북부의 이슬람교(약 50%)와 대서양 해안 선교로 전파된 남부의 크리스트교(약 48%)가 맞닿은 국가입니다.',
    learnPoint: '나이지리아는 북부 이슬람교와 남부 크리스트교가 팽팽히 맞서는 아프리카의 대표적인 종교 점이지대입니다.',
    byReligion: {
      '이슬람교': {
        landmarkImg: IMG.mecca,
        landmarkName: '나이지리아 아부자 국립 모스크',
        good: {
          title: '사하라 종단 무역과 북부 소코토 칼리프국(이슬람 왕국) 성립',
          desc: '사하라 교역로를 통해 이슬람을 받아들인 북부 하우사·풀라니족이 소코토 칼리프국을 세우며 서아프리카 최대 교세를 이룹니다.',
          img: IMG.desertCaravan,
          score: 10
        },
        bad: {
          title: '북부(이슬람)와 남부(크리스트교) 경계선의 종파 갈등',
          desc: '북부 주정부의 이슬람 율법(샤리아) 도입을 둘러싸고 남부 크리스트교 주민들과 무력 충돌이 빚어져 혼란을 겪습니다.',
          img: IMG.fortressWall,
          score: -5
        }
      },
      '크리스트교': {
        landmarkImg: IMG.nyCathedral,
        landmarkName: '나이지리아 아부자 국립 기독교 센터 대성당',
        good: {
          title: '대서양 해안 선교와 귀환 노예들의 남부 교회·학교 설립',
          desc: '19세기 영국 선교사들과 해방 노예 출신 아프리카 성직자(크라우더 주교 등)가 남부 해안에 학교와 교회를 세워 대부흥을 이룹니다.',
          img: IMG.sailingShip,
          score: 10
        },
        bad: {
          title: '내륙 열대 우림의 말라리아 풍토병과 북부 이슬람 장벽',
          desc: '초기 선교사들이 열대 말라리아 풍토병으로 큰 희생을 치르고, 북부의 견고한 이슬람 왕국에 막혀 북상이 저지됩니다.',
          img: IMG.nigeria,
          score: -5
        }
      },
      '불교': {
        landmarkImg: IMG.thaiTemple,
        landmarkName: '서아프리카 국제 평화 명상 센터',
        good: {
          title: '현대 아프리카 구호 활동과 비폭력 평화 명상 운동',
          desc: '종파 갈등에 지친 나이지리아 지식인들과 청년들이 불교의 평화·명상 철학에 공감하며 도심 명상 센터가 문을 엽니다.',
          img: IMG.thaiTemple,
          score: 10
        },
        bad: {
          title: '역사적 교류 부재와 기독교·이슬람 양강 구도의 장벽',
          desc: '역사적으로 아시아 불교권과 지리적 교류가 없었으며, 이미 인구의 98%가 양대 종교를 믿고 있어 교세 확장이 어렵습니다.',
          img: IMG.nigeria,
          score: -5
        }
      },
      '힌두교': {
        landmarkImg: IMG.varanasi,
        landmarkName: '라고스 인도계 무역상 커뮤니티 사원',
        good: {
          title: '영연방 인도계 상인의 서아프리카 진출과 볼리우드 열풍',
          desc: '해상 무역과 기업 활동으로 정착한 인도계 주민들이 사원을 세우고, 인도 영화(볼리우드) 인기로 힌두 축제가 알려집니다.',
          img: IMG.varanasi,
          score: 10
        },
        bad: {
          title: '민족 종교 특유의 비포교 전통과 지리적 거리감',
          desc: '외부 민족에게 개종을 적극 권유하지 않는 힌두교의 전통과 먼 거리로 인해 아프리카 현지인 전파에 한계를 겪습니다.',
          img: IMG.nigeria,
          score: -5
        }
      }
    }
  }
};

let players = [];
let currentTurnIndex = 0;
let gameStarted = false;
let soloMode = false;

let mapOwnership = {};
function resetMapOwnership() {
  mapOwnership = {
    '유럽(바티칸)': '크리스트교',
    '미국·캐나다': null,
    '브라질·남미': null,
    '서남아시아(메카)': '이슬람교',
    '북아프리카(이집트)': null,
    '중앙아시아(우즈베크)': null,
    '동남아(태국·미얀마)': '불교',
    '동아시아(중국·티베트)': null,
    '스리랑카': null,
    '인도북부(바라나시)': '힌두교',
    '인도남부(마두라이)': null,
    '네팔(카트만두)': null,
    '한국(종합)': null,
    '인도네시아(종합)': null,
    '싱가포르(종합)': null,
    '나이지리아(종합)': null
  };
}
resetMapOwnership();

let religionStates = {};
function resetReligionStates() {
  religionStates = {
    '크리스트교': { score: 60, regions: ['유럽(바티칸)'], ownerId: null },
    '이슬람교': { score: 60, regions: ['서남아시아(메카)'], ownerId: null },
    '불교': { score: 60, regions: ['동남아(태국·미얀마)'], ownerId: null },
    '힌두교': { score: 60, regions: ['인도북부(바라나시)'], ownerId: null }
  };
}
resetReligionStates();

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

    const relSymbol = RELIGIONS.find(r => r.name === activeReligion).symbol;
    let step1Card = null;
    let step2Event = null;
    let territorialSuccess = false;

    if (region.type === 'hybrid') {
      // 다종교 혼합 권역: 각 종교별로 고유한 랜드마크와 실제 정착/갈등 역사가 50:50으로 등장
      territorialSuccess = true;
      const relInfo = region.byReligion[activeReligion];
      const baseGain = 40; // 혼합국 기본 점수

      step1Card = {
        headerTitle: '⚜ 종교 전파 결과 ⚜',
        badgeText: '🤝 다종교 혼합·공존 권역 (+40점)',
        img: relInfo.landmarkImg,
        landmarkName: relInfo.landmarkName,
        title: `${activeReligion} ➔ ${region.name}`,
        desc: region.desc,
        baseGain: baseGain,
        methodNote: `전파 방식 [${method}] 완료! 이어서 ${region.name}에서 [${activeReligion}]가 겪은 실제 역사적 사건을 확인하세요.`
      };

      const ev = (Math.random() < 0.5) ? relInfo.good : relInfo.bad;
      step2Event = {
        headerTitle: '⚜ 역사적 특수 이벤트 ⚜',
        tag: `${relSymbol} ${region.name} · ${activeReligion}`,
        title: ev.title,
        desc: ev.desc,
        img: ev.img,
        score: ev.score,
        learnPoint: region.learnPoint
      };
    } else if (region.preferred === activeReligion) {
      // 단일 주류 종교 일치 (정답!)
      territorialSuccess = true;
      const isMethodRight = (region.correctMethod === method);
      const baseGain = isMethodRight ? 55 : 30; // 방식까지 맞으면 +55점, 방식이 틀리면 +30점

      step1Card = {
        headerTitle: '⚜ 종교 전파 성공 ⚜',
        badgeText: isMethodRight
          ? '🌟 주류 종교 + 전파 방식 완벽 일치! (+55점)'
          : `⚠️ 주류 종교 일치 / 전파 방식 착오 (+30점)`,
        img: region.landmarkImg,
        landmarkName: region.landmarkName,
        title: `${activeReligion} ➔ ${region.name}`,
        desc: region.desc,
        baseGain: baseGain,
        methodNote: isMethodRight
          ? `정답! 실제 역사적 전파 방식인 [${region.correctMethod}]를 정확히 선택하여 보너스(+15점)를 획득했습니다!`
          : `아쉽습니다! 이 지역의 주류 종교는 맞았으나, 실제 역사적 전파 경로는 [${region.correctMethod}]여서 점수가 일부 차감되었습니다.`
      };

      const ev = (Math.random() < 0.5) ? region.goodEvent : region.badEvent;
      step2Event = {
        headerTitle: '⚜ 역사적 특수 이벤트 ⚜',
        tag: `${relSymbol} ${region.name} · ${activeReligion}`,
        title: ev.title,
        desc: ev.desc,
        img: ev.img,
        score: ev.score,
        learnPoint: region.learnPoint
      };
    } else {
      // 단일 주류 종교 불일치 (오답! 즉시 -20점 페널티 및 영토 점유 실패)
      territorialSuccess = false;
      step1Card = {
        headerTitle: '⚜ 종교 전파 실패 ⚜',
        badgeText: `❌ 타 종교 강세 권역 (실제 주류: ${region.preferred})`,
        img: IMG.fortressWall,
        landmarkName: `전파 실패: ${region.preferred}의 강력한 문화 장벽`,
        title: `${activeReligion} ➔ ${region.name} 전파 좌절`,
        desc: `오답입니다! [${region.name}] 지역은 역사적으로 [${region.preferred}]가 깊게 뿌리내린 대표 권역이어서 전파에 실패했습니다.`,
        baseGain: -20,
        methodNote: `기존 주류 종교(${region.preferred})의 강력한 전통과 반발에 부딪혀 명성이 20점 감소합니다.`
      };

      step2Event = {
        headerTitle: '⚜ 오답 분석 및 역사 배경 ⚜',
        tag: `📖 ${region.name}의 실제 역사 (주류: ${region.preferred})`,
        title: `왜 이 지역은 [${region.preferred}]가 강할까?`,
        desc: `${region.desc} (${region.goodEvent.title}: ${region.goodEvent.desc})`,
        img: region.landmarkImg,
        score: 0,
        learnPoint: region.learnPoint
      };
    }

    const totalTurnDelta = step1Card.baseGain + step2Event.score;
    rState.score = Math.max(0, rState.score + totalTurnDelta);

    // 오답이 아닌 경우에만 지도 영토 색칠 업데이트
    if (territorialSuccess) {
      const prevOwner = mapOwnership[regionKey];
      if (prevOwner && prevOwner !== activeReligion) {
        religionStates[prevOwner].regions = religionStates[prevOwner].regions.filter(r => r !== regionKey);
      }
      mapOwnership[regionKey] = activeReligion;
      if (!rState.regions.includes(regionKey)) {
        rState.regions.push(regionKey);
      }
    }

    io.emit('turnResultTwoStep', {
      actorReligion: activeReligion,
      regionKey,
      method,
      step1Card,
      step2Event,
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
      resetMapOwnership();
      resetReligionStates();
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
