const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// ============================================================================
// 서버 사이드 이미지 프록시 & 메모리 캐시 엔진 (브라우저 엑박 및 차단 100% 방지)
// ============================================================================
const imageMemoryCache = new Map();
const USER_AGENT = 'WorldReligionEduGame/2.0 (https://religion-gam.onrender.com; educational classroom game)';

async function resolveWikimediaImageUrl(wiki, q) {
  // 1차: 위키백과 공식 PageImages API (redirects=1로 문서 이동 자동 추적, 문자열 강제 치환 없음)
  if (wiki) {
    const [lang, ...titleParts] = wiki.split(':');
    const title = titleParts.join(':');
    if (lang && title) {
      try {
        const apiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&piprop=thumbnail|original&pithumbsize=640&redirects=1&format=json`;
        const res = await fetch(apiUrl, { headers: { 'User-Agent': USER_AGENT } });
        if (res.ok) {
          const data = await res.json();
          const pages = data?.query?.pages;
          if (pages) {
            const page = Object.values(pages)[0];
            if (page?.thumbnail?.source) return page.thumbnail.source;
            if (page?.original?.source) return page.original.source;
          }
        }
      } catch (e) {
        console.warn('Wiki PageImages API warn:', e.message);
      }
    }
  }

  // 2차: 위키미디어 공용(Wikimedia Commons) 공식 비트맵 검색 엔진 (1억 장의 실사·명화 중 1순위 추출)
  if (q) {
    try {
      const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent('filetype:bitmap ' + q)}&gsrlimit=4&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json`;
      const res = await fetch(commonsUrl, { headers: { 'User-Agent': USER_AGENT } });
      if (res.ok) {
        const data = await res.json();
        const pages = data?.query?.pages;
        if (pages) {
          for (const p of Object.values(pages)) {
            const info = p?.imageinfo?.[0];
            if (info?.thumburl) return info.thumburl;
            if (info?.url) return info.url;
          }
        }
      }
    } catch (e) {
      console.warn('Commons Search API warn:', e.message);
    }
  }

  return null;
}

// 내장 고화질 SVG 백업 생성기 (외부 네트워크 완전 단절 시에만 작동)
function createBackupSvgBuffer(label) {
  const safeLabel = (label || '세계 종교 역사 기록').replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#bg)"/>
    <rect x="24" y="24" width="752" height="452" fill="none" stroke="#c5a059" stroke-width="4"/>
    <circle cx="400" cy="200" r="55" fill="none" stroke="#f5d78e" stroke-width="3"/>
    <path d="M 360 200 L 440 200 M 400 160 L 400 240" stroke="#f5d78e" stroke-width="3"/>
    <text x="400" y="310" fill="#f5d78e" font-size="26" font-family="serif" font-weight="bold" text-anchor="middle">${safeLabel}</text>
  </svg>`;
  return Buffer.from(svg, 'utf-8');
}

app.get('/api/image', async (req, res) => {
  const { wiki = '', q = '', label = '' } = req.query;
  const cacheKey = `${wiki}|${q}`;

  if (imageMemoryCache.has(cacheKey)) {
    const cached = imageMemoryCache.get(cacheKey);
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(cached.buffer);
  }

  try {
    const targetUrl = await resolveWikimediaImageUrl(wiki, q);
    if (targetUrl) {
      const imgRes = await fetch(targetUrl, { headers: { 'User-Agent': USER_AGENT } });
      if (imgRes.ok) {
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        imageMemoryCache.set(cacheKey, { buffer, contentType });
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
    }
  } catch (err) {
    console.warn('Image proxy fetch error:', err.message);
  }

  const backupBuf = createBackupSvgBuffer(label || q || wiki);
  res.setHeader('Content-Type', 'image/svg+xml');
  return res.send(backupBuf);
});

function buildImgPath(wiki, q, label) {
  return `/api/image?wiki=${encodeURIComponent(wiki)}&q=${encodeURIComponent(q)}&label=${encodeURIComponent(label || '')}`;
}

const RELIGIONS = [
  { id: 'christianity', name: '크리스트교', symbol: '✝', color: '#7c3aed', origin: '유럽(바티칸)' },
  { id: 'islam', name: '이슬람교', symbol: '☪', color: '#059669', origin: '서남아(메카)' },
  { id: 'buddhism', name: '불교', symbol: '☸', color: '#d97706', origin: '태국·미얀마' },
  { id: 'hinduism', name: '힌두교', symbol: '🕉', color: '#ea580c', origin: '북인도(갠지스)' }
];

// 16개 권역 데이터 (종교별 주류 대표 3곳씩 12곳 + 다종교 혼합 4곳)
const REGIONS = {
  // ==================== 1. 크리스트교 대표 권역 (3곳) ====================
  '유럽(바티칸)': {
    name: '유럽(바티칸·이탈리아)',
    type: 'pure',
    preferred: '크리스트교',
    correctMethod: '직접전파',
    landmarkImg: buildImgPath("en:St._Peter's_Basilica", "St. Peter's Basilica Vatican", '바티칸 성 베드로 대성당'),
    landmarkName: '바티칸 성 베드로 대성당',
    desc: '로마 제국의 국교 공인 이후 유럽 전역으로 크리스트교가 확산된 역사적 중심지입니다.',
    learnPoint: '크리스트교는 팔레스타인에서 기원한 후 로마 제국을 거쳐 유럽 전역에 전파되었습니다.',
    goodEvent: {
      img: buildImgPath('en:Constantine_the_Great', 'Constantine the Great Christianity painting', '로마 제국의 크리스트교 국교 공인'),
      title: '로마 제국의 크리스트교 국교 공인',
      desc: '박해받던 크리스트교가 밀라노 칙령으로 공인되고 로마의 국교로 지정되면서 유럽 전역으로 전파됩니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Reformation', 'Martin Luther 95 Theses Reformation', '루터의 종교 개혁과 신·구교 분열'),
      title: '루터의 종교 개혁과 신·구교 분열',
      desc: '면벌부 판매 비판으로 시작된 종교 개혁과 전쟁으로 인해 유럽 교계가 가톨릭과 개신교로 분열되어 명성이 일부 감소합니다.',
      score: -5
    }
  },
  '미국·캐나다': {
    name: '앵글로아메리카(미국·캐나다)',
    type: 'pure',
    preferred: '크리스트교',
    correctMethod: '장거리',
    landmarkImg: buildImgPath("en:St._Patrick's_Cathedral_(New_York_City)", "St. Patrick's Cathedral New York", '뉴욕 세인트 패트릭 대성당'),
    landmarkName: '뉴욕 세인트 패트릭 대성당',
    desc: '종교의 자유를 찾아 대서양을 건넌 영국 청교도와 유럽 이주민들에 의해 크리스트교가 정착한 대륙입니다.',
    learnPoint: '앵글로아메리카는 북서부 유럽 이주민들의 해양 이주(장거리 전파)로 개신교 비율이 높게 나타납니다.',
    goodEvent: {
      img: buildImgPath('en:Mayflower', 'Mayflower ship Pilgrims Plymouth painting', '메이플라워호 청교도의 대서양 항해'),
      title: '메이플라워호 청교도의 대서양 항해와 개척',
      desc: '메이플라워호를 타고 대서양을 건넌 이주민들이 북미 해안에 정착촌과 교회를 세우며 교세를 확장합니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:The_Ninth_Wave', 'Ivan Aivazovsky The Ninth Wave storm ship', '대서양 항해 폭풍우와 초기 정착 고난'),
      title: '대서양 항해 폭풍우와 초기 정착 고난',
      desc: '대서양 횡단 중 거센 폭풍우를 만나고 낯선 신대륙의 혹독한 첫 겨울 추위로 인해 정착촌이 시련을 겪습니다.',
      score: -5
    }
  },
  '브라질·남미': {
    name: '라틴아메리카(브라질·남미)',
    type: 'pure',
    preferred: '크리스트교',
    correctMethod: '장거리',
    landmarkImg: buildImgPath('en:Christ_the_Redeemer_(statue)', 'Christ the Redeemer Rio de Janeiro statue', '리우데자네이루 구속주 예수상'),
    landmarkName: '리우데자네이루 구속주 예수상',
    desc: '대항해시대 스페인과 포르투갈의 식민 지배 및 적극적인 가톨릭 선교로 대륙 대부분이 가톨릭을 믿는 지역입니다.',
    learnPoint: '라틴아메리카는 남부 유럽(스페인·포르투갈)의 식민 지배 영향으로 가톨릭교의 비중이 압도적입니다.',
    goodEvent: {
      img: buildImgPath('en:Voyages_of_Christopher_Columbus', 'Landing of Columbus painting', '콜럼버스의 항해와 대항해시대 선교'),
      title: '콜럼버스의 항해와 대항해시대 선교',
      desc: '신항로 개척 이후 유럽 선교사들이 대서양을 건너 아메리카 대륙 전역에 가톨릭 성당을 세우고 교세를 넓힙니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Spanish_conquest_of_the_Aztec_Empire', 'Conquest of Mexico Aztec Spanish painting', '아즈텍·잉카 원주민의 저항과 갈등'),
      title: '아즈텍·잉카 원주민의 저항과 갈등',
      desc: '유럽 정복자들의 식민 통치와 강제 개종에 맞서 남미 원주민들이 저항하면서 내륙 선교 활동이 지체됩니다.',
      score: -5
    }
  },

  // ==================== 2. 이슬람교 대표 권역 (3곳) ====================
  '서남아(메카)': {
    name: '서남아시아(사우디·메카)',
    type: 'pure',
    preferred: '이슬람교',
    correctMethod: '직접전파',
    landmarkImg: buildImgPath('en:Masjid_al-Haram', 'Kaaba Masjid al-Haram Mecca', '성지 메카 마스지드 알하람과 카바 신전'),
    landmarkName: '성지 메카 마스지드 알하람과 카바 신전',
    desc: '무함마드가 이슬람교를 창시하고 전 세계 무슬림이 향해 기도하는 성지 메카가 위치한 발상지입니다.',
    learnPoint: '이슬람교는 7세기 사우디아라비아 메카에서 창시되어 서남아시아 전역으로 빠르게 확산되었습니다.',
    goodEvent: {
      img: buildImgPath('en:Hajj', 'Hajj pilgrims Kaaba Mecca', '메카 성지 순례(하즈)와 교역 번영'),
      title: '메카 성지 순례(하즈)와 교역 번영',
      desc: '전 세계 무슬림이 성지 메카에 모여 결속을 다지고 상인들이 교역로를 따라 교리를 빠르게 확산시킵니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Siege_of_Baghdad_(1258)', 'Siege of Baghdad 1258 Mongol Hulagu', '몽골 제국의 침략과 바그다드 함락'),
      title: '몽골 제국의 침략과 바그다드 함락',
      desc: '칭기즈 칸의 후예 훌라구가 이끄는 몽골 기마군단의 침공으로 이슬람 중심 도시가 파괴되어 종교 활동이 축소됩니다.',
      score: -5
    }
  },
  '북아프리카': {
    name: '북부 아프리카(이집트·카이로)',
    type: 'pure',
    preferred: '이슬람교',
    correctMethod: '직접전파',
    landmarkImg: buildImgPath('en:Mosque_of_Muhammad_Ali', 'Mosque of Muhammad Ali Cairo', '카이로 무함마드 알리 대모스크'),
    landmarkName: '카이로 무함마드 알리 대모스크',
    desc: '서남아시아와 인접하여 일찍부터 이슬람화되었으며 사하라 사막 종단 무역의 중심지가 된 지역입니다.',
    learnPoint: '아프리카 북부는 서남아시아와 지리적으로 인접하여 이슬람교와 아랍어가 지배적인 문화권을 형성했습니다.',
    goodEvent: {
      img: buildImgPath('en:Trans-Saharan_trade', 'Camel caravan Sahara desert trade', '사하라 사막 황금·소금 교역로 개척'),
      title: '사하라 사막 황금·소금 교역로 개척',
      desc: '낙타 상단(카라반)을 이끈 무슬림 상인들이 사하라 사막 교역로를 개척하며 북아프리카 전역에 모스크를 세웁니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Crusades', 'Crusades battle medieval painting', '십자군 전쟁 발발과 지중해 교역 봉쇄'),
      title: '십자군 전쟁 발발과 지중해 교역 봉쇄',
      desc: '성지 회복을 내세운 유럽 십자군과의 오랜 전쟁으로 이집트와 지중해 연안의 포교 및 상업 활동이 타격을 입습니다.',
      score: -5
    }
  },
  '중앙아시아': {
    name: '중앙아시아(우즈베크·사마르칸트)',
    type: 'pure',
    preferred: '이슬람교',
    correctMethod: '장거리',
    landmarkImg: buildImgPath('en:Registan', 'Registan Samarkand Uzbekistan', '사마르칸트 레기스탄 이슬람 신학교'),
    landmarkName: '사마르칸트 레기스탄 이슬람 신학교',
    desc: '동서양을 잇는 실크로드의 중심지로, 상업 교역을 통해 이슬람교가 깊이 뿌리내린 내륙 권역입니다.',
    learnPoint: '이슬람교는 상업 활동을 긍정하여 실크로드 육상 교역로를 따라 중앙아시아 내륙까지 널리 전파되었습니다.',
    goodEvent: {
      img: buildImgPath('en:Silk_Road', 'Silk Road caravan trade', '실크로드 오아시스 교역과 사마르칸트 번영'),
      title: '실크로드 오아시스 교역과 사마르칸트 번영',
      desc: '실크로드 무역상들이 이슬람교를 수용하고 사마르칸트에 푸른 타일의 웅장한 모스크와 신학교를 건립합니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Mongol_invasions_and_conquests', 'Mongol cavalry warrior battle painting', '몽골 제국의 침략과 교역로 파괴'),
      title: '몽골 제국의 침략과 교역로 파괴',
      desc: '칭기즈 칸과 몽골 기마군단의 대규모 중앙아시아 침공으로 실크로드 도시들이 파괴되어 종교 활동이 축소됩니다.',
      score: -5
    }
  },

  // ==================== 3. 불교 대표 권역 (3곳) ====================
  '태국·미얀마': {
    name: '동남아 대륙부(태국·미얀마)',
    type: 'pure',
    preferred: '불교',
    correctMethod: '직접전파',
    landmarkImg: buildImgPath('en:Wat_Phra_Kaew', 'Wat Phra Kaew Bangkok golden stupa', '방콕 에메랄드 사원(왓 프라깨우)'),
    landmarkName: '방콕 에메랄드 사원(왓 프라깨우)',
    desc: '개인의 수행과 해탈을 중시하는 상좌부 불교가 인도차이나반도 전역에 국교 수준으로 자리 잡은 권역입니다.',
    learnPoint: '동남아시아 대륙부(태국, 미얀마, 캄보디아 등)는 남방 불교 전파를 통해 상좌부 불교가 주민의 삶을 지배합니다.',
    goodEvent: {
      img: buildImgPath('en:Shwedagon_Pagoda', 'Shwedagon Pagoda golden stupa monks', '동남아 왕실의 상좌부 불교 공인'),
      title: '동남아 왕실의 상좌부 불교 공인',
      desc: '남방 해로를 통해 전해진 상좌부 불교를 왕실이 국교로 채택하고 황금 불탑을 세우며 출가 전통이 정착합니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Ayutthaya_Historical_Park', 'Ayutthaya ruins temple Thailand', '왕조 간 전쟁으로 인한 문화유산 피해'),
      title: '왕조 간 전쟁으로 인한 문화유산 피해',
      desc: '인접 왕국과의 전쟁으로 고대 사원과 문화유산이 피해를 입었습니다. 복구에 자원을 사용하여 점수가 감소합니다.',
      score: -5
    }
  },
  '중국·티베트': {
    name: '동부 아시아(중국·티베트·일본)',
    type: 'pure',
    preferred: '불교',
    correctMethod: '장거리',
    landmarkImg: buildImgPath('en:Longmen_Grottoes', 'Longmen Grottoes Luoyang Buddha statue', '동아시아 용문석굴 대불과 대사찰'),
    landmarkName: '동아시아 용문석굴 대불과 대사찰',
    desc: '실크로드 교역로를 따라 인도에서 중국, 한반도, 일본으로 대승 불교가 확산된 문화권입니다.',
    learnPoint: '동부 아시아에는 실크로드 육상 교역로를 통해 중생 구제를 강조하는 대승 불교가 장거리 전파되었습니다.',
    goodEvent: {
      img: buildImgPath('en:Xuanzang', 'Xuanzang Buddhist monk Silk Road painting', '실크로드 구법승(현장·혜초)의 활약과 경전 번역'),
      title: '실크로드 구법승(현장·혜초)의 활약과 경전 번역',
      desc: '실크로드를 건넌 구법승들이 인도의 불경을 번역하고 대규모 석굴 사원을 조성하여 불교가 크게 융성합니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Giant_Wild_Goose_Pagoda', 'Giant Wild Goose Pagoda Xian', '황실의 사원 탄압(폐불 사건)과 유교 견제'),
      title: '황실의 사원 탄압(폐불 사건)과 유교 견제',
      desc: '사찰의 경제력이 커지자 황실이 사원을 강제 정리하고 유교 사대부들이 불교를 견제하여 교세가 일시 축소됩니다.',
      score: -5
    }
  },
  '스리랑카': {
    name: '스리랑카(남부 아시아 불교 거점)',
    type: 'pure',
    preferred: '불교',
    correctMethod: '직접전파',
    landmarkImg: buildImgPath('en:Temple_of_the_Tooth', 'Temple of the Tooth Kandy Sri Lanka', '스리랑카 캔디 불치사(치아 사리 사원)'),
    landmarkName: '스리랑카 캔디 불치사(치아 사리 사원)',
    desc: '인도 아소카왕 시기 가장 먼저 불교가 전해져 원형 경전을 보존하고 동남아로 불교를 전파한 섬나라입니다.',
    learnPoint: '스리랑카는 인도 바로 남쪽에 위치하여 기원전 3세기경 불교가 직접 전파된 상좌부 불교의 핵심 거점입니다.',
    goodEvent: {
      img: buildImgPath('en:Ashoka', 'Ashoka Maurya Buddhism pillar', '인도 아소카왕의 불교 전파'),
      title: '인도 아소카왕의 불교 전파',
      desc: '마우리아 왕조 아소카왕의 적극적인 후원과 전법사 파견으로 스리랑카와 동남아시아에 상좌부 불교가 정착합니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Portuguese_Ceylon', 'Portuguese caravel ship historical painting', '대항해시대 유럽 열강의 식민 침략'),
      title: '대항해시대 유럽 열강의 식민 침략',
      desc: '포르투갈·네덜란드·영국이 차례로 섬의 무역항을 점령하고 타 종교를 강요하여 전통 불교 사원이 시련을 겪습니다.',
      score: -5
    }
  },

  // ==================== 4. 힌두교 대표 권역 (3곳) ====================
  '북인도(갠지스)': {
    name: '북인도(바라나시·갠지스강)',
    type: 'pure',
    preferred: '힌두교',
    correctMethod: '직접전파',
    landmarkImg: buildImgPath('en:Varanasi', 'Varanasi Ghats Ganga river India', '바라나시 갠지스강 가트와 힌두 사원'),
    landmarkName: '바라나시 갠지스강 가트와 힌두 사원',
    desc: '갠지스강을 성스러운 강으로 숭배하며 윤회 사상과 카스트 제도가 뿌리내린 힌두교의 발상지입니다.',
    learnPoint: '힌두교는 인도에서 자연 발생한 민족 종교로, 갠지스강 정화 의식 등 인도인의 일상생활과 밀접합니다.',
    goodEvent: {
      img: buildImgPath('en:Kumbh_Mela', 'Kumbh Mela Ganges river pilgrims India', '굽타 왕조의 후원과 갠지스강 쿰브 멜라 축제'),
      title: '굽타 왕조의 후원과 갠지스강 쿰브 멜라 축제',
      desc: '수많은 힌두교 순례자들이 성스러운 갠지스강에 모여 정화 의식을 치르며 전통 신앙이 인도 전역에 뿌리내립니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Mughal_Empire', 'Mughal Empire painting India', '이슬람 무굴 제국의 인도 정복'),
      title: '이슬람 무굴 제국의 인도 정복',
      desc: '이슬람 세력이 북인도를 정복하여 무굴 제국을 세우면서 기존 힌두 사원 활동이 위축되고 갈등이 발생합니다.',
      score: -5
    }
  },
  '남인도(마두라이)': {
    name: '남인도(타밀나두·마두라이)',
    type: 'pure',
    preferred: '힌두교',
    correctMethod: '직접전파',
    landmarkImg: buildImgPath('en:Meenakshi_Temple', 'Meenakshi Amman Temple Madurai gopuram', '남인도 마두라이 미나크시 사원'),
    landmarkName: '남인도 마두라이 미나크시 사원',
    desc: '화려하고 거대한 석조 탑문(고푸람)을 가진 정통 힌두 사원들이 원형 그대로 밀집한 남인도의 핵심지입니다.',
    learnPoint: '인도 남부는 힌두교 전통이 가장 잘 보존되어 있으며 정교한 신상 조각의 거대 사원 건축이 발달했습니다.',
    goodEvent: {
      img: buildImgPath('en:Brihadisvara_Temple', 'Brihadisvara Temple Thanjavur', '남인도 힌두 왕조의 거대 탑문 사원 건립'),
      title: '남인도 힌두 왕조의 거대 탑문 사원 건립',
      desc: '남인도 왕조들의 강력한 후원 아래 수천 개의 신상이 조각된 거대한 사원 도시가 건설되어 신앙이 꽃피웁니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:East_India_Company', 'East India Company ships painting', '영국 동인도회사의 인도 식민 지배'),
      title: '영국 동인도회사의 인도 식민 지배',
      desc: '영국의 인도 식민 통치가 본격화되면서 전통 사원의 자치권이 축소되고 서구 문물과의 마찰이 빚어집니다.',
      score: -5
    }
  },
  '네팔': {
    name: '네팔(카트만두 분지)',
    type: 'pure',
    preferred: '힌두교',
    correctMethod: '직접전파',
    landmarkImg: buildImgPath('en:Pashupatinath_Temple', 'Pashupatinath Temple Kathmandu Nepal', '네팔 카트만두 파슈파티나트 사원'),
    landmarkName: '네팔 카트만두 파슈파티나트 사원',
    desc: '인도와 맞닿은 히말라야 산맥의 국가로, 인구의 80% 이상이 힌두교를 믿는 대표적인 힌두 문화권입니다.',
    learnPoint: '힌두교는 인도와 인접한 네팔 등 남부 아시아 주변 지역으로 직접 전파되어 다수 종교를 이루고 있습니다.',
    goodEvent: {
      img: buildImgPath('en:Kathmandu_Durbar_Square', 'Kathmandu Durbar Square Nepal temple', '히말라야 왕실의 힌두교 국교 수호'),
      title: '히말라야 왕실의 힌두교 국교 수호',
      desc: '네팔 왕실이 힌두교를 국가 이념으로 수호하고 파슈파티나트 성지를 확장하여 수많은 순례자가 모여듭니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:April_2015_Nepal_earthquake', 'Kathmandu temple earthquake', '히말라야 대지진과 고대 사원 파손'),
      title: '히말라야 대지진과 고대 사원 파손',
      desc: '카트만두 분지를 강타한 대규모 지진으로 유서 깊은 힌두 사원 탑들이 무너져 복구에 자원을 소모합니다.',
      score: -5
    }
  },

  // ==================== 5. 다종교 혼합 권역 (4곳) ====================
  '한국(혼합)': {
    name: '한국(동아시아 다종교 공존)',
    type: 'hybrid',
    desc: '삼국·고려시대의 불교 전통과 조선의 유교, 근현대의 천주교·개신교가 유입되어 평화롭게 공존하는 국가입니다.',
    learnPoint: '한국은 불교와 크리스트교(개신교·천주교)가 고르게 분포하며 종교 간 갈등 없이 공존하는 다종교 국가입니다.',
    byReligion: {
      '불교': {
        landmarkImg: buildImgPath('en:Bulguksa', 'Bulguksa Temple Gyeongju Korea', '경주 불국사와 다보탑·석가탑'),
        landmarkName: '경주 불국사와 다보탑·석가탑',
        good: {
          img: buildImgPath('en:Tripitaka_Koreana', 'Tripitaka Koreana Haeinsa', '삼국·고려 호국불교와 팔만대장경 판각'),
          title: '삼국·고려 호국불교와 팔만대장경 판각',
          desc: '삼국~고려시대에 불교가 국가 종교로 융성하여 불국사 창건과 팔만대장경 판각 등 찬란한 문화를 꽃피웠습니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Sungkyunkwan', 'Sungkyunkwan Seoul Joseon', '조선 왕조의 성리학 국교화와 숭유억불 정책'),
          title: '조선 왕조의 성리학 국교화와 숭유억불 정책',
          desc: '조선 건국 후 성리학(유교)을 통치 이념으로 삼으면서 도성 내 사찰을 폐쇄하고 승려를 억압하여 교세가 감소합니다.',
          score: -5
        }
      },
      '크리스트교': {
        landmarkImg: buildImgPath('en:Myeongdong_Cathedral', 'Myeongdong Cathedral Seoul', '서울 명동대성당'),
        landmarkName: '서울 명동대성당',
        good: {
          img: buildImgPath('ko:배재학당', 'Appenzeller Pai Chai school Korea', '실학자의 서학 수용과 개화기 근대 학교·병원 설립'),
          title: '실학자의 서학 수용과 개화기 근대 학교·병원 설립',
          desc: '실학자들의 자발적 천주교 연구에 이어 개화기 선교사들이 근대 학교와 병원을 세우며 대중 속에 빠르게 확산됩니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Jeoldusan', 'Jeoldusan Martyrs Shrine Seoul', '조선 후기 천주교 탄압(신유박해·병인박해)'),
          title: '조선 후기 천주교 탄압(신유박해·병인박해)',
          desc: '조상 제사 거부를 유교 질서 파괴로 여긴 조선 조정의 대규모 천주교 박해로 수많은 신자와 선교사가 순교했습니다.',
          score: -5
        }
      },
      '이슬람교': {
        landmarkImg: buildImgPath('en:Seoul_Central_Mosque', 'Seoul Central Mosque Korea', '서울 한남동 중앙성원'),
        landmarkName: '서울 한남동 중앙성원',
        good: {
          img: buildImgPath('en:Seoul_Central_Mosque', 'Seoul Central Mosque Itaewon', '고려 벽란도 아랍 상인(대식국) 교역과 서울 중앙성원'),
          title: '고려 벽란도 아랍 상인(대식국) 교역과 서울 중앙성원',
          desc: '고려시대 아랍 상인들이 벽란도에서 교역하며 코리아(Korea)를 세계에 알리고, 현대에는 서울 중앙성원이 세워집니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Gyeongbokgung', 'Gyeongbokgung Palace Seoul', '조선 세종 시기 회회교(이슬람) 고유 의례 금지령'),
          title: '조선 세종 시기 회회교(이슬람) 고유 의례 금지령',
          desc: '유교적 의례를 정비하던 조선 세종이 국내 거주 무슬림(회회인)의 고유 복장과 의식을 금하여 초기 교세가 끊어졌습니다.',
          score: -5
        }
      },
      '힌두교': {
        landmarkImg: buildImgPath('en:Heo_Hwang-ok', 'Heo Hwang-ok tomb Gimhae', '김해 가야 허황옥릉과 파사석탑'),
        landmarkName: '김해 가야 허황옥릉과 파사석탑',
        good: {
          img: buildImgPath('en:Heo_Hwang-ok', 'Heo Hwang-ok Gimhae Korea', '가야 김수로왕·인도 허황옥 설화와 현대 인도 문화 교류'),
          title: '가야 김수로왕·인도 허황옥 설화와 현대 인도 문화 교류',
          desc: '고대 인도 아유타국 공주 허황옥의 도래 설화와 현대 한국인들의 요가·명상 열풍이 결합되어 문화적 호응을 얻습니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Sungkyunkwan', 'Sungkyunkwan Joseon Confucian', '동아시아 유교·불교 중심 사회와의 문화적 장벽'),
          title: '동아시아 유교·불교 중심 사회와의 문화적 장벽',
          desc: '오랫동안 불교·유교·크리스트교가 자리 잡은 한국 사회에서 카스트 제도와 다신교 교리가 정착하는 데 한계를 겪었습니다.',
          score: -5
        }
      }
    }
  },

  '인도네시아(혼합)': {
    name: '인도네시아·말레이(동남아 도서 혼합)',
    type: 'hybrid',
    desc: '고대 힌두교·불교 왕국이 번성한 후 인도양 무슬림 상인의 해상 무역으로 이슬람교가 주류가 된 중층 문화권입니다.',
    learnPoint: '동남아시아 도서 지역은 불교(보로부두르)·힌두교(발리) 유적 위에 해상 무역으로 전파된 이슬람교가 공존합니다.',
    byReligion: {
      '이슬람교': {
        landmarkImg: buildImgPath('en:Istiqlal_Mosque,_Jakarta', 'Istiqlal Mosque Jakarta Indonesia', '자카르타 이스티클랄 대모스크'),
        landmarkName: '자카르타 이스티클랄 대모스크',
        good: {
          img: buildImgPath('en:Spice_trade', 'Spice trade ships Indian Ocean', '인도양 향신료 해상 무역과 이슬람 술탄국 확산'),
          title: '인도양 향신료 해상 무역과 이슬람 술탄국 확산',
          desc: '인도양 해상 무역로를 따라 온 무슬림 상인들과 교류하며 해안 왕국들이 평화적으로 개종해 세계 최대 무슬림 국가가 됩니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Dutch_East_India_Company', 'Dutch East India Company VOC ship painting', '서구 열강(포르투갈·네덜란드)의 향신료 무역항 점령'),
          title: '서구 열강(포르투갈·네덜란드)의 향신료 무역항 점령',
          desc: '대항해시대 유럽 함대가 말라카 해협과 무역항을 무력 점령하면서 현지 이슬람 상권과 술탄국이 위축됩니다.',
          score: -5
        }
      },
      '불교': {
        landmarkImg: buildImgPath('en:Borobudur', 'Borobudur Temple Java Indonesia', '자바섬 보로부두르 대불탑'),
        landmarkName: '자바섬 보로부두르 대불탑',
        good: {
          img: buildImgPath('en:Borobudur', 'Borobudur stupa Buddha Indonesia', '고대 해상 불교 왕국 번영과 보로부두르 대불탑 건립'),
          title: '고대 해상 불교 왕국 번영과 보로부두르 대불탑 건립',
          desc: '해상 실크로드를 장악한 스리위자야·샤일렌드라 왕조가 자바섬에 세계 최대의 불교 유적인 보로부두르를 건립합니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:1883_eruption_of_Krakatoa', 'Krakatoa eruption 1883 lithograph', '화산 대폭발과 보로부두르 유적 매몰 피해'),
          title: '화산 대폭발과 보로부두르 유적 매몰 피해',
          desc: '자바섬의 대형 화산 폭발로 인해 찬란했던 보로부두르 불탑이 수백 년간 화산재와 밀림 속에 묻히고 말았습니다.',
          score: -5
        }
      },
      '힌두교': {
        landmarkImg: buildImgPath('en:Pura_Ulun_Danu_Bratan', 'Pura Ulun Danu Bratan Bali temple', '발리 울룬 다누 브라탄 힌두 사원'),
        landmarkName: '발리 울룬 다누 브라탄 힌두 사원',
        good: {
          img: buildImgPath('en:Majapahit', 'Bali Hindu temple gate Indonesia', '마자파힛 힌두 제국의 번영과 발리 힌두 문화 보존'),
          title: '마자파힛 힌두 제국의 번영과 발리 힌두 문화 보존',
          desc: '고대 자바를 통일한 마자파힛 힌두 왕조의 예술가와 신도들이 발리섬으로 이주하여 독창적인 힌두 문화를 꽃피웁니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Demak_Sultanate', 'Demak Great Mosque Java', '해상 이슬람 술탄국의 부상과 힌두 왕조 후퇴'),
          title: '해상 이슬람 술탄국의 부상과 힌두 왕조 후퇴',
          desc: '무역항을 장악한 이슬람 술탄국들이 성장하면서 자바섬 본토의 힌두 왕조가 멸망하고 발리섬으로 축소되었습니다.',
          score: -5
        }
      },
      '크리스트교': {
        landmarkImg: buildImgPath('en:Jakarta_Cathedral', 'Jakarta Cathedral Indonesia', '자카르타 대성당'),
        landmarkName: '자카르타 대성당',
        good: {
          img: buildImgPath('en:Francis_Xavier', 'Francis Xavier missionary Asia painting', '대항해시대 선교 활동과 대성당·모스크 평화 공존'),
          title: '대항해시대 선교 활동과 대성당·모스크 평화 공존',
          desc: '유럽 선교사들의 활동으로 동부 도서에 크리스트교가 정착하고, 자카르타 대성당과 대모스크가 마주 보며 공존합니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Aceh_War', 'Aceh War Indonesia historical', '서구 식민 지배에 맞선 현지 아체 술탄국의 저항'),
          title: '서구 식민 지배에 맞선 현지 아체 술탄국의 저항',
          desc: '네덜란드 식민 통치에 대한 반감이 서구 종교에 대한 경계로 이어져 이슬람 세력이 강한 지역에서 선교가 저지됩니다.',
          score: -5
        }
      }
    }
  },

  '싱가포르(혼합)': {
    name: '싱가포르(국제 교통 허브 다종교 공존)',
    type: 'hybrid',
    desc: '동서양 해상 무역의 요충지로 중국계(불교), 말레이계(이슬람), 인도계(힌두교), 유럽계(크리스트교)가 함께 살아가는 도시국가입니다.',
    learnPoint: '싱가포르는 국제 무역항으로 성장하며 이주해 온 다양한 민족에 의해 4대 종교가 한 도시에 조화롭게 분포합니다.',
    byReligion: {
      '불교': {
        landmarkImg: buildImgPath('en:Buddha_Tooth_Relic_Temple_and_Museum', 'Buddha Tooth Relic Temple Singapore', '싱가포르 차이나타운 불아사'),
        landmarkName: '싱가포르 차이나타운 불아사',
        good: {
          img: buildImgPath('en:Founding_of_modern_Singapore', 'Singapore River historical port boats', '국제 무역항 개항과 중국계 화교의 불아사 건립'),
          title: '국제 무역항 개항과 중국계 화교의 불아사 건립',
          desc: '중계 무역항 개항 이후 대거 이주한 중국계 화교들이 사찰을 건립하여 불교가 싱가포르 최대 종교로 자리 잡습니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Parliament_of_Singapore', 'Singapore Parliament modern city', '종교화합유지법(MRHA) 단속과 도심 임대료 난관'),
          title: '종교화합유지법(MRHA) 단속과 도심 임대료 난관',
          desc: '무리한 거리 포교가 싱가포르 종교화합유지법에 의해 제지당하고 높은 도심 토지 비용으로 점수가 감소합니다.',
          score: -5
        }
      },
      '이슬람교': {
        landmarkImg: buildImgPath('en:Masjid_Sultan', 'Sultan Mosque Kampong Glam Singapore', '싱가포르 캄퐁글람 술탄 모스크'),
        landmarkName: '싱가포르 캄퐁글람 술탄 모스크',
        good: {
          img: buildImgPath('en:Kampong_Glam', 'Kampong Glam Sultan Mosque street', '말레이 토착 무슬림과 아랍 무역상의 술탄 모스크 건립'),
          title: '말레이 토착 무슬림과 아랍 무역상의 술탄 모스크 건립',
          desc: '말라카 해협의 말레이 무슬림과 아랍 상인들이 캄퐁글람에 황금 돔의 술탄 모스크를 세우고 활발히 교류합니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Parliament_of_Singapore', 'Singapore city skyline buildings', '영국 자유무역항 개발과 엄격한 세속주의 법제'),
          title: '영국 자유무역항 개발과 엄격한 세속주의 법제',
          desc: '다민족 유입으로 말레이 무슬림 비중이 약 15%로 조정되고 공공장소 집회 규제로 포교가 제한됩니다.',
          score: -5
        }
      },
      '힌두교': {
        landmarkImg: buildImgPath('en:Sri_Mariamman_Temple,_Singapore', 'Sri Mariamman Temple Singapore gopuram', '싱가포르 스리 마리암만 힌두 사원'),
        landmarkName: '싱가포르 스리 마리암만 힌두 사원',
        good: {
          img: buildImgPath('en:Little_India,_Singapore', 'Little India Singapore Deepavali street', '남인도 타밀족 이주와 스리 마리암만 사원 건립'),
          title: '남인도 타밀족 이주와 스리 마리암만 사원 건립',
          desc: '식민 시기 남인도에서 이주한 타밀족들이 싱가포르 최고(最古)의 힌두 사원을 세우고 디파발리 축제를 정착시킵니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Marina_Bay_Sands', 'Singapore urban high density buildings', '고밀도 도시국가 재개발과 토지 비용 부담'),
          title: '고밀도 도시국가 재개발과 토지 비용 부담',
          desc: '좁은 국토 면적과 높은 도심 부동산 비용, 엄격한 공공 집회 규제로 인해 사원 확장에 자원이 소모됩니다.',
          score: -5
        }
      },
      '크리스트교': {
        landmarkImg: buildImgPath("en:St_Andrew's_Cathedral,_Singapore", "St Andrew's Cathedral Singapore", '싱가포르 세인트 앤드류 대성당'),
        landmarkName: '싱가포르 세인트 앤드류 대성당',
        good: {
          img: buildImgPath('en:Stamford_Raffles', 'Stamford Raffles Singapore statue', '영국 동인도회사의 개항과 미션스쿨 교육 확산'),
          title: '영국 동인도회사의 개항과 미션스쿨 교육 확산',
          desc: '1819년 영국 개항 이후 세인트 앤드류 대성당과 기독교 학교들이 설립되어 시민층을 중심으로 교세가 성장합니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Parliament_of_Singapore', 'Singapore Supreme Court building', '다민족 갈등 방지를 위한 종교화합유지법 규제'),
          title: '다민족 갈등 방지를 위한 종교화합유지법 규제',
          desc: '타 종교 신자에게 공격적인 전도를 시도하다가 싱가포르 정부의 강력한 법적 경고를 받아 점수가 감소합니다.',
          score: -5
        }
      }
    }
  },

  '나이지리아(혼합)': {
    name: '나이지리아(아프리카 남북 종교 교차지)',
    type: 'hybrid',
    desc: '사하라 사막 무역로로 전파된 북부의 이슬람교(약 50%)와 대서양 해안 선교로 전파된 남부의 크리스트교(약 48%)가 맞닿은 국가입니다.',
    learnPoint: '나이지리아는 북부 이슬람교와 남부 크리스트교가 팽팽히 맞서는 아프리카의 대표적인 종교 점이지대입니다.',
    byReligion: {
      '이슬람교': {
        landmarkImg: buildImgPath('en:Abuja_National_Mosque', 'Abuja National Mosque Nigeria golden dome', '나이지리아 아부자 국립 모스크'),
        landmarkName: '나이지리아 아부자 국립 모스크',
        good: {
          img: buildImgPath('en:Sokoto_Caliphate', 'Kano Emirate Nigeria durbar horsemen', '북부 사하라 종단 교역과 소코토 이슬람 왕국 성립'),
          title: '북부 사하라 종단 교역과 소코토 이슬람 왕국 성립',
          desc: '사하라 무역로를 통해 이슬람을 받아들인 북부 하우사·풀라니족이 이슬람 왕국을 세우며 서아프리카 최대 교세를 이룹니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Zuma_Rock', 'Zuma Rock Nigeria landscape', '북부(이슬람)와 남부(크리스트교) 경계선 충돌'),
          title: '북부(이슬람)와 남부(크리스트교) 경계선 충돌',
          desc: '북부 이슬람권과 남부 크리스트교권이 맞닿는 중부 경계 지역에서 관습법(샤리아) 갈등으로 점수가 감소합니다.',
          score: -5
        }
      },
      '크리스트교': {
        landmarkImg: buildImgPath('en:National_Christian_Centre', 'National Christian Centre Abuja Nigeria', '나이지리아 아부자 국립 기독교 센터'),
        landmarkName: '나이지리아 아부자 국립 기독교 센터',
        good: {
          img: buildImgPath('en:Samuel_Ajayi_Crowther', 'Samuel Ajayi Crowther bishop Nigeria', '남부 대서양 해안 선교와 아프리카 교회 대부흥'),
          title: '남부 대서양 해안 선교와 아프리카 교회 대부흥',
          desc: '대서양 해안으로 들어온 선교사들과 아프리카 현지 성직자(크라우더 주교 등)가 남부에 학교와 교회를 세워 부흥을 이룹니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Niger_River', 'Niger River tropical forest Africa', '남북 종교 경계선 충돌과 열대 말라리아 풍토병'),
          title: '남북 종교 경계선 충돌과 열대 말라리아 풍토병',
          desc: '내륙 열대 우림의 말라리아 풍토병과 북부 이슬람 세력과의 경계선 갈등으로 인해 북상이 저지됩니다.',
          score: -5
        }
      },
      '불교': {
        landmarkImg: buildImgPath('en:Wat_Phra_Kaew', 'Buddhist temple golden statue meditation', '서아프리카 국제 평화 명상 센터'),
        landmarkName: '서아프리카 국제 평화 명상 센터',
        good: {
          img: buildImgPath('en:Ashoka', 'Ashoka pillar peace Buddhism', '종파 갈등 지역에서의 비폭력 평화 명상 운동'),
          title: '종파 갈등 지역에서의 비폭력 평화 명상 운동',
          desc: '종교 갈등에 지친 현지 청년들과 지식인들이 불교의 평화·명상 철학에 공감하며 도심 명상 센터가 문을 엽니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Lagos', 'Lagos Nigeria city skyline', '역사적 교류 부재와 기독교·이슬람 양강 구도 장벽'),
          title: '역사적 교류 부재와 기독교·이슬람 양강 구도 장벽',
          desc: '역사적으로 아시아 불교권과 지리적 교류가 없었으며, 이미 인구의 98%가 양대 종교를 믿고 있어 전파가 어렵습니다.',
          score: -5
        }
      },
      '힌두교': {
        landmarkImg: buildImgPath('en:Varanasi', 'Hindu temple festival India lights', '라고스 인도계 무역상 사원'),
        landmarkName: '라고스 인도계 무역상 사원',
        good: {
          img: buildImgPath('en:Spice_trade', 'Indian Ocean trade ship', '영연방 인도계 상인의 서아프리카 진출과 문화 교류'),
          title: '영연방 인도계 상인의 서아프리카 진출과 문화 교류',
          desc: '해상 무역과 기업 활동으로 정착한 인도계 주민들이 사원을 세우고 인도 영화(볼리우드) 인기로 축제가 알려집니다.',
          score: 10
        },
        bad: {
          img: buildImgPath('en:Lagos', 'Lagos harbor Africa', '민족 종교의 비포교 전통과 지리적 거리감'),
          title: '민족 종교의 비포교 전통과 지리적 거리감',
          desc: '외부 민족에게 개종을 적극 권유하지 않는 힌두교의 특성과 먼 거리로 인해 아프리카 현지인 전파에 한계를 겪습니다.',
          score: -5
        }
      }
    }
  }
};

const WALL_FAIL_IMG = buildImgPath('en:Citadel_of_Aleppo', 'Citadel of Aleppo fortress wall gate', '기존 주류 종교의 강력한 문화 장벽');

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
    '서남아(메카)': '이슬람교',
    '북아프리카': null,
    '중앙아시아': null,
    '태국·미얀마': '불교',
    '중국·티베트': null,
    '스리랑카': null,
    '북인도(갠지스)': '힌두교',
    '남인도(마두라이)': null,
    '네팔': null,
    '한국(혼합)': null,
    '인도네시아(혼합)': null,
    '싱가포르(혼합)': null,
    '나이지리아(혼합)': null
  };
}
resetMapOwnership();

let religionStates = {};
function resetReligionStates() {
  religionStates = {
    '크리스트교': { score: 60, regions: ['유럽(바티칸)'], ownerId: null },
    '이슬람교': { score: 60, regions: ['서남아(메카)'], ownerId: null },
    '불교': { score: 60, regions: ['태국·미얀마'], ownerId: null },
    '힌두교': { score: 60, regions: ['북인도(갠지스)'], ownerId: null }
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
      territorialSuccess = true;
      const relInfo = region.byReligion[activeReligion];
      const baseGain = 40;

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
        headerTitle: '⚜ 특수 이벤트 ⚜',
        tag: `${relSymbol} ${region.name} · ${activeReligion}`,
        title: ev.title,
        desc: ev.desc,
        img: ev.img,
        score: ev.score,
        learnPoint: region.learnPoint
      };
    } else if (region.preferred === activeReligion) {
      territorialSuccess = true;
      const isMethodRight = (region.correctMethod === method);
      const baseGain = isMethodRight ? 55 : 30;

      step1Card = {
        headerTitle: '⚜ 종교 전파 결과 ⚜',
        badgeText: isMethodRight
          ? '🌟 주류 종교 + 전파 방식 완벽 일치! (+55점)'
          : '⚠️ 주류 종교 일치 / 전파 방식 착오 (+30점)',
        img: region.landmarkImg,
        landmarkName: region.landmarkName,
        title: `${activeReligion} ➔ ${region.name}`,
        desc: region.desc,
        baseGain: baseGain,
        methodNote: isMethodRight
          ? `정답! 실제 역사적 전파 경로인 [${region.correctMethod}]를 정확히 선택하여 +15점 보너스를 획득했습니다!`
          : `이 지역의 주류 종교는 맞았으나, 실제 역사적 전파 방식은 [${region.correctMethod}]여서 점수가 일부 차감되었습니다.`
      };

      const ev = (Math.random() < 0.5) ? region.goodEvent : region.badEvent;
      step2Event = {
        headerTitle: '⚜ 특수 이벤트 ⚜',
        tag: `${relSymbol} ${region.name} · ${activeReligion}`,
        title: ev.title,
        desc: ev.desc,
        img: ev.img,
        score: ev.score,
        learnPoint: region.learnPoint
      };
    } else {
      territorialSuccess = false;
      step1Card = {
        headerTitle: '⚜ 전파 실패 ⚜',
        badgeText: `❌ 타 종교 강세 권역 (실제 주류: ${region.preferred})`,
        img: WALL_FAIL_IMG,
        landmarkName: `전파 실패: 기존 주류 종교(${region.preferred})의 강력한 문화 장벽`,
        title: `${activeReligion} ➔ ${region.name} 전파 좌절`,
        desc: `오답입니다! [${region.name}] 지역은 역사적으로 [${region.preferred}]의 전통과 교세가 압도적으로 강한 곳이어서 전파에 실패했습니다.`,
        baseGain: -20,
        methodNote: `기존 주류 종교(${region.preferred})의 강력한 문화 장벽에 부딪혀 명성이 20점 감소합니다.`
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
