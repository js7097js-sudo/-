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

// 사전 확보된 고화질 역사 기록화 / 삽화 URL (절대 깨지거나 제한 걸리지 않음)
const ART = {
  stormShip: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ivan_Aivazovsky_-_The_Ninth_Wave.jpg?width=800',
  sandStorm: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jean-L%C3%A9on_G%C3%A9r%C3%B4me_-_Simoom.jpg?width=800',
  crusade: 'https://commons.wikimedia.org/wiki/Special:FilePath/ Eug%C3%A8ne_Delacroix_-_Entr%C3%A9e_des_Crois%C3%A9s_%C3%A0_Constantinople_(1840).jpg?width=800',
  reformation: 'https://commons.wikimedia.org/wiki/Special:FilePath/Luther_95_Thesen.jpg?width=800',
  silkRoad: 'https://commons.wikimedia.org/wiki/Special:FilePath/Caravane_Marco_Polo.jpg?width=800',
  templeWar: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ayutthaya_ruins.jpg?width=800',
  volcano: 'https://commons.wikimedia.org/wiki/Special:FilePath/Krakatoa_eruption_lithograph.jpg?width=800',
  joseonConfucian: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sungkyunkwan_Myeongnyundang.jpg?width=800',
  koreaMartyr: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jeoldusan_Martyrs_Shrine.jpg?width=800',
  dutchShip: 'https://commons.wikimedia.org/wiki/Special:FilePath/voc_ship_amsterdam.jpg?width=800',
  singaporeCity: 'https://commons.wikimedia.org/wiki/Special:FilePath/Singapore_Skyline_at_Night.jpg?width=800',
  festivalLight: 'https://commons.wikimedia.org/wiki/Special:FilePath/Lotus_Lantern_Festival_in_Seoul.jpg?width=800'
};

// 11개 핵심 권역: 1단계(전파 기본 정보 & 대표 실사 랜드마크) + 2단계(특수 이벤트 카드 데이터)
const REGIONS = {
  '바티칸·이탈리아': {
    name: '바티칸·이탈리아',
    type: 'pure',
    preferred: '크리스트교',
    landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/St_Peter%27s_Square,_Vatican_City_-_April_2007.jpg?width=800',
    landmarkName: '바티칸 성 베드로 대성당',
    desc: '로마 제국의 국교 공인 이후 가톨릭의 총본산인 바티칸이 자리 잡은 유럽 크리스트교의 중심지입니다.',
    learnPoint: '크리스트교는 팔레스타인에서 기원한 후 로마 제국을 거쳐 유럽 전역의 문화적 뿌리가 되었습니다.',
    goodEvent: {
      title: '대성당 완공과 성지 순례 대성황',
      desc: '르네상스 예술의 결정체인 대성당이 완공되어 전 세계 신도들의 순례가 이어집니다. 교세가 크게 확장됩니다.',
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/St_Peter%27s_Square,_Vatican_City_-_April_2007.jpg?width=800',
      score: 20
    },
    badEvent: {
      title: '종교 개혁과 신·구교 종파 갈등',
      desc: '면벌부 판매 비판으로 시작된 종교개혁과 전쟁으로 인해 유럽 교계가 분열되어 명성이 일부 감소합니다.',
      img: ART.reformation,
      score: -10
    }
  },
  '사우디아라비아': {
    name: '사우디아라비아',
    type: 'pure',
    preferred: '이슬람교',
    landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Al-Haram_mosque_-_panoramio_(4).jpg?width=800',
    landmarkName: '성지 메카 마스지드 알하람과 카바 신전',
    desc: '예언자 무함마드가 이슬람교를 창시하고 전 세계 무슬림이 향해 기도하는 성지 메카가 위치한 곳입니다.',
    learnPoint: '이슬람교는 사우디아라비아 메카에서 기원하여 서남아시아와 북부 아프리카의 건조 기후대를 따라 확산되었습니다.',
    goodEvent: {
      title: '성지 메카 정기 순례(하즈) 대성황',
      desc: '무슬림의 5대 의무 중 하나인 성지 순례를 위해 전 세계 신도들이 메카에 운집하여 강력한 결속을 다집니다.',
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Al-Haram_mosque_-_panoramio_(4).jpg?width=800',
      score: 20
    },
    badEvent: {
      title: '사막 모래폭풍(시뭄)으로 인한 교역로 고립',
      desc: '거대한 사막 모래폭풍이 불어닥쳐 오아시스 대상(카라반) 무역로가 일시 차단되고 전파단이 고립되었습니다.',
      img: ART.sandStorm,
      score: -10
    }
  },
  '인도': {
    name: '인도',
    type: 'pure',
    preferred: '힌두교',
    landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Varanasi_Ghats_2013.jpg?width=800',
    landmarkName: '바라나시 갠지스강 가트와 힌두 사원',
    desc: '갠지스강을 성스러운 어머니의 강으로 모시며 윤회 사상과 전통 의례가 일상을 지배하는 힌두교의 본고장입니다.',
    learnPoint: '힌두교는 특정 창시자 없이 고대 브라만교와 민간 신앙이 융합된 민족 종교로 인도인의 삶 깊숙이 자리 잡고 있습니다.',
    goodEvent: {
      title: '갠지스강 쿰브 멜라 축제 개최',
      desc: '수천만 명의 힌두교 순례자들이 바라나시 갠지스강에 모여 성스러운 강물에 몸을 씻으며 신앙심을 고취합니다.',
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Varanasi_Ghats_2013.jpg?width=800',
      score: 20
    },
    badEvent: {
      title: '왕조 교체와 타 종교 세력과의 마찰',
      desc: '외세 침입과 왕조 교체 과정에서 일부 전통 사원이 훼손되고 지역 내 종교 갈등이 발생하여 점수가 감소합니다.',
      img: ART.templeWar,
      score: -10
    }
  },
  '태국·동남아': {
    name: '태국·인도차이나',
    type: 'pure',
    preferred: '불교',
    landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Wat_Phra_Kaew_by_Ninara.jpg?width=800',
    landmarkName: '방콕 에메랄드 사원(왓 프라깨우)',
    desc: '개인의 해탈과 수행을 중시하는 상좌부 불교가 남부 아시아를 거쳐 인도차이나반도 전역에 뿌리내린 지역입니다.',
    learnPoint: '불교는 인도에서 기원했으나 기원지에서는 쇠퇴하고 동남아시아(상좌부 불교)와 동아시아(대승 불교)로 전파되었습니다.',
    goodEvent: {
      title: '왕실 사원 건립과 출가 전통 확산',
      desc: '황금 불탑이 세워지고 청년들이 사원에서 단기 출가 수행을 하는 전통이 정착되어 불교 문화가 크게 융성합니다.',
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Wat_Phra_Kaew_by_Ninara.jpg?width=800',
      score: 20
    },
    badEvent: {
      title: '전쟁으로 인한 문화유산 피해',
      desc: '인접 왕국과의 전쟁으로 아유타야 등 고대 사원과 불상이 피해를 입었습니다. 복구에 자원을 사용하여 점수가 감소합니다.',
      img: ART.templeWar,
      score: -10
    }
  },
  '이집트·북아프리카': {
    name: '이집트·북아프리카',
    type: 'pure',
    preferred: '이슬람교',
    landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mosque_of_Muhammad_Ali_Cairo_Egypt.jpg?width=800',
    landmarkName: '카이로 무함마드 알리 대모스크',
    desc: '서남아시아와 인접하여 일찍부터 이슬람교가 전파되었으며 사하라 사막 종단 무역의 거점이 된 지역입니다.',
    learnPoint: '아프리카는 사하라 사막을 경계로 북부는 아랍·이슬람 문화권, 중남부는 크리스트교 및 토착 신앙권으로 나뉩니다.',
    goodEvent: {
      title: '사하라 대상 무역로 개척과 학문 번영',
      desc: '낙타 상단이 사하라 사막을 건너 금과 소금을 교역하며 이슬람 교리와 아랍 문화를 평화롭고 빠르게 확산시킵니다.',
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mosque_of_Muhammad_Ali_Cairo_Egypt.jpg?width=800',
      score: 20
    },
    badEvent: {
      title: '사하라 사막 모래폭풍 조우',
      desc: '내륙 무역로를 개척하던 상단이 거대한 사막 폭풍을 만나 경로를 이탈하고 물자 손실을 입었습니다.',
      img: ART.sandStorm,
      score: -10
    }
  },
  '미국·캐나다': {
    name: '미국·캐나다',
    type: 'pure',
    preferred: '크리스트교',
    landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/St._Patrick%27s_Cathedral,_New_York_City.jpg?width=800',
    landmarkName: '뉴욕 세인트 패트릭 대성당',
    desc: '영국과 북유럽 등지에서 신앙의 자유를 찾아 이주한 개신교도들과 유럽 이민자들에 의해 형성된 문화권입니다.',
    learnPoint: '앵글로아메리카(미국·캐나다)는 북서부 유럽 이주민의 영향으로 개신교의 비율이 높게 나타납니다.',
    goodEvent: {
      title: '신대륙 정착촌 교회 설립과 부흥',
      desc: '대서양을 건넌 이주민들이 개척지 중심마다 교회와 학교를 세우며 탄탄한 신앙 공동체를 구축합니다.',
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/St._Patrick%27s_Cathedral,_New_York_City.jpg?width=800',
      score: 20
    },
    badEvent: {
      title: '대서양 횡단 선교선 폭풍우 조난',
      desc: '대서양을 건너던 범선이 거대한 해상 폭풍우를 만나 선체가 파손되어 초기 정착 지원이 지연되었습니다.',
      img: ART.stormShip,
      score: -10
    }
  },
  '브라질·남미': {
    name: '브라질·남미',
    type: 'pure',
    preferred: '크리스트교',
    landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cristo_Redentor_-_Rio_de_Janeiro,_Brasil.jpg?width=800',
    landmarkName: '리우데자네이루 구속주 예수상',
    desc: '대항해시대 이후 스페인과 포르투갈의 식민 지배 및 적극적인 가톨릭 선교로 대륙 대부분이 가톨릭을 믿는 지역입니다.',
    learnPoint: '라틴아메리카는 남부 유럽(스페인·포르투갈)의 식민 지배 영향으로 가톨릭교의 비율이 압도적으로 높습니다.',
    goodEvent: {
      title: '구속주 예수상 건립과 가톨릭 축일 성황',
      desc: '코르코바두 산 정상에 거대한 예수상이 세워지고 원주민 문화와 융합된 가톨릭 축제가 대륙 전체를 하나로 묶습니다.',
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cristo_Redentor_-_Rio_de_Janeiro,_Brasil.jpg?width=800',
      score: 20
    },
    badEvent: {
      title: '원정 항해 중 폭풍우와 험준한 지형 난관',
      desc: '항해 중 폭풍우를 만나고 아마존 밀림과 안데스 산맥의 험난한 지형에 막혀 내륙 선교단이 자원을 소모했습니다.',
      img: ART.stormShip,
      score: -10
    }
  },
  '호주·오세아니아': {
    name: '호주·오세아니아',
    type: 'pure',
    preferred: '크리스트교',
    landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/St_Marys_Cathedral_Sydney_cropped.jpg?width=800',
    landmarkName: '시드니 세인트 메리 대성당',
    desc: '영국을 비롯한 유럽인들의 이주와 개척 역사와 함께 크리스트교가 전역에 전파된 대륙입니다.',
    learnPoint: '오세아니아는 유럽의 식민 지배와 이주 역사를 통해 크리스트교가 주류 종교로 자리 잡았습니다.',
    goodEvent: {
      title: '해안 대도시 대성당 완공',
      desc: '시드니와 멜버른 등 주요 항구 도시에 고딕 양식의 대성당이 완공되어 안정적인 교세를 확보합니다.',
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/St_Marys_Cathedral_Sydney_cropped.jpg?width=800',
      score: 20
    },
    badEvent: {
      title: '남태평양 산호초 해역 선박 좌초',
      desc: '장거리 항해 중 거센 파도와 산호초 암초에 부딪혀 선박 수리에 많은 자원과 점수를 소모했습니다.',
      img: ART.stormShip,
      score: -10
    }
  },

  // =========================================================================
  // 4대 다종교 종합 국가 (한국, 인도네시아, 싱가포르, 나이지리아)
  // =========================================================================
  '한국': {
    name: '한국',
    type: 'hybrid',
    desc: '고대~고려의 불교 전통과 근현대에 유입된 크리스트교(개신교·천주교)가 서로 공존하며 다종교 평화를 이룬 국가입니다.',
    learnPoint: '한국은 불교와 크리스트교 신자 비중이 고르게 나타나며 다양한 종교 문화유산이 공존하는 대표적인 다종교 사회입니다.',
    byReligion: {
      '불교': {
        landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bulguksa_Temple_in_Gyeongju_01.jpg?width=800',
        landmarkName: '경주 불국사와 다보탑·석가탑',
        good: {
          title: '삼국·고려시대 호국불교 융성과 불국사 창건',
          desc: '국가 차원에서 불교를 공인하고 불국사 건립과 팔만대장경 판각 등 찬란한 불교 문화유산을 꽃피웠습니다.',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bulguksa_Temple_in_Gyeongju_01.jpg?width=800',
          score: 20
        },
        bad: {
          title: '조선시대 성리학 수용과 숭유억불 정책',
          desc: '조선 건국 후 성리학(유교)을 통치 이념으로 삼으면서 도성 내 사찰을 폐쇄하고 승려를 억압하여 교세가 감소합니다.',
          img: ART.joseonConfucian,
          score: -10
        }
      },
      '크리스트교': {
        landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Myeongdong_Cathedral_2019.jpg?width=800',
        landmarkName: '서울 명동성당',
        good: {
          title: '근대 학교·병원 설립과 명동성당 완공',
          desc: '개화기 선교사들의 의료·교육 봉사와 명동성당 건립을 통해 한국 사회에 크리스트교가 빠르게 확산됩니다.',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Myeongdong_Cathedral_2019.jpg?width=800',
          score: 20
        },
        bad: {
          title: '조선 후기 천주교 박해(신유·병인박해)',
          desc: '전통 제사 의식과의 갈등으로 조정에서 대규모 천주교 박해를 단행하여 수많은 순교자가 발생했습니다.',
          img: ART.koreaMartyr,
          score: -10
        }
      },
      '이슬람교': {
        landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Seoul_Central_Mosque_2014.jpg?width=800',
        landmarkName: '서울 한남동 중앙성원',
        good: {
          title: '고려 벽란도 교역과 현대 K-할랄 문화 교류',
          desc: '고려시대 아랍 상인(대식국)과의 교류 역사에 이어 현대 서울 중앙성원과 할랄 식문화가 대중의 관심을 얻습니다.',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Seoul_Central_Mosque_2014.jpg?width=800',
          score: 15
        },
        bad: {
          title: '조선 초기 회회교(이슬람) 의례 금지령',
          desc: '조선 세종 시기 외래 풍습 정리 정책으로 고유 의복과 의례가 금지되면서 초기 공동체가 맥이 끊겼습니다.',
          img: ART.joseonConfucian,
          score: -10
        }
      },
      '힌두교': {
        landmarkImg: ART.festivalLight,
        landmarkName: '서울 인도 문화 축전 및 사원',
        good: {
          title: '가야 허황옥 설화와 현대 인도 요가·문화 열풍',
          desc: '고대 가야와 인도 아유타국의 교류 설화 및 현대 한국인들의 요가·명상 열풍이 결합되어 문화적 호응을 얻습니다.',
          img: ART.festivalLight,
          score: 15
        },
        bad: {
          title: '기후 및 식문화 차이로 인한 정착 지연',
          desc: '인도와 다른 한반도의 추운 겨울 기후와 육식 위주의 식문화 차이로 인해 신도 확장에 어려움을 겪었습니다.',
          img: ART.joseonConfucian,
          score: -10
        }
      }
    }
  },

  '인도네시아·말레이': {
    name: '인도네시아·말레이',
    type: 'hybrid',
    desc: '해상 교통의 요충지로 고대 불교·힌두교 유적 위에 이슬람 상인들의 무역 전파가 더해져 다층적인 종교 경관이 나타납니다.',
    learnPoint: '인도네시아는 이슬람교 상인들의 해상 무역으로 세계 최대 무슬림 국가가 되었으나, 발리(힌두교)·보로부두르(불교) 유적도 공존합니다.',
    byReligion: {
      '이슬람교': {
        landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Masjid_Istiqlal_Jakarta.jpg?width=800',
        landmarkName: '자카르타 이스티클랄 대모스크',
        good: {
          title: '인도양 향신료 해상 무역을 통한 평화적 확산',
          desc: '무슬림 상인들이 향신료 무역을 통해 현지 왕실과 상인들에게 자연스럽게 교리를 전파하여 동남아 최대 모스크가 세워집니다.',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Masjid_Istiqlal_Jakarta.jpg?width=800',
          score: 20
        },
        bad: {
          title: '유럽 제국주의 함대의 향신료 무역항 통제',
          desc: '대항해시대 포르투갈과 네덜란드 동인도회사 함대가 말라카 해협을 무력 장악하여 이슬람 해상 상권이 위축되었습니다.',
          img: ART.dutchShip,
          score: -10
        }
      },
      '불교': {
        landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Borobudur-Nothwest-view.jpg?width=800',
        landmarkName: '자바섬 보로부두르 대불탑',
        good: {
          title: '세계 최대 불교 유적 보로부두르 대불탑 건립',
          desc: '고대 해상 왕국 시기 건립된 거대한 석조 불탑 보로부두르가 세계문화유산으로 빛나며 수많은 순례자를 끌어모읍니다.',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Borobudur-Nothwest-view.jpg?width=800',
          score: 20
        },
        bad: {
          title: '화산 폭발로 인한 사원 매몰 피해',
          desc: '대형 화산 폭발과 왕조 교체로 인해 보로부두르 사원이 수백 년간 화산재와 밀림 속에 묻히는 시련을 겪었습니다.',
          img: ART.volcano,
          score: -10
        }
      },
      '힌두교': {
        landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pura_Ulun_Danu_Bratan,_2017.jpg?width=800',
        landmarkName: '발리 울룬 다누 브라탄 힌두 사원',
        good: {
          title: '신들의 섬 발리 힌두 왕조 문화의 번영',
          desc: '발리섬에 정착한 힌두 왕족과 예술가들이 호수 사원과 전통 춤 등 세계적으로 독창적인 힌두 문화를 꽃피웠습니다.',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pura_Ulun_Danu_Bratan,_2017.jpg?width=800',
          score: 20
        },
        bad: {
          title: '마자파힛 힌두 왕조의 쇠퇴와 교세 축소',
          desc: '해상 무역로를 장악한 신흥 이슬람 술탄국들이 성장하면서 자바섬 본토의 힌두 왕조가 쇠퇴하고 발리섬으로 축소되었습니다.',
          img: ART.templeWar,
          score: -10
        }
      },
      '크리스트교': {
        landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jakarta_Cathedral_2018.jpg?width=800',
        landmarkName: '자카르타 대성당',
        good: {
          title: '대성당과 대모스크의 우정의 터널 연결',
          desc: '자카르타 대성당과 이스티클랄 모스크가 서로 마주 보며 종교 간 관용과 평화 공존의 상징으로 자리 잡습니다.',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jakarta_Cathedral_2018.jpg?width=800',
          score: 20
        },
        bad: {
          title: '식민 시기 토착 왕국들의 반발과 저항',
          desc: '서구 열강의 식민 지배에 저항하던 아체 술탄국 등 현지 세력과의 무력 충돌로 선교 활동이 제약을 받았습니다.',
          img: ART.dutchShip,
          score: -10
        }
      }
    }
  },

  '싱가포르': {
    name: '싱가포르',
    type: 'hybrid',
    desc: '세계적인 해상·항공 교통의 중심지로 중국계, 말레이계, 인도계, 유럽계 주민들이 모여 모든 종교가 공존하는 도시국가입니다.',
    learnPoint: '국제 교역의 중심지인 싱가포르는 다양한 민족이 이주하면서 불교, 이슬람교, 크리스트교, 힌두교가 한 도시에 조화롭게 분포합니다.',
    byReligion: {
      '불교': {
        landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Buddha_Tooth_Relic_Temple_Singapore_2012.jpg?width=800',
        landmarkName: '싱가포르 차이나타운 불아사',
        good: {
          title: '국제 환승 허브 관광객 유입과 불아사 명소화',
          desc: '세계적인 교통 허브 싱가포르를 찾은 수많은 관광객들이 차이나타운 불아사를 방문하며 국제적 명성이 높아집니다.',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Buddha_Tooth_Relic_Temple_Singapore_2012.jpg?width=800',
          score: 20
        },
        bad: {
          title: '엄격한 종교화합유지법(MRHA) 규제 발동',
          desc: '다민족 국가의 안정을 위해 제정된 종교화합유지법에 따라 공공장소에서의 과열 포교 활동이 제한되었습니다.',
          img: ART.singaporeCity,
          score: -10
        }
      },
      '이슬람교': {
        landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sultan_Mosque_Singapore.jpg?width=800',
        landmarkName: '캄퐁글람 술탄 모스크',
        good: {
          title: '아랍 스트리트와 술탄 모스크 문화 특구 번영',
          desc: '황금 돔이 빛나는 술탄 모스크와 주변 무역 거리가 다문화 명소로 지정되어 전 세계 무슬림 교류의 장이 됩니다.',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sultan_Mosque_Singapore.jpg?width=800',
          score: 20
        },
        bad: {
          title: '도심 재개발과 고밀도 도시 규제',
          desc: '좁은 국토 면적과 높은 부동산 비용, 소음 규제 등으로 인해 추가적인 사원 확장에 자원이 많이 소모되었습니다.',
          img: ART.singaporeCity,
          score: -10
        }
      },
      '힌두교': {
        landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sri_Mariamman_Temple_Singapore_2.jpg?width=800',
        landmarkName: '스리 마리암만 힌두 사원',
        good: {
          title: '리틀인디아 디파발리 빛 축제 대성황',
          desc: '인도계 이주민들이 세운 스리 마리암만 사원과 리틀인디아 거리의 축제가 국가 공휴일로 지정되어 함께 축하받습니다.',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sri_Mariamman_Temple_Singapore_2.jpg?width=800',
          score: 20
        },
        bad: {
          title: '세계 최고 수준의 도심 부지 임대료 부담',
          desc: '글로벌 금융 허브 싱가포르의 살인적인 토지 비용으로 인해 신규 문화 센터 건립 예산이 초과되었습니다.',
          img: ART.singaporeCity,
          score: -10
        }
      },
      '크리스트교': {
        landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/St_Andrews_Cathedral_Singapore.jpg?width=800',
        landmarkName: '싱가포르 세인트 앤드류 대성당',
        good: {
          title: '글로벌 교육·금융 네트워크와 대성당 번영',
          desc: '순백의 세인트 앤드류 대성당과 국제학교 네트워크를 통해 젊은 고학력 시민층 사이에서 교세가 크게 확장됩니다.',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/St_Andrews_Cathedral_Singapore.jpg?width=800',
          score: 20
        },
        bad: {
          title: '엄격한 종교화합유지법(MRHA) 규제 발동',
          desc: '타 종교 신자들에게 공격적인 전도를 시도하다가 싱가포르 정부의 강력한 법적 경고를 받아 점수가 감소합니다.',
          img: ART.singaporeCity,
          score: -10
        }
      }
    }
  },

  '나이지리아·중부아프리카': {
    name: '나이지리아·중부아프리카',
    type: 'hybrid',
    desc: '사하라 사막 무역로로 전파된 북부의 이슬람교와 대서양 해안을 통해 전파된 남부의 크리스트교가 만나는 교차 지역입니다.',
    learnPoint: '아프리카 중부(나이지리아 등)는 북부 이슬람교와 남부 크리스트교의 세력이 팽팽하게 만나는 종교적 점이지대입니다.',
    byReligion: {
      '이슬람교': {
        landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Abuja_National_Mosque.jpg?width=800',
        landmarkName: '나이지리아 아부자 국립 모스크',
        good: {
          title: '사하라 종단 교역과 아부자 국립 모스크 완공',
          desc: '북부 하우사·풀라니족의 오랜 이슬람 전통과 수도 아부자 국립 모스크를 중심으로 서아프리카 최대 교세를 형성합니다.',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Abuja_National_Mosque.jpg?width=800',
          score: 20
        },
        bad: {
          title: '북부·남부 종교 경계 지역의 사회적 갈등',
          desc: '북부 이슬람권과 남부 크리스트교권이 맞닿는 중부 지역에서 관습법 적용을 둘러싼 갈등으로 자원이 소모됩니다.',
          img: ART.sandStorm,
          score: -10
        }
      },
      '크리스트교': {
        landmarkImg: 'https://commons.wikimedia.org/wiki/Special:FilePath/National_Church_of_Nigeria_Abuja.jpg?width=800',
        landmarkName: '나이지리아 아부자 국립 기독교 센터',
        good: {
          title: '대서양 해안 선교와 아프리카 가스펠 대부흥',
          desc: '남부 해안 도시들과 수도 아부자 국립 기독교 센터를 중심으로 토착 음악과 결합한 열정적인 예배가 확산됩니다.',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/National_Church_of_Nigeria_Abuja.jpg?width=800',
          score: 20
        },
        bad: {
          title: '열대 풍토병(말라리아)과 내륙 진출 난관',
          desc: '열대 우림의 풍토병과 북부 이슬람 세력과의 경계선 마찰로 인해 북부 내륙으로의 전파가 저지되었습니다.',
          img: ART.stormShip,
          score: -10
        }
      },
      '불교': {
        landmarkImg: ART.festivalLight,
        landmarkName: '아프리카 국제 평화 명상 센터',
        good: {
          title: '종파 갈등 지역에서의 평화 명상 운동 호응',
          desc: '종교 갈등에 지친 현지 청년들과 지식인들이 불교의 비폭력·평화 사상에 공감하며 문화 교류가 이루어집니다.',
          img: ART.festivalLight,
          score: 15
        },
        bad: {
          title: '양대 종교 구도 속 낮은 인지도 장벽',
          desc: '이미 크리스트교와 이슬람교가 인구의 대부분을 차지하고 있어 동양 종교의 교리를 전파하는 데 어려움을 겪습니다.',
          img: ART.stormShip,
          score: -10
        }
      },
      '힌두교': {
        landmarkImg: ART.silkRoad,
        landmarkName: '라고스 인도 무역상 커뮤니티 사원',
        good: {
          title: '인도계 해상 무역상 진출과 볼리우드 문화 인기',
          desc: '아프리카에 진출한 인도 상인 공동체와 현지에서 인기 높은 인도 영화 문화를 통해 힌두 축제가 알려집니다.',
          img: ART.silkRoad,
          score: 15
        },
        bad: {
          title: '장거리 해상 보급선 폭풍우 피해',
          desc: '인도양과 대서양을 돌아오던 교역선이 폭풍우를 만나 사원 건립 자재 보급에 차질이 생겼습니다.',
          img: ART.stormShip,
          score: -10
        }
      }
    }
  }
};

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
  '싱가포르': null,
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

    const relSymbol = RELIGIONS.find(r => r.name === activeReligion).symbol;
    let isMatched = false;
    let isHybrid = (region.type === 'hybrid');
    let baseScore = 15;
    let methodBonus = (method === '장거리') ? 15 : 10;

    // 1단계 카드(전파 기본 결과)와 2단계 카드(특수 이벤트) 분리 구성
    let step1Card = null;
    let step2Event = null;

    if (isHybrid) {
      isMatched = true;
      baseScore = 30;
      const relData = region.byReligion[activeReligion];
      step1Card = {
        badgeText: '🤝 다종교 공존·종합 권역 (+30점)',
        badgeColor: '#38bdf8',
        img: relData.landmarkImg,
        landmarkName: relData.landmarkName,
        title: `${activeReligion} ➔ ${region.name} 전파`,
        desc: region.desc,
        baseGain: baseScore + methodBonus
      };
      // 50:50 확률로 호재 / 악재 특수 이벤트 발생
      const ev = (Math.random() < 0.5) ? relData.good : relData.bad;
      step2Event = {
        tag: `${relSymbol} ${region.name} · ${activeReligion}`,
        title: ev.title,
        desc: ev.desc,
        img: ev.img,
        score: ev.score,
        learnPoint: region.learnPoint
      };
    } else if (region.preferred === activeReligion) {
      // 역사적 주류 분포 일치
      isMatched = true;
      baseScore = 35;
      step1Card = {
        badgeText: '🌟 역사적 주류 분포 일치 (+35점)',
        badgeColor: '#10b981',
        img: region.landmarkImg,
        landmarkName: region.landmarkName,
        title: `${activeReligion} ➔ ${region.name} 전파 성공`,
        desc: region.desc,
        baseGain: baseScore + methodBonus
      };
      // 50% 확률로 긍정 이벤트, 50% 확률로 역사적 시련 이벤트
      const ev = (Math.random() < 0.5) ? region.goodEvent : region.badEvent;
      step2Event = {
        tag: `${relSymbol} ${region.name} · ${activeReligion}`,
        title: ev.title,
        desc: ev.desc,
        img: ev.img,
        score: ev.score,
        learnPoint: region.learnPoint
      };
    } else {
      // 비주류 지역 전파
      isMatched = false;
      baseScore = 15;
      step1Card = {
        badgeText: `⚠️ 비주류 권역 도전 (실제 주류: ${region.preferred})`,
        badgeColor: '#f59e0b',
        img: region.landmarkImg,
        landmarkName: `${region.name}의 기존 주류 랜드마크: ${region.landmarkName}`,
        title: `${activeReligion} ➔ ${region.name} 개척 시도`,
        desc: `이 지역은 역사적으로 [${region.preferred}]의 영향력이 강한 곳입니다. (${region.desc})`,
        baseGain: baseScore + methodBonus
      };

      if (Math.random() < 0.5) {
        step2Event = {
          tag: `${relSymbol} ${region.name} · ${activeReligion}`,
          title: '세계화와 국제 문화 교류 축제 흥행',
          desc: `비주류 권역이지만 현대 세계화의 흐름 속에 열린 '${activeReligion} 문화 체험 축제'가 현지인들의 호기심과 호응을 얻었습니다!`,
          img: ART.festivalLight,
          score: 15,
          learnPoint: region.learnPoint
        };
      } else {
        step2Event = {
          tag: `${relSymbol} ${region.name} · ${activeReligion}`,
          title: '원정 항해 폭풍우 조난 및 기존 교세의 장벽',
          desc: '먼바다를 건너던 전파선이 거센 폭풍우를 만나고, 현지의 기존 주류 종교 문화 장벽에 부딪혀 이번 라운드 점수가 감소합니다.',
          img: ART.stormShip,
          score: -10,
          learnPoint: region.learnPoint
        };
      }
    }

    const totalGain = Math.max(0, step1Card.baseGain + step2Event.score);
    rState.score += totalGain;

    const prevOwner = mapOwnership[regionKey];
    if (prevOwner && prevOwner !== activeReligion) {
      religionStates[prevOwner].regions = religionStates[prevOwner].regions.filter(r => r !== regionKey);
    }
    mapOwnership[regionKey] = activeReligion;
    if (!rState.regions.includes(regionKey)) {
      rState.regions.push(regionKey);
    }

    io.emit('turnResultTwoStep', {
      actorReligion: activeReligion,
      regionKey,
      method,
      methodBonus,
      step1Card,
      step2Event,
      totalGain,
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
        '한국': null, '인도네시아·말레이': null, '싱가포르': null, '나이지리아·중부아프리카': null
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
