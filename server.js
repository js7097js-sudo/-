const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// ============================================================================
// 1. Imgur에 업로드한 혼합 4개국 & 오답 성벽 전용 일러스트
// ============================================================================
const CUSTOM_EVENT_IMG = {
  failWall: 'https://i.imgur.com/tisnR4Y.jpeg',      // 오답 시 성벽 장벽 (fail_wall)
  indonesiaBad: 'https://i.imgur.com/QLHj5DK.jpeg',  // 인도네시아 전용 부정
  indonesiaGood: 'https://i.imgur.com/JTRXdLk.jpeg', // 인도네시아 전용 긍정
  koreaBad: 'https://i.imgur.com/IS6h7Su.jpeg',      // 한국 전용 부정 (조선 숭유억불·신유박해)
  koreaGood: 'https://i.imgur.com/sDKYyyn.jpeg',     // 한국 전용 긍정 (고려 팔만대장경·근대 선교 학교)
  nigeriaBad: 'https://i.imgur.com/m26Esi4.jpeg',    // 나이지리아 전용 부정
  nigeriaGood: 'https://i.imgur.com/67fVv0T.jpeg',   // 나이지리아 전용 긍정
  singaporeBad: 'https://i.imgur.com/LWjOSsO.jpeg',  // 싱가포르 전용 부정
  singaporeGood: 'https://i.imgur.com/wthzgCj.jpeg'  // 싱가포르 전용 긍정
};

// ============================================================================
// 2. 위키백과 공식 API 기반 랜드마크 & 역사 기록화 로더 (국기·도표·우표 차단)
// ============================================================================
const imageMemoryCache = new Map();
const USER_AGENT = 'WorldReligionEduGame/8.0 (https://religion-gam.onrender.com; educational game)';

function isValidImage(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.endsWith('.svg') || lower.includes('.svg.png')) return false;
  const banned = ['flag_of', 'coat_of_arms', 'parliament', 'diagram', 'chart', 'stamp', 'locator_map', 'orthographic'];
  return !banned.some(w => lower.includes(w));
}

async function resolveWikimediaImageUrl(wiki, q) {
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
            if (isValidImage(page?.thumbnail?.source)) return page.thumbnail.source;
            if (isValidImage(page?.original?.source)) return page.original.source;
          }
        }
      } catch (e) {
        console.warn('Wiki PageImages API warn:', e.message);
      }
    }
  }

  if (q) {
    try {
      const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent('filetype:bitmap -flag -stamp -map ' + q)}&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json`;
      const res = await fetch(commonsUrl, { headers: { 'User-Agent': USER_AGENT } });
      if (res.ok) {
        const data = await res.json();
        const pages = data?.query?.pages;
        if (pages) {
          for (const p of Object.values(pages)) {
            const info = p?.imageinfo?.[0];
            const candidate = info?.thumburl || info?.url;
            if (isValidImage(candidate)) return candidate;
          }
        }
      }
    } catch (e) {
      console.warn('Commons Search API warn:', e.message);
    }
  }

  return null;
}

app.get('/api/image', async (req, res) => {
  const { wiki = '', q = '' } = req.query;
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
      } else {
        return res.redirect(302, targetUrl);
      }
    }
  } catch (err) {
    console.warn('Image proxy error:', err.message);
  }

  return res.redirect(302, CUSTOM_EVENT_IMG.failWall);
});

function buildImgPath(wiki, q) {
  return `/api/image?wiki=${encodeURIComponent(wiki)}&q=${encodeURIComponent(q)}`;
}

const RELIGIONS = [
  { id: 'christianity', name: '크리스트교', symbol: '✝', color: '#7c3aed', origin: '유럽(바티칸)' },
  { id: 'islam', name: '이슬람교', symbol: '☪', color: '#059669', origin: '서남아(메카)' },
  { id: 'buddhism', name: '불교', symbol: '☸', color: '#d97706', origin: '태국·미얀마' },
  { id: 'hinduism', name: '힌두교', symbol: '🕉', color: '#ea580c', origin: '북인도(갠지스)' }
];

// ============================================================================
// 3. 16개 권역 데이터
// ============================================================================
const REGIONS = {
  // ==================== 1. 크리스트교 대표 권역 (3곳) ====================
  '유럽(바티칸)': {
    name: '유럽(바티칸·이탈리아)',
    type: 'pure',
    preferred: '크리스트교',
    correctMethod: '직접전파',
    methodExplain: '팔레스타인에서 기원한 크리스트교는 지중해 연안과 로마 제국의 도로망을 따라 인접한 유럽 대륙으로 연속 확산되었으므로 [직접전파]에 해당합니다.',
    landmarkImg: buildImgPath("en:St._Peter's_Basilica", "St. Peter's Basilica Vatican"),
    landmarkName: '바티칸 성 베드로 대성당',
    desc: '로마 제국의 국교 공인 이후 유럽 전역으로 크리스트교가 확산된 역사적 중심지입니다.',
    learnPoint: '크리스트교는 팔레스타인에서 기원한 후 로마 제국을 거쳐 유럽 전역에 전파되었습니다.',
    goodEvent: {
      img: buildImgPath('en:Constantine_the_Great', 'Constantine the Great Christianity painting'),
      title: '로마 제국의 크리스트교 국교 공인',
      desc: '박해받던 크리스트교가 밀라노 칙령으로 공인되고 로마의 국교로 지정되면서 유럽 전역으로 전파됩니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Reformation', 'Martin Luther 95 Theses Reformation'),
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
    methodExplain: '종교의 자유를 찾아 메이플라워호 등을 타고 대서양을 건넌 영국 청교도와 북서부 유럽 이주민들의 해양 이주로 전파되었으므로 [장거리 전파]에 해당합니다.',
    landmarkImg: buildImgPath("en:St._Patrick's_Cathedral_(New_York_City)", "St. Patrick's Cathedral New York"),
    landmarkName: '뉴욕 세인트 패트릭 대성당',
    desc: '종교의 자유를 찾아 대서양을 건넌 영국 청교도와 유럽 이주민들에 의해 크리스트교가 정착한 대륙입니다.',
    learnPoint: '앵글로아메리카는 북서부 유럽 이주민들의 해양 이주(장거리 전파)로 개신교 비율이 높게 나타납니다.',
    goodEvent: {
      img: buildImgPath('en:Mayflower', 'Mayflower ship Pilgrims Plymouth painting'),
      title: '메이플라워호 청교도의 대서양 항해와 개척',
      desc: '메이플라워호를 타고 대서양을 건넌 이주민들이 북미 해안에 정착촌과 교회를 세우며 교세를 확장합니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:The_Ninth_Wave', 'Ivan Aivazovsky The Ninth Wave storm ship'),
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
    methodExplain: '대항해시대 스페인·포르투갈 탐험가와 가톨릭 선교사들이 대서양 바다를 건너 아메리카 대륙에 전파했으므로 [장거리 전파]에 해당합니다.',
    landmarkImg: buildImgPath('en:Christ_the_Redeemer_(statue)', 'Christ the Redeemer Rio de Janeiro statue'),
    landmarkName: '리우데자네이루 구속주 예수상',
    desc: '대항해시대 스페인과 포르투갈의 식민 지배 및 적극적인 가톨릭 선교로 대륙 대부분이 가톨릭을 믿는 지역입니다.',
    learnPoint: '라틴아메리카는 남부 유럽(스페인·포르투갈)의 식민 지배 영향으로 가톨릭교의 비중이 압도적입니다.',
    goodEvent: {
      img: buildImgPath('en:Voyages_of_Christopher_Columbus', 'Landing of Columbus painting'),
      title: '콜럼버스의 항해와 대항해시대 선교',
      desc: '신항로 개척 이후 유럽 선교사들이 대서양을 건너 아메리카 대륙 전역에 가톨릭 성당을 세우고 교세를 넓힙니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Spanish_conquest_of_the_Aztec_Empire', 'Conquest of Mexico Aztec Spanish painting'),
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
    methodExplain: '7세기 아라비아반도 메카에서 창시된 후, 이슬람 제국의 영토 확장과 함께 인접한 서남아시아 전역으로 연속 확산되었으므로 [직접전파]에 해당합니다.',
    landmarkImg: buildImgPath('en:Masjid_al-Haram', 'Kaaba Masjid al-Haram Mecca'),
    landmarkName: '성지 메카 마스지드 알하람과 카바 신전',
    desc: '무함마드가 이슬람교를 창시하고 전 세계 무슬림이 향해 기도하는 성지 메카가 위치한 발상지입니다.',
    learnPoint: '이슬람교는 7세기 사우디아라비아 메카에서 창시되어 서남아시아 전역으로 빠르게 확산되었습니다.',
    goodEvent: {
      img: buildImgPath('en:Hajj', 'Hajj pilgrims Kaaba Mecca'),
      title: '메카 성지 순례(하즈)와 교역 번영',
      desc: '전 세계 무슬림이 성지 메카에 모여 결속을 다지고 상인들이 교역로를 따라 교리를 빠르게 확산시킵니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Siege_of_Baghdad_(1258)', 'Siege of Baghdad 1258 Mongol Hulagu'),
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
    methodExplain: '서남아시아와 육로(시나이반도)로 맞닿아 있는 지리적 인접성을 통해 이집트와 북부 아프리카 연안으로 교세가 연속 확산되었으므로 [직접전파]에 해당합니다.',
    landmarkImg: buildImgPath('en:Mosque_of_Muhammad_Ali', 'Mosque of Muhammad Ali Cairo'),
    landmarkName: '카이로 무함마드 알리 대모스크',
    desc: '서남아시아와 인접하여 일찍부터 이슬람화되었으며 사하라 사막 종단 무역의 중심지가 된 지역입니다.',
    learnPoint: '아프리카 북부는 서남아시아와 지리적으로 인접하여 이슬람교와 아랍어가 지배적인 문화권을 형성했습니다.',
    goodEvent: {
      img: buildImgPath('en:Trans-Saharan_trade', 'Camel caravan Sahara desert trade'),
      title: '사하라 사막 황금·소금 교역로 개척',
      desc: '낙타 상단(카라반)을 이끈 무슬림 상인들이 사하라 사막 교역로를 개척하며 북아프리카 전역에 모스크를 세웁니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Crusades', 'Crusades battle medieval painting'),
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
    methodExplain: '아라비아에서 멀리 떨어진 중앙아시아 내륙의 오아시스 도시(사마르칸트 등)들을 잇는 실크로드 육상 교역로와 대상(카라반)을 통해 전파되었으므로 [장거리 전파]에 해당합니다.',
    landmarkImg: buildImgPath('en:Registan', 'Registan Samarkand Uzbekistan'),
    landmarkName: '사마르칸트 레기스탄 이슬람 신학교',
    desc: '동서양을 잇는 실크로드의 중심지로, 상업 교역을 통해 이슬람교가 깊이 뿌리내린 내륙 권역입니다.',
    learnPoint: '이슬람교는 상업 활동을 긍정하여 실크로드 육상 교역로를 따라 중앙아시아 내륙까지 널리 전파되었습니다.',
    goodEvent: {
      img: buildImgPath('en:Silk_Road', 'Silk Road caravan trade'),
      title: '실크로드 오아시스 교역과 사마르칸트 번영',
      desc: '실크로드 무역상들이 이슬람교를 수용하고 사마르칸트에 푸른 타일의 웅장한 모스크와 신학교를 건립합니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Mongol_invasions_and_conquests', 'Mongol cavalry warrior battle painting'),
      title: '몽골 제국의 침략과 교역로 파괴',
      desc: '칭기즈 칸과 몽골 기마군단의 대규모 중앙아시아 침공으로 실크로드 도시들이 파괴되어 종교 활동이 축소됩니다.',
      score: -5
    }
  },

  // ==================== 3. 불교 대표 권역 (3곳) ====================
  '태국·미얀마': {
    name: '동남아 대륙부(태국·미얀마·캄보디아)',
    type: 'pure',
    preferred: '불교',
    correctMethod: '직접전파',
    methodExplain: '인도 동부 및 스리랑카에서 인접한 미얀마·태국 등 인도차이나반도 대륙부로 상좌부 불교가 차례로 확산되었으므로 [직접전파]에 해당합니다.',
    landmarkImg: buildImgPath('en:Wat_Phra_Kaew', 'Wat Phra Kaew Bangkok golden stupa'),
    landmarkName: '방콕 에메랄드 사원(왓 프라깨우)',
    desc: '개인의 수행과 해탈을 중시하는 상좌부 불교가 인도차이나반도 전역에 국교 수준으로 자리 잡은 권역입니다.',
    learnPoint: '동남아시아 대륙부(태국, 미얀마, 캄보디아 등)는 남방 불교 전파를 통해 상좌부 불교가 주민의 삶을 지배합니다.',
    goodEvent: {
      img: buildImgPath('en:Shwedagon_Pagoda', 'Shwedagon Pagoda golden stupa monks'),
      title: '동남아 왕실의 상좌부 불교 공인',
      desc: '남방 해로를 통해 전해진 상좌부 불교를 왕실이 국교로 채택하고 황금 불탑을 세우며 출가 전통이 정착합니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Ayutthaya_Historical_Park', 'Ayutthaya ruins temple Thailand'),
      title: '왕조 간 전쟁으로 인한 고대 사원 피해',
      desc: '인접 왕국과의 전쟁으로 고대 사원과 불상 문화유산이 피해를 입어 복구에 자원을 소모합니다.',
      score: -5
    }
  },
  '몽골·부탄': {
    name: '몽골·부탄(북방 대승·티베트 불교권)',
    type: 'pure',
    preferred: '불교',
    correctMethod: '장거리',
    methodExplain: '인도에서 기원한 불교가 실크로드와 험준한 히말라야·초원길 교역로를 넘어 부탄·티베트 고원과 몽골 초원까지 원거리 확산되었으므로 [장거리 전파]에 해당합니다.',
    landmarkImg: buildImgPath('en:Paro_Taktsang', 'Paro Taktsang Bhutan monastery cliff'),
    landmarkName: '부탄 탁상 사원(호랑이 둥지 사원)과 초원 대사원',
    desc: '실크로드와 히말라야·초원길을 따라 북방 불교(대승·티베트 불교)가 전파되어 전통과 일상을 지배하는 불교 우세 권역입니다.',
    learnPoint: '인도 북부에서 실크로드와 내륙 교역로를 따라 북방 대승·티베트 불교가 몽골과 히말라야(부탄·티베트) 일대로 장거리 전파되었습니다.',
    goodEvent: {
      img: buildImgPath('en:Mogao_Caves', 'Mogao Caves Dunhuang Buddhist mural statue'),
      title: '실크로드·초원길 구법승의 활약과 대사원 건립',
      desc: '내륙 교역로를 건넌 승려들이 불경을 번역하고 절벽 사원과 석굴 대불을 조성하여 북방 불교가 크게 융성합니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Gandantegchinlen_Monastery', 'Erdene Zuu Monastery Mongolia Buddhist wall'),
      title: '내륙 왕조 교체기 전란과 사원 탄압 시련',
      desc: '내륙 제국의 정변과 근현대 체제 변화 속에서 전통 사원들이 폐쇄되거나 훼손되어 교세가 일시 위축됩니다.',
      score: -5
    }
  },
  '스리랑카': {
    name: '스리랑카(남부 아시아 불교 거점)',
    type: 'pure',
    preferred: '불교',
    correctMethod: '직접전파',
    methodExplain: '기원전 3세기 인도 마우리아 왕조 아소카왕이 인도 바로 남쪽에 인접한 스리랑카에 전법사(마힌다 등)를 파견해 전파했으므로 [직접전파]에 해당합니다.',
    landmarkImg: buildImgPath('en:Temple_of_the_Tooth', 'Temple of the Tooth Kandy Sri Lanka'),
    landmarkName: '스리랑카 캔디 불치사(치아 사리 사원)',
    desc: '인도 아소카왕 시기 가장 먼저 불교가 전해져 원형 경전을 보존하고 동남아로 불교를 전파한 섬나라입니다.',
    learnPoint: '스리랑카는 인도 바로 남쪽에 위치하여 기원전 3세기경 불교가 직접 전파된 상좌부 불교의 핵심 거점입니다.',
    goodEvent: {
      img: buildImgPath('en:Ashoka', 'Ashoka Maurya Buddhism pillar'),
      title: '인도 아소카왕의 불교 전파',
      desc: '마우리아 왕조 아소카왕의 적극적인 후원과 전법사 파견으로 스리랑카와 동남아시아에 상좌부 불교가 정착합니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Galle_Fort', 'Galle Fort colonial Sri Lanka'),
      title: '대항해시대 유럽 열강의 해안 거점 침략',
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
    methodExplain: '인더스 문명과 브라만교 신앙이 결합하여 북인도 갠지스강 유역에서 자연 발생하고 인접 평원으로 직접 퍼져나갔으므로 [직접전파]에 해당합니다.',
    landmarkImg: buildImgPath('en:Varanasi', 'Varanasi Ghats Ganga river India'),
    landmarkName: '바라나시 갠지스강 가트와 힌두 사원',
    desc: '갠지스강을 성스러운 강으로 숭배하며 윤회 사상과 카스트 제도가 뿌리내린 힌두교의 발상지입니다.',
    learnPoint: '힌두교는 인도에서 자연 발생한 민족 종교로, 갠지스강 정화 의식 등 인도인의 일상생활과 밀접합니다.',
    goodEvent: {
      img: buildImgPath('en:Kumbh_Mela', 'Kumbh Mela Ganges river pilgrims India'),
      title: '굽타 왕조의 후원과 갠지스강 쿰브 멜라 축제',
      desc: '수많은 힌두교 순례자들이 성스러운 갠지스강에 모여 정화 의식을 치르며 전통 신앙이 인도 전역에 뿌리내립니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Mughal_Empire', 'Mughal Empire painting India'),
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
    methodExplain: '북인도에서 형성된 힌두교 전통과 경전이 인도 아대륙 내부를 따라 남인도 타밀 지역으로 연속 확산되었으므로 [직접전파]에 해당합니다.',
    landmarkImg: buildImgPath('en:Meenakshi_Temple', 'Meenakshi Amman Temple Madurai gopuram'),
    landmarkName: '남인도 마두라이 미나크시 사원',
    desc: '화려하고 거대한 석조 탑문(고푸람)을 가진 정통 힌두 사원들이 원형 그대로 밀집한 남인도의 핵심지입니다.',
    learnPoint: '인도 남부는 힌두교 전통이 가장 잘 보존되어 있으며 정교한 신상 조각의 거대 사원 건축이 발달했습니다.',
    goodEvent: {
      img: buildImgPath('en:Brihadisvara_Temple', 'Brihadisvara Temple Thanjavur'),
      title: '남인도 힌두 왕조의 거대 탑문 사원 건립',
      desc: '남인도 왕조들의 강력한 후원 아래 수천 개의 신상이 조각된 거대한 사원 도시가 건설되어 신앙이 꽃피웁니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:Robert_Clive', 'Robert Clive British East India Company painting'),
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
    methodExplain: '북인도 갠지스 평원과 국경을 맞대고 있는 네팔 카트만두 분지로 지리적 인접성을 통해 힌두교가 확산되었으므로 [직접전파]에 해당합니다.',
    landmarkImg: buildImgPath('en:Pashupatinath_Temple', 'Pashupatinath Temple Kathmandu Nepal'),
    landmarkName: '네팔 카트만두 파슈파티나트 사원',
    desc: '인도와 맞닿은 히말라야 산맥의 국가로, 인구의 80% 이상이 힌두교를 믿는 대표적인 힌두 문화권입니다.',
    learnPoint: '힌두교는 인도와 인접한 네팔 등 남부 아시아 주변 지역으로 직접 전파되어 다수 종교를 이루고 있습니다.',
    goodEvent: {
      img: buildImgPath('en:Kathmandu_Durbar_Square', 'Kathmandu Durbar Square Nepal temple'),
      title: '히말라야 왕실의 힌두교 국교 수호',
      desc: '네팔 왕실이 힌두교를 국가 이념으로 수호하고 파슈파티나트 성지를 확장하여 수많은 순례자가 모여듭니다.',
      score: 10
    },
    badEvent: {
      img: buildImgPath('en:April_2015_Nepal_earthquake', 'Kathmandu temple earthquake'),
      title: '히말라야 대지진과 고대 사원 파손',
      desc: '카트만두 분지를 강타한 대규모 지진으로 유서 깊은 힌두 사원 탑들이 무너져 복구에 자원을 소모합니다.',
      score: -5
    }
  },

  // ==================== 5. 다종교 혼합 권역 (4곳) ====================
  '한국': {
    name: '한국(동아시아 다종교 공존)',
    type: 'hybrid',
    desc: '삼국·고려시대의 불교 전통과 조선의 유교, 근현대의 천주교·개신교가 유입되어 평화롭게 공존하는 국가입니다.',
    learnPoint: '한국은 불교와 크리스트교(개신교·천주교)가 고르게 분포하며 종교 간 갈등 없이 공존하는 다종교 국가입니다.',
    byReligion: {
      '불교': {
        correctMethod: '장거리',
        methodExplain: '인도에서 기원한 불교가 실크로드 육상 교역로와 중국을 거쳐 삼국시대 한반도까지 원거리 이동해 전해졌으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Bulguksa', 'Bulguksa Temple Gyeongju Korea'),
        landmarkName: '경주 불국사와 다보탑·석가탑',
        good: {
          img: CUSTOM_EVENT_IMG.koreaGood,
          title: '삼국·고려 호국불교와 팔만대장경 판각',
          desc: '고려 팔만대장경으로 대표되는 호국불교 전통과 사찰 문화가 융성하여 찬란한 불교 유산을 꽃피웠습니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.koreaBad,
          title: '조선 왕조의 성리학 국교화와 숭유억불 정책',
          desc: '조선 건국 후 성리학(유교)을 통치 이념으로 삼으면서 도성 내 사찰을 정리하고 승려를 억압하여 교세가 감소합니다.',
          score: -5
        }
      },
      '크리스트교': {
        correctMethod: '장거리',
        methodExplain: '유럽에서 기원한 크리스트교가 청나라에 다녀온 사신단(서학 서적 유입) 및 개화기 바다를 건너온 서양 선교사들을 통해 전해졌으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Myeongdong_Cathedral', 'Myeongdong Cathedral Seoul'),
        landmarkName: '서울 명동대성당',
        good: {
          img: CUSTOM_EVENT_IMG.koreaGood,
          title: '실학자의 서학 수용과 개화기 근대 선교 학교 설립',
          desc: '실학자들의 자발적 서학 연구에 이어 개화기 선교사들이 근대 학교와 병원을 세우며 대중 속에 빠르게 확산됩니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.koreaBad,
          title: '조선 후기 천주교 탄압(신유박해·병인박해)',
          desc: '조상 제사 거부를 유교 질서 파괴로 여긴 조선 조정의 대규모 천주교 박해로 수많은 신자와 선교사가 순교했습니다.',
          score: -5
        }
      },
      '이슬람교': {
        correctMethod: '장거리',
        methodExplain: '서남아시아의 아랍·페르시아 상인들이 인도양과 남중국해를 가로지르는 해상 무역로를 따라 고려 벽란도 등에 내항하며 전해졌으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Seoul_Central_Mosque', 'Seoul Central Mosque Korea'),
        landmarkName: '서울 한남동 중앙성원',
        good: {
          img: CUSTOM_EVENT_IMG.koreaGood,
          title: '고려 벽란도 아랍 상인 교역과 현대 다종교 문화 교류',
          desc: '고려시대 아랍 상인들이 벽란도에서 교역하며 코리아를 알리고, 현대에는 서울 중앙성원이 건립되어 공존합니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.koreaBad,
          title: '조선 세종 시기 회회교(이슬람) 고유 의례 금지령',
          desc: '유교적 의례를 정비하던 조선 조정이 국내 거주 무슬림(회회인)의 고유 복장과 의식을 금하여 초기 교세가 끊어졌습니다.',
          score: -5
        }
      },
      '힌두교': {
        correctMethod: '장거리',
        methodExplain: '고대 인도 아유타국 허황옥 공주의 해양 도래 설화 및 현대 인도와의 원거리 문화·인적 교류를 통해 유입되었으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Swaminarayan_Akshardham_(Delhi)', 'Akshardham Hindu temple architecture'),
        landmarkName: '인도-가야 문화 교류 기념 사원 및 파사석탑',
        good: {
          img: CUSTOM_EVENT_IMG.koreaGood,
          title: '가야 허황옥 설화와 현대 다종교 문화 교류',
          desc: '고대 인도 아유타국 공주 허황옥의 도래 설화와 현대 한국 사회의 개방적인 문화 교류로 친밀도가 높아집니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.koreaBad,
          title: '조선 성리학 질서와 전통 사회의 문화적 장벽',
          desc: '유교·불교 중심의 전통 사회 질서 속에서 카스트 제도와 다신교 교리가 정착하는 데 한계를 겪었습니다.',
          score: -5
        }
      }
    }
  },

  '인도네시아': {
    name: '인도네시아·말레이(동남아 도서 혼합)',
    type: 'hybrid',
    desc: '고대 힌두교·불교 왕국이 번성한 후 인도양 무슬림 상인의 해상 무역으로 이슬람교가 주류가 된 중층 문화권입니다.',
    learnPoint: '동남아시아 도서 지역은 불교(보로부두르)·힌두교(발리) 유적 위에 해상 무역으로 전파된 이슬람교가 공존합니다.',
    byReligion: {
      '이슬람교': {
        correctMethod: '장거리',
        methodExplain: '아라비아와 인도 구자라트의 무슬림 상인들이 인도양 해상 향신료 무역로를 따라 항해하며 동남아 도서 지역에 전파했으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Istiqlal_Mosque,_Jakarta', 'Istiqlal Mosque Jakarta Indonesia'),
        landmarkName: '자카르타 이스티클랄 대모스크',
        good: {
          img: CUSTOM_EVENT_IMG.indonesiaGood,
          title: '인도양 향신료 해상 무역과 이슬람 술탄국 확산',
          desc: '인도양 해상 무역로를 따라 온 무슬림 상인들과 교류하며 해안 왕국들이 평화적으로 개종해 세계 최대 무슬림 국가가 됩니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.indonesiaBad,
          title: '서구 열강의 향신료 무역항 점령',
          desc: '대항해시대 포르투갈과 네덜란드 함대가 말라카 해협과 무역항을 무력 점령하여 현지 종교 상권이 위축됩니다.',
          score: -5
        }
      },
      '불교': {
        correctMethod: '장거리',
        methodExplain: '인도와 중국을 잇는 해상 실크로드 무역선을 통해 바다 건너 자바섬과 수마트라섬에 불교가 전해졌으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Borobudur', 'Borobudur Temple Java Indonesia'),
        landmarkName: '자바섬 보로부두르 대불탑',
        good: {
          img: CUSTOM_EVENT_IMG.indonesiaGood,
          title: '해상 실크로드 무역 번영과 보로부두르 대불탑 건립',
          desc: '해상 무역로를 장악한 고대 스리위자야·샤일렌드라 왕조가 자바섬에 세계 최대 불교 유적인 보로부두르를 건립합니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.indonesiaBad,
          title: '서구 열강의 향신료 무역항 점령과 해상권 상실',
          desc: '유럽 열강의 함대가 동남아 해상 무역항을 무력으로 장악하면서 전통 왕국의 사원 후원이 크게 위축됩니다.',
          score: -5
        }
      },
      '힌두교': {
        correctMethod: '장거리',
        methodExplain: '고대 인도 상인과 브라만 계층이 벵골만과 인도양 해로를 건너 자바섬과 발리섬에 힌두 문화를 전했으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Pura_Ulun_Danu_Bratan', 'Pura Ulun Danu Bratan Bali temple'),
        landmarkName: '발리 울룬 다누 브라탄 힌두 사원',
        good: {
          img: CUSTOM_EVENT_IMG.indonesiaGood,
          title: '마자파힛 해상 제국의 번영과 발리 힌두 문화 수호',
          desc: '인도양 해상 교류로 번영한 힌두 왕조의 전통과 사원 건축이 발리섬에 보존되어 독창적인 문화를 꽃피웁니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.indonesiaBad,
          title: '서구 열강의 무역항 침공과 식민 지배 갈등',
          desc: '네덜란드 동인도회사 함대의 무력 침공으로 현지 왕조들이 타격을 입고 전통 사원 세력이 축소됩니다.',
          score: -5
        }
      },
      '크리스트교': {
        correctMethod: '장거리',
        methodExplain: '대항해시대 포르투갈·네덜란드 선박과 선교사들이 인도양 해로를 건너 동남아 군도에 전파했으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Jakarta_Cathedral', 'Jakarta Cathedral Indonesia'),
        landmarkName: '자카르타 대성당',
        good: {
          img: CUSTOM_EVENT_IMG.indonesiaGood,
          title: '해상 교역항 개방과 동부 도서 지역 공동체 정착',
          desc: '해상 교역로를 통해 유입된 크리스트교가 동부 도서 지역에 정착하며 이슬람·불교·힌두교와 평화롭게 공존합니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.indonesiaBad,
          title: '서구 열강의 무력 점령에 맞선 현지 왕국의 저항',
          desc: '포르투갈·네덜란드 함대의 무력 침공에 대한 현지인들의 반감으로 인해 선교 활동이 강한 저항에 부딪힙니다.',
          score: -5
        }
      }
    }
  },

  '싱가포르': {
    name: '싱가포르(국제 교통 허브 다종교 공존)',
    type: 'hybrid',
    desc: '동서양 해상 무역의 요충지로 중국계(불교), 말레이계(이슬람), 인도계(힌두교), 유럽계(크리스트교)가 함께 살아가는 도시국가입니다.',
    learnPoint: '싱가포르는 국제 무역항으로 성장하며 이주해 온 다양한 민족에 의해 4대 종교가 한 도시에 조화롭게 분포합니다.',
    byReligion: {
      '불교': {
        correctMethod: '장거리',
        methodExplain: '19세기 무역항 개항 이후 중국 남부에서 남중국해 바다를 건너 이주한 중국계 화교들에 의해 정착했으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Buddha_Tooth_Relic_Temple_and_Museum', 'Buddha Tooth Relic Temple Singapore'),
        landmarkName: '싱가포르 차이나타운 불아사',
        good: {
          img: CUSTOM_EVENT_IMG.singaporeGood,
          title: '국제 무역항 개항과 중국계 화교의 불아사 건립',
          desc: '중계 무역항 개항 이후 대거 이주한 중국계 화교들이 사찰을 건립하여 불교가 싱가포르 최대 종교로 자리 잡습니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.singaporeBad,
          title: '다민족 갈등 방지를 위한 종교화합유지법 규제',
          desc: '무리한 거리 포교가 싱가포르 정부의 엄격한 종교화합유지법(MRHA)에 의해 단속되어 점수가 감소합니다.',
          score: -5
        }
      },
      '이슬람교': {
        correctMethod: '직접전파',
        methodExplain: '말레이반도 남단에 맞닿은 지리적 특성상 인접한 말레이 무슬림 토착민과 주변 해협 공동체를 통해 연속 확산되었으므로 [직접전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Masjid_Sultan', 'Sultan Mosque Kampong Glam Singapore'),
        landmarkName: '싱가포르 캄퐁글람 술탄 모스크',
        good: {
          img: CUSTOM_EVENT_IMG.singaporeGood,
          title: '국제 무역항 개항과 캄퐁글람 술탄 모스크 번영',
          desc: '말레이 무슬림과 아랍 무역상들이 국제 무역항 싱가포르에 황금 돔의 술탄 모스크를 세우고 활발히 교류합니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.singaporeBad,
          title: '다민족 갈등 방지를 위한 종교화합유지법 규제',
          desc: '다민족 도시국가의 사회 안정을 위해 공공장소에서의 과열 포교 활동이 법적으로 엄격히 제한됩니다.',
          score: -5
        }
      },
      '힌두교': {
        correctMethod: '장거리',
        methodExplain: '영국 식민 시기 남인도 타밀나두 지역에서 인도양 바다를 건너 이주한 인도계 상인과 노동자들에 의해 전해졌으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Sri_Mariamman_Temple,_Singapore', 'Sri Mariamman Temple Singapore gopuram'),
        landmarkName: '싱가포르 스리 마리암만 힌두 사원',
        good: {
          img: CUSTOM_EVENT_IMG.singaporeGood,
          title: '국제 무역항 개항과 스리 마리암만 힌두 사원 건립',
          desc: '해상 무역항으로 이주한 남인도 타밀족들이 화려한 고푸람 탑문의 힌두 사원을 세우고 문화를 정착시킵니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.singaporeBad,
          title: '다민족 갈등 방지를 위한 종교화합유지법 규제',
          desc: '종교 간 마찰을 방지하기 위한 싱가포르 당국의 엄격한 거리 집회 및 포교 단속으로 점수가 감소합니다.',
          score: -5
        }
      },
      '크리스트교': {
        correctMethod: '장거리',
        methodExplain: '영국 동인도회사의 개항과 함께 유럽에서 해양 항로를 따라 건너온 선교사들에 의해 전파되었으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath("en:St_Andrew's_Cathedral,_Singapore", "St Andrew's Cathedral Singapore"),
        landmarkName: '싱가포르 세인트 앤드류 대성당',
        good: {
          img: CUSTOM_EVENT_IMG.singaporeGood,
          title: '국제 무역항 개항과 다민족 종교 정착',
          desc: '동서양 해상 무역항 개항과 함께 대성당과 미션스쿨이 세워지며 다양한 민족의 종교와 조화롭게 정착합니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.singaporeBad,
          title: '다민족 갈등 방지를 위한 종교화합유지법 규제',
          desc: '타 종교 신자에게 공격적인 거리 전도를 시도하다가 싱가포르 경찰과 법적 규제에 제지당해 점수가 감소합니다.',
          score: -5
        }
      }
    }
  },

  '나이지리아': {
    name: '나이지리아(아프리카 남북 종교 교차지)',
    type: 'hybrid',
    desc: '사하라 사막 무역로로 전파된 북부의 이슬람교(약 50%)와 대서양 해안 선교로 전파된 남부의 크리스트교(약 48%)가 맞닿은 국가입니다.',
    learnPoint: '나이지리아는 북부 이슬람교와 남부 크리스트교가 팽팽히 맞서는 아프리카의 대표적인 종교 점이지대입니다.',
    byReligion: {
      '이슬람교': {
        correctMethod: '직접전파',
        methodExplain: '일찍이 이슬람화된 북아프리카와 사하라 사막 남단(사헬 지대) 인접 지역에서 육로를 따라 나이지리아 북부로 연속 확산되었으므로 [직접전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Abuja_National_Mosque', 'Abuja National Mosque Nigeria golden dome'),
        landmarkName: '나이지리아 아부자 국립 모스크',
        good: {
          img: CUSTOM_EVENT_IMG.nigeriaGood,
          title: '북부 사하라 종단 교역과 소코토 이슬람 왕국 성립',
          desc: '사하라 무역로를 통해 이슬람을 받아들인 북부 하우사·풀라니족이 이슬람 왕국을 세우며 서아프리카 최대 교세를 이룹니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.nigeriaBad,
          title: '북부(이슬람)와 남부(크리스트교) 경계선 충돌',
          desc: '북부 이슬람권과 남부 크리스트교권이 맞닿는 중부 경계 지역에서 관습법과 영토 갈등으로 충돌이 발생합니다.',
          score: -5
        }
      },
      '크리스트교': {
        correctMethod: '장거리',
        methodExplain: '유럽 선교사들이 대서양 해상 항로를 통해 나이지리아 남부 기니만 해안 항구로 들어와 전파했으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:National_Christian_Centre', 'National Christian Centre Abuja Nigeria'),
        landmarkName: '나이지리아 아부자 국립 기독교 센터',
        good: {
          img: CUSTOM_EVENT_IMG.nigeriaGood,
          title: '남부 대서양 해안 선교와 아프리카 교회 대부흥',
          desc: '대서양 해안으로 들어온 선교사들과 현지 성직자들이 남부에 학교와 교회를 세워 열정적인 신앙 공동체를 이룹니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.nigeriaBad,
          title: '남북 종교 경계선 충돌과 내륙 북상 저지',
          desc: '북부 이슬람 기마 세력과의 중부 경계선 충돌 및 열대 풍토병으로 인해 내륙 선교 확장이 저지됩니다.',
          score: -5
        }
      },
      '불교': {
        correctMethod: '장거리',
        methodExplain: '아시아 불교권에서 대양을 건너온 현대 국제 교류와 도심 명상 센터 설립을 통해 유입되었으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Wat_Phra_Kaew', 'Buddhist temple golden statue meditation'),
        landmarkName: '서아프리카 국제 평화 명상 센터',
        good: {
          img: CUSTOM_EVENT_IMG.nigeriaGood,
          title: '해상 교류 확대와 비폭력 평화 명상 운동',
          desc: '종교 갈등에 지친 현지 청년들과 지식인들이 평화·명상 철학에 공감하며 도심 명상 센터가 문을 엽니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.nigeriaBad,
          title: '북부 이슬람·남부 크리스트교 양강 구도의 장벽',
          desc: '이미 인구의 98%가 이슬람교와 크리스트교를 믿으며 대립하고 있어 제3의 종교가 자리 잡기 어렵습니다.',
          score: -5
        }
      },
      '힌두교': {
        correctMethod: '장거리',
        methodExplain: '영연방 해상 네트워크를 통해 인도에서 서아프리카 해안 도시(라고스 등)로 이주한 인도계 상인들에 의해 유입되었으므로 [장거리 전파]에 해당합니다.',
        landmarkImg: buildImgPath('en:Swaminarayan_Akshardham_(Delhi)', 'Hindu temple architecture stone'),
        landmarkName: '라고스 인도계 무역상 사원',
        good: {
          img: CUSTOM_EVENT_IMG.nigeriaGood,
          title: '대서양 해상 무역과 인도계 상인 공동체 정착',
          desc: '해상 무역과 기업 활동으로 남부 항구 도시에 정착한 인도계 주민들이 사원을 세우고 문화를 교류합니다.',
          score: 5
        },
        bad: {
          img: CUSTOM_EVENT_IMG.nigeriaBad,
          title: '남북 종교 갈등과 민족 종교의 비포교 한계',
          desc: '외부 민족에게 개종을 권유하지 않는 힌두교의 특성과 현지 남북 종교 갈등으로 인해 교세 확장이 제한됩니다.',
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
    '서남아(메카)': '이슬람교',
    '북아프리카': null,
    '중앙아시아': null,
    '태국·미얀마': '불교',
    '몽골·부탄': null,
    '스리랑카': null,
    '북인도(갠지스)': '힌두교',
    '남인도(마두라이)': null,
    '네팔': null,
    '한국': null,
    '인도네시아': null,
    '싱가포르': null,
    '나이지리아': null
  };
}
resetMapOwnership();

let religionStates = {};
function resetReligionStates() {
  religionStates = {
    '크리스트교': { score: 60, regions: ['유럽(바티칸)'], ownerId: null, ownerName: null },
    '이슬람교': { score: 60, regions: ['서남아(메카)'], ownerId: null, ownerName: null },
    '불교': { score: 60, regions: ['태국·미얀마'], ownerId: null, ownerName: null },
    '힌두교': { score: 60, regions: ['북인도(갠지스)'], ownerId: null, ownerName: null }
  };
}
resetReligionStates();

const turnOrder = ['크리스트교', '이슬람교', '불교', '힌두교'];

// 2~3인 플레이 시 사람이 배정된 종교로만 턴이 넘어가도록 보장하는 함수
function moveToNextActiveTurn() {
  if (soloMode) {
    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
    return;
  }
  for (let i = 1; i <= turnOrder.length; i++) {
    const candidateIdx = (currentTurnIndex + i) % turnOrder.length;
    const rName = turnOrder[candidateIdx];
    if (religionStates[rName].ownerId) {
      currentTurnIndex = candidateIdx;
      return;
    }
  }
}

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
    resetReligionStates();

    if (soloMode) {
      players[0].religion = 'ALL';
      turnOrder.forEach(r => {
        religionStates[r].ownerId = players[0].id;
        religionStates[r].ownerName = players[0].name;
      });
      currentTurnIndex = 0;
    } else {
      const shuffled = [...turnOrder].sort(() => Math.random() - 0.5);
      players.forEach((p, idx) => {
        p.religion = shuffled[idx];
        religionStates[p.religion].ownerId = p.id;
        religionStates[p.religion].ownerName = p.name;
      });
      // 첫 번째 턴도 실제 플레이어가 배정된 첫 종교부터 시작
      currentTurnIndex = turnOrder.findIndex(r => religionStates[r].ownerId !== null);
      if (currentTurnIndex === -1) currentTurnIndex = 0;
    }

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
      const isMethodRight = (relInfo.correctMethod === method);
      const baseGain = isMethodRight ? 20 : 10;

      step1Card = {
        headerTitle: '⚜ 종교 전파 결과 ⚜',
        badgeText: isMethodRight
          ? `🤝 다종교 혼합 권역 + 전파 방식 일치 (+${baseGain}점)`
          : `🤝 다종교 혼합 권역 / 전파 방식 착오 (+${baseGain}점)`,
        img: relInfo.landmarkImg,
        landmarkName: relInfo.landmarkName,
        title: `${activeReligion} ➔ ${region.name}`,
        desc: region.desc,
        baseGain: baseGain,
        methodNote: isMethodRight
          ? `✅ [전파 방식 정답: ${relInfo.correctMethod}] ${relInfo.methodExplain}`
          : `⚠️ [선택: ${method} ➔ 실제 정답: ${relInfo.correctMethod}] ${relInfo.methodExplain}`
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
          ? `🌟 주류 종교 + 전파 방식 완벽 일치! (+${baseGain}점)`
          : `⚠️ 주류 종교 일치 / 전파 방식 착오 (+${baseGain}점)`,
        img: region.landmarkImg,
        landmarkName: region.landmarkName,
        title: `${activeReligion} ➔ ${region.name}`,
        desc: region.desc,
        baseGain: baseGain,
        methodNote: isMethodRight
          ? `✅ [전파 방식 정답: ${region.correctMethod}] ${region.methodExplain}`
          : `⚠️ [선택: ${method} ➔ 실제 정답: ${region.correctMethod}] ${region.methodExplain}`
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
        img: CUSTOM_EVENT_IMG.failWall,
        landmarkName: `전파 실패: 기존 주류 종교(${region.preferred})의 강력한 문화 장벽`,
        title: `${activeReligion} ➔ ${region.name} 전파 좌절`,
        desc: `오답입니다! [${region.name}] 지역은 역사적으로 [${region.preferred}]의 전통과 교세가 압도적으로 강한 곳이어서 전파에 실패했습니다.`,
        baseGain: -20,
        methodNote: `❌ [실제 주류 종교(${region.preferred})의 전파 방식: ${region.correctMethod}] ${region.methodExplain}`
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

    moveToNextActiveTurn();
    io.emit('nextTurn', { currentReligion: turnOrder[currentTurnIndex] });
  });

  socket.on('disconnect', () => {
    const leaving = players.find(p => p.id === socket.id);
    if (leaving && leaving.religion && leaving.religion !== 'ALL' && religionStates[leaving.religion]) {
      religionStates[leaving.religion].ownerId = null;
      religionStates[leaving.religion].ownerName = `${leaving.name}(퇴장)`;
      if (gameStarted && turnOrder[currentTurnIndex] === leaving.religion) {
        moveToNextActiveTurn();
        io.emit('nextTurn', { currentReligion: turnOrder[currentTurnIndex] });
      }
    }

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
