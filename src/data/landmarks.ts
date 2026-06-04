/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Curated Landmarks for the Google Earth "Voyager" Feature
 */

export interface LandmarkData {
  id: string;
  name: string;
  chineseName: string;
  country: string;
  category: 'wonders' | 'nature' | 'heritage' | 'modern';
  lat: number;
  lng: number;
  altitude: number;
  image: string;
  description: string;
  trivia: string[];
  wikilink: string;
}

export const LANDMARKS: LandmarkData[] = [
  {
    id: 'eiffel',
    name: 'Eiffel Tower',
    chineseName: '巴黎艾菲爾鐵塔',
    country: '法國',
    category: 'modern',
    lat: 48.8584,
    lng: 2.2945,
    altitude: 0.18,
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=800',
    description: '坐落於塞納河畔戰神廣場的鐵製鏤空塔，建於1889年，是巴黎的地標性建築與世界著名文化象徵。',
    trivia: [
      '為了慶祝法國大革命100週年和1889年巴黎世界博覽會而建造。',
      '最初被許多巴黎藝術家和知識分子批評，被認為是「無用的鋼鐵怪物」。',
      '氣溫上升時，鐵塔會因為熱脹冷縮物理效應「長高」多達 15 公分。'
    ],
    wikilink: 'https://zh.wikipedia.org/wiki/埃菲尔铁塔'
  },
  {
    id: 'pyramids',
    name: 'Great Pyramid of Giza',
    chineseName: '吉薩大金字塔',
    country: '埃及',
    category: 'heritage',
    lat: 29.9792,
    lng: 31.1342,
    altitude: 0.22,
    image: 'https://images.unsplash.com/photo-1503177119275-0aa32b31d468?auto=format&fit=crop&q=80&w=800',
    description: '古代世界七大奇蹟中唯一現存的建構物，大約建造於公元前2560年，是胡夫法老的陵墓。',
    trivia: [
      '由大約 230 萬塊巨型石塊建成，平均每塊重達 2.5 噸。',
      '在建成後的 3800 多年時間內，一直是世界上最高的人造建築物。',
      '建造時對齊極為精準，其四個邊幾乎完美對正地球的「真北」方向。'
    ],
    wikilink: 'https://zh.wikipedia.org/wiki/吉萨大金字塔'
  },
  {
    id: 'taj_mahal',
    name: 'Taj Mahal',
    chineseName: '泰姬瑪哈陵',
    country: '印度',
    category: 'wonders',
    lat: 27.1751,
    lng: 78.0421,
    altitude: 0.20,
    image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=800',
    description: '莫臥兒帝國皇帝沙賈漢為了紀念他已故的摯愛愛妃慕塔芝·瑪哈，以純白大理石建造的巨大陵墓建築群。',
    trivia: [
      '融合了波斯、伊斯蘭和印度建築風格，被譽為「完美大理石工藝的極致結晶」。',
      '在不同時刻，陵墓會呈現不同的光影顏色：清晨微粉紅、黃昏金黃、月光下熠熠閃白。',
      '召集了世界各地的 2 萬多名工匠以及 1000 多頭大象協助運輸石材建料。'
    ],
    wikilink: 'https://zh.wikipedia.org/wiki/泰姬陵'
  },
  {
    id: 'great_wall',
    name: 'Great Wall of China',
    chineseName: '萬里長城',
    country: '中國',
    category: 'heritage',
    lat: 40.4319,
    lng: 116.5704,
    altitude: 0.35,
    image: 'https://images.unsplash.com/photo-1549880180-25056a7f917b?auto=format&fit=crop&q=80&w=800',
    description: '古代中國為抵禦北方游牧部落入侵而修築的巨大防禦工程，橫跨多個朝代，總長度超過 2 萬公里。',
    trivia: [
      '「太空能用肉眼看見長城」是個著名的謠言，實際上在地球低軌道也需要極佳天氣和照相設備。',
      '城牆石磚鋪設的部分區域使用了含有熟石灰與糯米漿的砂漿，出奇地牢固。',
      '它並不是一條連續不停的單壁城牆，而是一個由城牆、壕溝、關隘與烽火台組成的防禦體系。'
    ],
    wikilink: 'https://zh.wikipedia.org/wiki/万里长城'
  },
  {
    id: 'grand_canyon',
    name: 'Grand Canyon',
    chineseName: '大峽谷國家公園',
    country: '美國',
    category: 'nature',
    lat: 36.0544,
    lng: -112.1401,
    altitude: 0.38,
    image: 'https://images.unsplash.com/photo-1615551043360-33de8b5f410c?auto=format&fit=crop&q=80&w=800',
    description: '位於亞利桑那州，科羅拉多河經過數百萬年沖刷切割出的壯麗峽谷，展現了幾十億年的地質分層史。',
    trivia: [
      '峽谷長約 446 公里，最寬處達 29 公里，深度超過 1600 公尺。',
      '切割暴露出的最底部基底岩石，年齡估計直逼 20 億年，相當於地球壽命的一半。',
      '由於巨大的海拔落差，大峽谷內橫跨了 5 個完全不同的生物氣候帶。'
    ],
    wikilink: 'https://zh.wikipedia.org/wiki/大峡谷国家公园'
  },
  {
    id: 'machu_picchu',
    name: 'Machu Picchu',
    chineseName: '印加秘境馬丘比丘',
    country: '秘魯',
    category: 'wonders',
    lat: -13.1631,
    lng: -72.5450,
    altitude: 0.28,
    image: 'https://images.unsplash.com/photo-1587595431973-160d0d94adb1?auto=format&fit=crop&q=80&w=800',
    description: '高耸在山脊上的印加帝國廢墟，建於15世紀，遺世獨立在安地斯山脈中，直到1911年才被重新發現。',
    trivia: [
      '被稱為「印加帝國的失落之城」，在印加帝國被西班牙征服時並未被殖民者發現。',
      '所有的石牆均採用乾砌法：精確切割石塊而不使用任何黏著砂漿，甚至連一張紙都塞不進去學名稱「疊砌」。',
      '大約 60% 的結構其實隱藏在地下，主要作為梯田排水與穩固山體滑坡的基建支撐。'
    ],
    wikilink: 'https://zh.wikipedia.org/wiki/马丘比丘'
  },
  {
    id: 'mount_fuji',
    name: 'Mount Fuji',
    chineseName: '聖山富士山',
    country: '日本',
    category: 'nature',
    lat: 35.3606,
    lng: 138.7274,
    altitude: 0.25,
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800',
    description: '海拔3776公尺，是日本最高峰，一座擁有完美對稱圓錐形山體的活火山，被視為日本的神聖象徵與藝術靈感。',
    trivia: [
      '實際上由三座不同時代地質噴發火山重疊組成：小御岳、古富士、以及現在的新富士。',
      '山頂在法律上是不屬於任何政府或個人的，而是歸屬於「富士山本宮淺間大社」擁有的私人土地。',
      '富士山上設有全日本最高的郵局，在每年的夏日登山季節對全球登山者營運。'
    ],
    wikilink: 'https://zh.wikipedia.org/wiki/富士山'
  },
  {
    id: 'sydney_opera',
    name: 'Sydney Opera House',
    chineseName: '雪梨歌劇院',
    country: '澳洲',
    category: 'modern',
    lat: -33.8568,
    lng: 151.2153,
    altitude: 0.18,
    image: 'https://images.unsplash.com/photo-1523482596112-99d80ebcf1be?auto=format&fit=crop&q=80&w=800',
    description: '雪梨港便利朗角的前衛建築傑作，獨特風姿白帆造型的外殼如貝殼盤踞，是20世紀最著名的世界建築之一。',
    trivia: [
      '由丹麥建築師約恩·烏松（Jørn Utzon）設計，外型發想起源於切開一顆柳丁時剝開的完美弧形辦片。',
      '外殼上的白色與奶油色陶瓷磚有 1,056,006 塊，是特殊的自潔瓷磚，能透過雨水自行沖洗掉塵垢。',
      '原始預算只有 700 萬澳元，最終建造時間延期許久，花费了 1.02 億澳元才全部完工。'
    ],
    wikilink: 'https://zh.wikipedia.org/wiki/悉尼歌剧院'
  }
];
