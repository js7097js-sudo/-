const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const RELIGIONS = [
  { id: 'christianity', name: '크리스트교', symbol: '✝', color: '#7c3aed', origin: '바티칸·이탈리아' },
  { id: 'islam', name: '이슬람교', symbol: '☪', color: '#059669', origin: '사우디아라비아' },
  { id: 'buddhism', name: '불교', symbol: '☸', color: '#d97706', origin: '태국·동남아' },
  { id: 'hinduism', name: '힌두교', symbol: '🕉', color: '#ea580c', origin: '인도' }
];

// AI 이미지 URL 생성 헬퍼
function aiImg(prompt) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=450&nologo=true&seed=${Math.floor(Math.random() * 9999)}`;
}

// 11개 핵심 권역 데이터 (단일 종교 중심지 7곳 + 다종교 종합 국가 4곳)
const REGIONS = {
  '바티칸·이탈리아': {
    name: '바티칸·이탈리아(유럽)',
    type: 'pure',
    preferred: '크리스트교',
    desc: '로마 제국의 국교 공인 이후 가톨릭의 총본산인 바티칸 성 베드로 대성당이 자리 잡은 유럽 크리스트교의 심장입니다.',
    goodOutcome: {
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/St_Peter%27s_Square,_Vatican_City_-_April_2007.jpg?width=800',
      label: '🏛️ 바티칸 성 베드로 대성당 (실제 랜드마크)',
      text: '🏛️ [랜드마크] 바티칸 성 베드로 대성당 완공! 유럽 전역에서 성지 순례 행렬이 이어지며 교세가 절정에 달합니다.',
      score: 30
    },
    badOutcome: {
      prompt: 'historical oil painting style illustration of the Protestant Reformation Martin Luther posting 95 theses on church door in Europe, dramatic lighting',
      label: '🎨 AI 역사 일러스트: 유럽 종교개혁과 신·구교 갈등',
      text: '⚔️ [역사적 시련] 면벌부 판매 비판과 종교개혁 발발! 구교와 신교의 분열 및 30년 전쟁으로 교세가 흔들립니다.',
      score: -15
    }
  },
  '사우디아라비아': {
    name: '사우디아라비아(서남아시아)',
    type: 'pure',
    preferred: '이슬람교',
    desc: '예언자 무함마드가 이슬람교를 창시하고 성지 메카의 카바 신전이 위치한 이슬람 세계의 발상지입니다.',
    goodOutcome: {
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Al-Haram_mosque_-_panoramio_(4).jpg?width=800',
      label: '🕌 성지 메카 마스지드 알하람과 카바 신전 (실제 랜드마크)',
      text: '🕌 [랜드마크] 성지 메카 대순례(하즈) 성황! 전 세계 수백만 무슬림이 카바 신전을 돌며 형제애를 다집니다.',
      score: 30
    },
    badOutcome: {
      prompt: 'dramatic historical painting of medieval crusader knights clashing with Saracen cavalry in the desert of Jerusalem, epic history art',
      label: '🎨 AI 역사 일러스트: 성지 예루살렘을 둘러싼 십자군 전쟁',
      text: '⚔️ [역사적 시련] 십자군 전쟁 발발과 사막 교역로 봉쇄! 오랜 전쟁으로 인해 전파 상단의 발길이 묶였습니다.',
      score: -15
    }
  },
  '인도': {
    name: '인도(남아시아)',
    type: 'pure',
    preferred: '힌두교',
    desc: '어머니의 강 갠지스강을 중심으로 다신교 신앙과 윤회 사상이 깊게 뿌리내린 힌두교의 본고장입니다.',
    goodOutcome: {
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Varanasi_Ghats_2013.jpg?width=800',
      label: '🛕 바라나시 갠지스강 가트와 힌두 사원 (실제 랜드마크)',
      text: '🎆 [대표 축제] 바라나시 갠지스강 쿰브 멜라 대축제! 수천만 명의 신자가 성스러운 강물에서 정화 의식을 치릅니다.',
      score: 30
    },
    badOutcome: {
      prompt: 'historical illustration of ancient Buddhist stupa ruins in India declining as Hinduism and Islamic Mughal empire rise, atmospheric art',
      label: '🎨 AI 역사 일러스트: 인도 내 왕조 교체와 종교 지형 변화',
      text: '📜 [역사적 시련] 무굴 제국의 침입과 카스트 제도를 둘러싼 내부 갈등으로 사원 증축이 일시 중단되었습니다.',
      score: -15
    }
  },
  '태국·동남아': {
    name: '태국· 인도차이나(동남아)',
    type: 'pure',
    preferred: '불교',
    desc: '인도에서 스리랑카를 거쳐 전파된 상좌부 불교가 왕실과 백성의 삶 깊숙이 자리 잡은 황금 불탑의 땅입니다.',
    goodOutcome: {
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Wat_Phra_Kaew_by_Ninara.jpg?width=800',
      label: '🏯 방콕 에메랄드 사원 왓 프라깨우 (실제 랜드마크)',
      text: '🏯 [랜드마크] 방콕 왕궁 에메랄드 사원과 황금 불탑 완공! 전 국민이 참여하는 성대한 불교 축제가 열립니다.',
      score: 30
    },
    badOutcome: {
      prompt: 'historical illustration of ancient Southeast Asian Ayutthaya kingdom temples burning during royal war, dramatic smoke and fire',
      label: '🎨 AI 역사 일러스트: 인도차이나 왕조 전쟁과 사원 훼손',
      text: '🔥 [역사적 시련] 인접 왕조와의 전쟁으로 고대 사원과 불상이 일부 불타는 시련을 겪었습니다.',
      score: -15
    }
  },
  '이집트·북아프리카': {
    name: '이집트·북아프리카',
    type: 'pure',
    preferred: '이슬람교',
    desc: '아라비아반도와 지리적으로 인접하여 일찍부터 이슬람화되었으며 사하라 사막 종단 무역의 출발점입니다.',
    goodOutcome: {
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mosque_of_Muhammad_Ali_Cairo_Egypt.jpg?width=800',
      label: '🕌 카이로 무함마드 알리 대모스크 (실제 랜드마크)',
      text: '🕌 [랜드마크] 카이로 대모스크와 알아즈하르 대학 완공! 사하라 금·소금 교역로를 따라 이슬람이 빠르게 확산됩니다.',
      score: 25
    },
    badOutcome: {
      prompt: 'dramatic illustration of a camel caravan caught in a massive Sahara desert sandstorm tornado, vintage adventure painting',
      label: '🎨 AI 돌발 일러스트: 사하라 사막 대형 모래폭풍',
      text: '🌪️ [돌발 재난] 사하라 사막을 건너던 대상(카라반)이 거대한 모래폭풍을 만나 오아시스에서 고립되었습니다.',
      score: -15
    }
  },
  '미국·캐나다': {
    name: '미국·캐나다(북아메리카)',
    type: 'pure',
    preferred: '크리스트교',
    desc: '신앙의 자유를 찾아 대서양을 건넌 유럽 청교도들과 이주민들에 의해 크리스트교가 주류가 된 대륙입니다.',
    goodOutcome: {
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/St._Patrick%27s_Cathedral,_New_York_City.jpg?width=800',
      label: '⛪ 뉴욕 세인트 패트릭 대성당 (실제 랜드마크)',
      text: '🔔 [랜드마크] 대서양을 건넌 이주민들이 도시마다 웅장한 성당과 개신교 교회를 세우며 신앙 공동체를 꽃피웁니다.',
      score: 25
    },
    badOutcome: {
      prompt: 'dramatic historical painting of the Mayflower wooden sailing ship battling a fierce Atlantic Ocean storm with giant waves and lightning',
      label: '🎨 AI 돌발 일러스트: 대서양 횡단 선교선 폭풍우 조우',
      text: '🌊 [돌발 재난] 대서양을 건너던 선교 범선이 거대한 폭풍우를 만나 돛대가 부러지고 항로를 이탈했습니다!',
      score: -15
    }
  },
  '브라질·남미': {
    name: '브라질·라틴아메리카',
    type: 'pure',
    preferred: '크리스트교',
    desc: '대항해시대 스페인과 포르투갈의 식민 지배 및 가톨릭 수도회의 열정적인 선교로 대륙 전체가 가톨릭화되었습니다.',
    goodOutcome: {
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cristo_Redentor_-_Rio_de_Janeiro,_Brasil.jpg?width=800',
      label: '🗽 리우데자네이루 구속주 예수상 (실제 랜드마크)',
      text: '🗽 [랜드마크] 코르코바두 산 정상에 세워진 거대 구속주 예수상이 라틴아메리카 가톨릭 신앙의 상징이 됩니다!',
      score: 30
    },
    badOutcome: {
      prompt: 'historical illustration of Spanish Jesuit missionaries trekking through dense Amazon rainforest and steep Andes mountains in heavy rain',
      label: '🎨 AI 돌발 일러스트: 아마존 밀림과 안데스 고산 지대 난관',
      text: '⛈️ [지리적 난관] 험준한 안데스 산맥과 아마존 열대 우림의 풍토병으로 인해 내륙 선교단이 큰 어려움을 겪습니다.',
      score: -15
    }
  },
  '호주·오세아니아': {
    name: '호주·오세아니아',
    type: 'pure',
    preferred: '크리스트교',
    desc: '영국을 비롯한 유럽인들의 이주와 정착으로 인해 크리스트교 문화권으로 편입된 남반구 대륙입니다.',
    goodOutcome: {
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/St_Marys_Cathedral_Sydney_cropped.jpg?width=800',
      label: '⛪ 시드니 세인트 메리 대성당 (실제 랜드마크)',
      text: '⛪ [랜드마크] 시드니 세인트 메리 대성당 완공! 남태평양 해안 도시들을 중심으로 크리스트교가 안정적으로 정착합니다.',
      score: 25
    },
    badOutcome: {
      prompt: 'dramatic painting of an 18th century sailing ship hitting coral reefs in the South Pacific ocean during a tropical cyclone',
      label: '🎨 AI 돌발 일러스트: 남태평양 산호초 암초 좌초 위기',
      text: '🌊 [돌발 재난] 남태평양 해역을 항해하던 선박이 거친 파도에 밀려 대보초(산호초) 암초에 좌초되었습니다!',
      score: -15
    }
  },

  // =========================================================================
  // 4대 다종교 종합 국가: 각 국가의 실제 역사와 지리적 특성 50:50 이벤트!
  // =========================================================================
  '한국': {
    name: '한국(동아시아 다종교 공존)',
    type: 'hybrid',
    desc: '고대~고려의 불교 전통 위에 조선의 유교(성리학), 근현대의 천주교와 개신교가 유입되어 평화롭게 공존하는 국가입니다.',
    religionEvents: {
      '불교': {
        good: {
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bulguksa_Temple_in_Gyeongju_01.jpg?width=800',
          label: '🏯 경주 불국사와 다보탑·석가탑 (실제 랜드마크)',
          text: '🏯 [역사적 전성기: 호국불교] 삼국시대~고려시대에 불교가 국교로 채택되어 불국사 창건과 팔만대장경 판각 등 찬란한 불교 문화가 꽃피웁니다!',
          score: 30
        },
        bad: {
          prompt: 'historical Korean Joseon dynasty Confucian scholars in hanbok closing down a mountain Buddhist temple, Supyu Eokbul policy historical illustration',
          label: '🎨 AI 한국사 일러스트: 조선시대 성리학 국교화와 숭유억불 정책',
          text: '📜 [역사적 시련: 숭유억불!] 조선 건국 후 성리학(유교)이 국교가 되면서 도성 내 사찰이 철거되고 승려의 도성 출입이 금지되었습니다!',
          score: -15
        }
      },
      '크리스트교': {
        good: {
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Myeongdong_Cathedral_2019.jpg?width=800',
          label: '⛪ 서울 명동성당 (실제 랜드마크)',
          text: '⛪ [근현대 부흥] 개화기 선교사들이 근대 학교와 병원을 설립하고 명동성당과 대형 교회가 세워지며 대중 속에 깊숙이 뿌리내립니다!',
          score: 30
        },
        bad: {
          prompt: 'dramatic historical illustration of Joseon dynasty Catholic persecution Shinyu and Byeongin persecution, Korean martyrs in white hanbok arrested by royal guards',
          label: '🎨 AI 한국사 일러스트: 조선 후기 천주교 박해(신유·병인박해)',
          text: '⚔️ [역사적 시련: 천주교 박해!] 조선 조정에서 조상 제사 거부를 이유로 신유박해·병인박해를 일으켜 수많은 신자와 선교사가 순교했습니다!',
          score: -15
        }
      },
      '이슬람교': {
        good: {
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Seoul_Central_Mosque_2014.jpg?width=800',
          label: '🕌 서울 한남동 중앙성원 (실제 랜드마크)',
          text: '🕌 [고려 벽란도~현대 교류] 고려시대 아랍 상인(대식국)의 벽란도 교역에 이어, 현대 서울 중앙성원과 K-할랄 푸드 열풍으로 큰 호응을 얻습니다!',
          score: 25
        },
        bad: {
          prompt: 'illustration of medieval Arab merchants in Goryeo Korea struggling with strict local royal customs and unfamiliar pork diet culture',
          label: '🎨 AI 역사 일러스트: 원 간섭기 이후 회회교(이슬람) 풍습 제한',
          text: '📜 [역사적 시련] 조선 세종 시기 회회교(이슬람)인들에게 고유 의복과 의례를 금지하고 조선 풍습을 따르도록 명령하여 교세가 꺾였습니다!',
          score: -15
        }
      },
      '힌두교': {
        good: {
          img: aiImg('Korean people and Indian expats enjoying colorful Diwali festival and yoga meditation near Gyeongbokgung palace in Seoul, warm illustration'),
          label: '🎨 AI 문화 교류 일러스트: 가야 허황옥 설화와 현대 요가·디왈리 열풍',
          text: '🧘 [문화적 접목] 고대 가야 김수로왕과 인도 아유타국 허황옥 왕비의 인연부터 현대 한국의 인도 요가·커리 열풍까지 더해져 큰 인기를 얻습니다!',
          score: 25
        },
        bad: {
          prompt: 'humorous digital illustration of an Indian Hindu guru confused by Korean winter snowstorm and spicy meat BBQ restaurants in Seoul',
          label: '🎨 AI 돌발 일러스트: 한반도의 혹독한 겨울 추위와 채식 정착 난관',
          text: '❄️ [정착 난관] 인도와 다른 한국의 매서운 겨울 한파와 육류 위주의 회식 문화로 인해 정통 힌두 수행자들과 신도들이 정착에 애를 먹습니다!',
          score: -10
        }
      }
    }
  },

  '인도네시아·말레이': {
    name: '인도네시아·말레이(해상 교차로)',
    type: 'hybrid',
    desc: '고대에는 힌두교와 불교 왕국이 번성했으나, 13세기 이후 인도양 무슬림 상인들의 해상 무역으로 이슬람교가 주류가 된 복합 문화권입니다.',
    religionEvents: {
      '이슬람교': {
        good: {
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Masjid_Istiqlal_Jakarta.jpg?width=800',
          label: '🕌 자카르타 이스티클랄 대모스크 (실제 랜드마크)',
          text: '⛵ [해상 무역 전파 대성공] 향신료를 거래하던 무슬림 상인들이 평화적으로 교리를 전파하여 동남아 최대 이스티클랄 대모스크가 건립됩니다!',
          score: 30
        },
        bad: {
          prompt: 'historical painting of 17th century Dutch East India Company VOC warships blockading Indonesian spice trade ports against local sultans',
          label: '🎨 AI 역사 일러스트: 유럽 제국주의(네덜란드 동인도회사)의 무역 독점',
          text: '⚔️ [역사적 시련] 대항해시대 유럽 함대(포르투갈·네덜란드)가 말라카 해협과 향신료 무역항을 무력 점령하여 이슬람 상권이 타격을 입었습니다!',
          score: -15
        }
      },
      '불교': {
        good: {
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Borobudur-Nothwest-view.jpg?width=800',
          label: '🏯 세계 최대 불교 유적 보로부두르 대불탑 (실제 랜드마크)',
          text: '🏯 [고대 왕국의 영광] 샤일렌드라 왕조 시기 세워진 세계 최대 불교 사원 보로부두르가 복원되어 수많은 순례자와 관광객이 몰려듭니다!',
          score: 30
        },
        bad: {
          prompt: 'dramatic historical illustration of Mount Merapi volcano erupting in Java Indonesia burying the ancient Borobudur temple in volcanic ash and jungle',
          label: '🎨 AI 역사 일러스트: 머라피 화산 대폭발과 보로부두르 사원 매몰',
          text: '🌋 [역사적 재난: 화산 폭발!] 자바섬의 대형 화산 폭발로 인해 찬란했던 보로부두르 불탑이 수백 년간 화산재와 밀림 속에 묻히고 말았습니다!',
          score: -15
        }
      },
      '힌두교': {
        good: {
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pura_Ulun_Danu_Bratan,_2017.jpg?width=800',
          label: '🛕 발리 울룬 다누 브라탄 힌두 사원 (실제 랜드마크)',
          text: '🌺 [발리 힌두 왕조의 보존] 자바섬이 이슬람화될 때 왕족과 예술가들이 발리섬으로 이주하여 독창적이고 아름다운 발리 힌두 문화를 꽃피웠습니다!',
          score: 30
        },
        bad: {
          prompt: 'historical illustration of the fall of the Hindu Majapahit Empire in Java as Islamic Sultanate of Demak rises, dramatic historical scene',
          label: '🎨 AI 역사 일러스트: 마자파힛 힌두 제국의 쇠퇴',
          text: '📜 [역사적 전환] 해상 무역권을 장악한 이슬람 술탄국들이 성장하면서 자바섬을 호령하던 마자파힛 힌두 왕조가 멸망하고 발리섬으로 후퇴했습니다!',
          score: -15
        }
      },
      '크리스트교': {
        good: {
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jakarta_Cathedral_2018.jpg?width=800',
          label: '⛪ 자카르타 대성당 (실제 랜드마크)',
          text: '⛪ [공존의 기적] 자카르타 대성당과 이스티클랄 대모스크가 지하 ‘우정의 터널’로 연결되어 종교 간 화합의 세계적 모범이 됩니다!',
          score: 25
        },
        bad: {
          prompt: 'historical illustration of fierce local resistance in Aceh Indonesia against European colonial missionaries, tense tropical harbor scene',
          label: '🎨 AI 역사 일러스트: 아체 술탄국 등 토착 이슬람 세력의 저항',
          text: '⚔️ [역사적 갈등] 식민 지배와 함께 들어온 서구 선교단에 맞서 아체 지역 등 기존 무슬림 왕국들이 강력하게 저항하여 전파가 저지되었습니다!',
          score: -15
        }
      }
    }
  },

  '싱가포르': {
    name: '싱가포르(글로벌 다문화 허브)',
    type: 'hybrid',
    desc: '동서양 해상 무역과 항공의 중심지로 중국계(불교·도교), 말레이계(이슬람), 인도계(힌두교), 서구권(크리스트교)이 한 도시에 모여 사는 국가입니다.',
    religionEvents: {
      '불교': {
        good: {
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Buddha_Tooth_Relic_Temple_Singapore_2012.jpg?width=800',
          label: '🏯 싱가포르 차이나타운 불아사(부처님 치아 사리 사원)',
          text: '✈️ [글로벌 관광 허브 대박!] 싱가포르를 경유하던 전 세계 환승 관광객들이 차이나타운 불아사의 화려한 야경과 문화에 매료되어 명성이 급상승합니다!',
          score: 30
        },
        bad: {
          prompt: 'illustration of modern Singapore government officers fining a loud street preacher under the Maintenance of Religious Harmony Act, city skyline',
          label: '🎨 AI 싱가포르 이벤트: 엄격한 종교화합유지법(MRHA) 단속',
          text: '🚨 [싱가포르 특별법 발동!] 거리에서 타 종교를 비판하며 무리하게 포교하다가 싱가포르의 엄격한 ‘종교화합유지법’에 걸려 벌금과 활동 정지를 당했습니다!',
          score: -15
        }
      },
      '힌두교': {
        good: {
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sri_Mariamman_Temple_Singapore_2.jpg?width=800',
          label: '🛕 싱가포르 최고(最古) 스리 마리암만 힌두 사원 (실제 랜드마크)',
          text: '🎆 [리틀인디아 디파발리 축제!] 싱가포르 리틀인디아 거리가 화려한 조명으로 물들며 다민족 시민들과 외국인 관광객들이 힌두 축제를 함께 즐깁니다!',
          score: 30
        },
        bad: {
          prompt: 'illustration of religious leaders in ultra expensive modern Singapore looking shocked at sky-high real estate rent prices near Marina Bay',
          label: '🎨 AI 싱가포르 이벤트: 세계 최고 수준의 도심 부동산 임대료 폭등',
          text: '💸 [현실적 난관: 살인적인 땅값!] 서울보다 좁은 도시국가 싱가포르의 천문학적인 토지 비용 때문에 신규 사원 부지 매입이 무산되었습니다!',
          score: -15
        }
      },
      '이슬람교': {
        good: {
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sultan_Mosque_Singapore.jpg?width=800',
          label: '🕌 싱가포르 캄퐁글람 술탄 모스크 (실제 랜드마크)',
          text: '🕌 [아랍스트리트 명소화!] 황금 돔이 빛나는 술탄 모스크와 주변 할랄 맛집 거리가 세계적인 핫플레이스가 되어 젊은 층의 호감도가 폭발합니다!',
          score: 30
        },
        bad: {
          prompt: 'illustration of modern Singapore government officers fining a loud street preacher under the Maintenance of Religious Harmony Act, city skyline',
          label: '🎨 AI 싱가포르 이벤트: 엄격한 종교화합유지법(MRHA) 단속',
          text: '🚨 [싱가포르 특별법 발동!] 다민족 국가인 싱가포르에서 허가받지 않은 광장 집회를 열다가 공권력의 제지를 받고 점수를 잃었습니다!',
          score: -15
        }
      },
      '크리스트교': {
        good: {
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/St_Andrews_Cathedral_Singapore.jpg?width=800',
          label: '⛪ 싱가포르 세인트 앤드류 대성당 (실제 랜드마크)',
          text: '🎄 [오차드 로드 크리스마스 축복!] 영국 식민지 시절 세워진 순백의 세인트 앤드류 대성당과 도심 축제가 전 세계 여행객들의 찬사를 받습니다!',
          score: 30
        },
        bad: {
          prompt: 'illustration of religious leaders in ultra expensive modern Singapore looking shocked at sky-high real estate rent prices near Marina Bay',
          label: '🎨 AI 싱가포르 이벤트: 세계 최고 수준의 도심 임대료 난관',
          text: '💸 [현실적 난관] 글로벌 금융 허브 싱가포르의 엄청난 물가와 임대료 상승으로 선교 센터 운영비가 바닥나 활동이 축소되었습니다!',
          score: -15
        }
      }
    }
  },

  '나이지리아·중부아프리카': {
    name: '나이지리아(아프리카 종교 분수령)',
    type: 'hybrid',
    desc: '사하라 사막 무역로로 전파된 북부의 이슬람교(약 50%)와 대서양 해안 선교로 전파된 남부의 크리스트교(약 48%)가 팽팽히 맞서는 국가입니다.',
    religionEvents: {
      '이슬람교': {
        good: {
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Abuja_National_Mosque.jpg?width=800',
          label: '🕌 나이지리아 아부자 국립 모스크 (실제 랜드마크)',
          text: '🐪 [북부 사하라 교역의 결실!] 북부 하우사·풀라니 왕국의 오랜 전통과 수도 아부자 국립 모스크를 중심으로 서아프리카 최대 이슬람 교세를 자랑합니다!',
          score: 30
        },
        bad: {
          prompt: 'dramatic illustration of tense border dividing line between northern desert and southern tropical region in Nigeria Africa, political tension art',
          label: '🎨 AI 아프리카 이슈 일러스트: 남북 종교 경계선 갈등',
          text: '⚔️ [남북 갈등 발생!] 북부의 이슬람 관습법(샤리아) 도입을 둘러싸고 남부 크리스트교 주민들과 극심한 사회적 마찰이 빚어졌습니다!',
          score: -15
        }
      },
      '크리스트교': {
        good: {
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/National_Church_of_Nigeria_Abuja.jpg?width=800',
          label: '⛪ 나이지리아 아부자 국립 기독교 센터 (실제 랜드마크)',
          text: '🎶 [아프로비트 가스펠 대부흥!] 남부 라고스와 아부자를 중심으로 열정적인 아프리카 리듬의 찬양과 초대형 교회(메가처치) 부흥이 일어납니다!',
          score: 30
        },
        bad: {
          prompt: 'historical illustration of European missionaries in 19th century West Africa suffering from tropical malaria mosquito fever in dense jungle river',
          label: '🎨 AI 역사 일러스트: 서아프리카 열대 풍토병(말라리아)과 남북 갈등',
          text: '🦟 [역사·지리적 난관] ‘백인의 무덤’이라 불리던 서아프리카의 말라리아·체체파리 풍토병과 북부 이슬람 세력과의 충돌로 내륙 진출이 저지되었습니다!',
          score: -15
        }
      },
      '불교': {
        good: {
          img: aiImg('African people in colorful traditional attire practicing peaceful Buddhist lotus meditation in Lagos Nigeria cultural center, warm art'),
          label: '🎨 AI 문화 교류 일러스트: 아프리카 청년 평화 명상 모임',
          text: '🌍 [특별 상호작용!] 종파 갈등에 지친 현지 지식인들과 청년들이 불교의 비폭력·평화 명상 철학에 깊은 감명을 받아 동아리를 결성했습니다!',
          score: 25
        },
        bad: {
          prompt: 'illustration of a lone Buddhist monk looking lost in a bustling noisy African market in Lagos Nigeria with huge churches and mosques around',
          label: '🎨 AI 돌발 일러스트: 양대 종교(기독교·이슬람) 구도 속 인지도 부족',
          text: '😅 [현실적 장벽] 이미 크리스트교와 이슬람교가 98%를 차지해 치열하게 경쟁하는 나이지리아에서 동양 종교의 교리를 알리기가 쉽지 않습니다!',
          score: -10
        }
      },
      '힌두교': {
        good: {
          img: aiImg('Indian merchants and Nigerian locals celebrating Diwali festival of lights together in Lagos port city, vibrant digital illustration'),
          label: '🎨 AI 문화 교류 일러스트: 인도계 무역상 커뮤니티와 볼리우드 열풍',
          text: '🎬 [볼리우드 & 무역 파워!] 나이지리아에 진출한 인도 기업인들과 현지에서 엄청난 인기를 끄는 인도 영화(볼리우드) 덕분에 힌두 사원 축제가 성황을 이룹니다!',
          score: 25
        },
        bad: {
          prompt: 'dramatic illustration of a cargo ship carrying temple statues delayed at a congested African port during heavy tropical monsoon rain',
          label: '🎨 AI 돌발 일러스트: 기니만 열대 폭우와 통관 지연',
          text: '⛈️ [돌발 악재] 기니만의 거센 열대 몬순 폭우와 항만 마비로 인해 축제 물자와 사원 건축 자재 보급이 중단되었습니다!',
          score: -10
        }
      }
    }
  }
};

// 비주류 단일 국가에 타 종교가 전파될 때의 50:50 특별 이벤트 생성기
function getUnmatchedEvent(religion, regionName) {
  const isGood = Math.random() < 0.5;
  if (isGood) {
    const prompts = {
      '크리스트교': `joyful global Christmas market and gospel choir festival in ${regionName}, locals taking photos and smiling, vibrant digital art`,
      '이슬람교': `exotic Arabian cultural expo with halal food, calligraphy and silk carpets popular among tourists in ${regionName}, warm illustration`,
      '불교': `peaceful Zen mindfulness meditation and lotus lantern festival becoming a trendy wellness culture in ${regionName}, glowing art`,
      '힌두교': `exciting colorful Holi festival of colors and yoga flashmob attracting young people in ${regionName}, vibrant digital art`
    };
    return {
      img: aiImg(prompts[religion]),
      label: `🎨 AI 특별 이벤트: ${regionName}에서 열린 글로벌 ${religion} 문화제`,
      text: `🌍 [특별 상호작용 대성공!] 비주류 권역이지만 세계화와 SNS 열풍을 타고 ${regionName}에서 열린 '${religion} 문화 체험 축제'가 현지인들의 폭발적인 사랑을 받았습니다!`,
      score: 20
    };
  } else {
    const badList = [
      {
        prompt: `dramatic illustration of an ancient sailing ship caught in a fierce ocean storm with giant waves on the way to ${regionName}, game art`,
        label: '🎨 AI 돌발 재난: 원정 항해 중 폭풍우 조난',
        text: `🌊 [돌발 재난: 선박 난파 위기!] ${regionName}(으)로 향하던 전파선이 바다 한가운데서 거대한 태풍을 만나 선박이 파손되고 물자를 잃었습니다!`,
        score: -15
      },
      {
        prompt: `historical illustration of local traditional citizens in ${regionName} protesting and closing gates against unfamiliar foreign religion missionaries`,
        label: `🎨 AI 역사 갈등: ${regionName} 기존 주류 종교 세력의 반발`,
        text: `⚔️ [문화적 장벽과 배척!] 이미 기존 주류 종교가 강하게 자리 잡은 ${regionName}에서 낯선 외래 종교에 대한 경계령이 내려져 포교가 저지되었습니다!`,
        score: -15
      }
    ];
    const picked = badList[Math.floor(Math.random() * badList.length)];
    return {
      img: aiImg(picked.prompt),
      label: picked.label,
      text: picked.text,
      score: picked.score
    };
  }
}

let players = [];
let currentTurnIndex = 0;
let gameStarted = false;
let soloMode = false;

let mapOwnership = {
  '바티칸·이탈리아': '크리스트교',
  '사우디아라비아': '이슬람교',
  '인도': '힌두교',
  '태국·동남아': '불교',
  '이집트·북아프리카': null,
  '미국·캐나다': null,
  '브라질·남미': null,
  '호주·오세아니아': null,
  '한국': null,
  '인도네시아·말레이': null,
  '나이지리아·중부아프리카': null
};

let religionStates = {
  '크리스트교': { score: 60, regions: ['바티칸·이탈리아'], ownerId: null },
  '이슬람교': { score: 60, regions: ['사우디아라비아'], ownerId: null },
  '불교': { score: 60, regions: ['태국·동남아'], ownerId: null },
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
    let isHybrid = (region.type === 'hybrid');
    let baseScore = 15;
    let methodBonus = (method === '장거리') ? 15 : 10;
    let outcome = null;

    if (isHybrid) {
      // 4대 종합 국가(한국, 인도네시아, 싱가포르, 나이지리아): 정확히 50% 확률로 호재(실사 랜드마크) vs 50% 확률로 역사적 시련/특수 악재!
      isMatched = true;
      baseScore = 30;
      const rEvent = region.religionEvents[activeReligion];
      if (Math.random() < 0.5) {
        outcome = rEvent.good;
      } else {
        outcome = {
          img: aiImg(rEvent.bad.prompt),
          label: rEvent.bad.label,
          text: rEvent.bad.text,
          score: rEvent.bad.score
        };
      }
    } else if (region.preferred === activeReligion) {
      // 단일 주류 종교 국가 일치 시: 65% 실사 랜드마크 호재 vs 35% 역사적 시련
      isMatched = true;
      baseScore = 35;
      if (Math.random() < 0.65) {
        outcome = region.goodOutcome;
      } else {
        outcome = {
          img: aiImg(region.badOutcome.prompt),
          label: region.badOutcome.label,
          text: region.badOutcome.text,
          score: region.badOutcome.score
        };
      }
    } else {
      // 비주류 지역 전파: 50% 글로벌 특별 상호작용 호재 vs 50% 폭풍우/배척 악재
      isMatched = false;
      baseScore = 15;
      outcome = getUnmatchedEvent(activeReligion, region.name);
    }

    const totalGain = Math.max(0, baseScore + methodBonus + outcome.score);
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
      imgUrl: outcome.img,
      imgLabel: outcome.label,
      method,
      isMatched,
      isHybrid,
      eventText: outcome.text,
      eventScore: outcome.score,
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
        '바티칸·이탈리아': '크리스트교', '사우디아라비아': '이슬람교', '인도': '힌두교', '태국·동남아': '불교',
        '이집트·북아프리카': null, '미국·캐나다': null, '브라질·남미': null, '호주·오세아니아': null,
        '한국': null, '인도네시아·말레이': null, '나이지리아·중부아프리카': null
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
