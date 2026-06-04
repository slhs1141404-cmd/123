/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Users, Globe as GlobeIcon, X, Info, Layers, Navigation, Coins, Compass, Trophy, HelpCircle, RefreshCw, Power, ArrowRight } from 'lucide-react';
import Globe from './components/Globe';
import { useCountryData } from './services/countryService';
import { CountryData } from './types';
import { cn, formatNumber } from './lib/utils';
import { LANDMARKS } from './data/landmarks';

const normalizeChinese = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().replace(/臺/g, '台').trim();
};

export default function App() {
  const { countries, loading, error } = useCountryData();
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<any | null>(null);
  const [isNightMode, setIsNightMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Quiz Game States
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameCountries, setGameCountries] = useState<CountryData[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [recentGameCountryCodes, setRecentGameCountryCodes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recent_game_country_codes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Highlighting feedback states for current question
  const [gameHighlightCca3, setGameHighlightCca3] = useState<string | null>(null);
  const [gameHighlightColor, setGameHighlightColor] = useState<'green' | 'red' | null>(null);
  const [isAnsweringLocked, setIsAnsweringLocked] = useState(false);
  const [gameToast, setGameToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showCorrectOverlay, setShowCorrectOverlay] = useState(false);

  // Google Earth style personalization states
  const [showClouds, setShowClouds] = useState(false);
  const [showAtmosphere, setShowAtmosphere] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showBorders, setShowBorders] = useState(true);
  const [activeTab, setActiveTab] = useState<'search' | 'layers' | 'voyager' | null>('search');

  // Game actions
  const startGame = () => {
    if (!countries || countries.length === 0) return;
    
    // Select highly recognizable & medium-difficulty countries that are easily clickable.
    // Small island nations and microstates (Brunei, Hong Kong, Singapore, Andorra, Bahrain, Vatican, Luxembourg) are completely excluded to guarantee perfect touch/click targets.
    const standardClickableCodes = [
      // Asia & Middle East
      'TWN', // 台灣
      'JPN', // 日本
      'KOR', // 韓國
      'CHN', // 中國
      'IND', // 印度
      'IDN', // 印尼
      'THA', // 泰國
      'VNM', // 越南
      'MYS', // 馬來西亞
      'PHL', // 菲律賓
      'MNG', // 蒙古
      'TUR', // 土耳其
      'SAU', // 沙烏地阿拉伯
      'IRN', // 伊朗
      'PAK', // 巴基斯坦
      'NPL', // 尼泊爾
      'KHM', // 柬埔寨
      'MMR', // 緬甸
      'KAZ', // 哈薩克
      'BGD', // 孟加拉
      'IRQ', // 伊拉克
      'YEM', // 葉門
      'OMN', // 阿曼
      'SYR', // 敘利亞
      'UZB', // 烏茲別克
      'LKA', // 斯里蘭卡
      
      // Europe
      'GBR', // 英國
      'FRA', // 法國
      'DEU', // 德國
      'ITA', // 義大利
      'ESP', // 西班牙
      'UKR', // 烏克蘭
      'POL', // 波蘭
      'SWE', // 瑞典
      'NOR', // 挪威
      'FIN', // 芬蘭
      'GRC', // 希臘
      'NLD', // 荷蘭
      'BEL', // 比利時
      'CHE', // 瑞士
      'AUT', // 奧地利
      'PRT', // 葡萄牙
      'DNK', // 丹麥
      'IRL', // 愛爾蘭
      'ROU', // 羅馬尼亞
      'CZE', // 捷克
      'HUN', // 匈牙利
      'RUS', // 俄羅斯
      'BLR', // 白俄羅斯
      'BGR', // 保加利亞
      'SRB', // 塞爾維亞
      'HRV', // 克羅埃西亞
      'ISL', // 冰島
      
      // Americas
      'USA', // 美國
      'CAN', // 加拿大
      'MEX', // 墨西哥
      'BRA', // 巴西
      'ARG', // 阿根廷
      'COL', // 哥倫比亞
      'PER', // 秘魯
      'CHL', // 智利
      'VEN', // 委內瑞拉
      'BOL', // 玻利維亞
      'CUB', // 古巴
      'ECU', // 厄瓜多
      'PRY', // 巴拉圭
      'URY', // 烏拉圭
      'GTM', // 瓜地馬拉
      'HND', // 宏都拉斯
      'NIC', // 尼加拉瓜
      'PAN', // 巴拿馬
      
      // Oceania
      'AUS', // 澳洲
      'NZL', // 紐西蘭
      'PNG', // 巴布亞紐幾內亞
      
      // Africa
      'EGY', // 埃及
      'ZAF', // 南非
      'KEN', // 肯亞
      'MAR', // 摩洛哥
      'NGA', // 奈及利亞
      'ETH', // 衣索比亞
      'DZA', // 阿爾及利亞
      'TZA', // 坦尚尼亞
      'SDN', // 蘇丹
      'AGO', // 安哥拉
      'MDG', // 馬達加斯加
      'GHA', // 迦納
      'CMR', // 喀麥隆
      'TUN', // 突尼西亞
      'LBY', // 利比亞
      'SSD', // 南蘇丹
      'TCD', // 查德
      'NER', // 尼日
      'MLI', // 馬利
      'MRT', // 茅利塔尼亞
      'SOM', // 索馬利亞
      'COD', // 民主剛果
      'COG', // 剛果共和國
      'ZMB', // 贊比亞
      'ZWE', // 辛巴威
      'BWA', // 波札那
      'NAM', // 納米比亞
      'MOZ', // 莫三比克
      'CIV', // 科特迪瓦
      'SEN', // 塞內加爾
    ];

    const filteredForGame = countries.filter(c => {
      if (!c.commonName || !c.cca3) return false;
      const code = c.cca3.toUpperCase();
      
      // Only keep countries from the standard highly-recognizable easily-clickable whitelist
      if (!standardClickableCodes.includes(code)) {
        return false;
      }
      
      // Ensure it has valid non-zero coordinates
      if (!c.latlng || c.latlng.length !== 2 || (c.latlng[0] === 0 && c.latlng[1] === 0)) {
        return false;
      }
      
      return true;
    });

    // Make sure we select different questions on consecutive matches
    // We prioritize countries not present in state-bound recentGameCountryCodes
    const uppercaseRecent = recentGameCountryCodes.map(code => code.toUpperCase());
    let unused = filteredForGame.filter(c => !uppercaseRecent.includes(c.cca3.toUpperCase()));
    
    // If not enough unused countries remain (threshold 12), purge half of the oldest saved histories to release them back
    if (unused.length < 12) {
      unused = filteredForGame;
    }

    const shuffledUnused = [...unused].sort(() => 0.5 - Math.random());
    let selected = shuffledUnused.slice(0, 10);
    
    // Fallback if somehow short of 10
    if (selected.length < 10) {
      const remainingCount = 10 - selected.length;
      const alreadyChosenCca3s = selected.map(s => s.cca3.toUpperCase());
      const secondaryPool = filteredForGame.filter(c => !alreadyChosenCca3s.includes(c.cca3.toUpperCase()));
      const shuffledSecondary = [...secondaryPool].sort(() => 0.5 - Math.random());
      selected = [...selected, ...shuffledSecondary.slice(0, remainingCount)];
    }
    
    // Add selected ones to the front of history, limiting window size to 35 so we have a wide available rotation pool
    const selectedCodes = selected.map(c => c.cca3.toUpperCase());
    const updatedRecent = [
      ...selectedCodes,
      ...recentGameCountryCodes.filter(code => !selectedCodes.includes(code.toUpperCase()))
    ].slice(0, 35);

    setRecentGameCountryCodes(updatedRecent);
    try {
      localStorage.setItem('recent_game_country_codes', JSON.stringify(updatedRecent));
    } catch {
      // safe fallback
    }

    setSelectedCountry(null);
    setSelectedLandmark(null);
    setSearchTerm('');
    
    setGameCountries(selected);
    setCurrentQuestionIdx(0);
    setScore(0);
    setShowResult(false);
    setGameHighlightCca3(null);
    setGameHighlightColor(null);
    setGameToast(null);
    setShowCorrectOverlay(false);
    setIsAnsweringLocked(false);
    setIsPlaying(true);
  };

  const quitGame = () => {
    setIsPlaying(false);
    setGameCountries([]);
    setCurrentQuestionIdx(0);
    setScore(0);
    setShowResult(false);
    setGameHighlightCca3(null);
    setGameHighlightColor(null);
    setGameToast(null);
    setShowCorrectOverlay(false);
    setIsAnsweringLocked(false);
  };

  const advanceGame = () => {
    setGameHighlightCca3(null);
    setGameHighlightColor(null);
    setGameToast(null);
    setShowCorrectOverlay(false);
    
    if (currentQuestionIdx < 9) {
      setCurrentQuestionIdx(prev => prev + 1);
      setIsAnsweringLocked(false);
    } else {
      setShowResult(true);
      setIsAnsweringLocked(false);
    }
  };

  const handleSkipQuestion = () => {
    const currentTarget = gameCountries[currentQuestionIdx];
    if (!currentTarget || isAnsweringLocked) return;
    
    setIsAnsweringLocked(true);
    setGameHighlightCca3(currentTarget.cca3);
    setGameHighlightColor('green');
    setGameToast({
      message: `💡 答案在這裡！這就是【${currentTarget.commonName}】。請點擊「下一題」按鈕繼續。`,
      type: 'info'
    });
  };

  const handleCountryClick = (country: CountryData) => {
    if (isPlaying) {
      if (isAnsweringLocked || showResult) return;
      
      const currentTarget = gameCountries[currentQuestionIdx];
      if (!currentTarget) return;
      
      setIsAnsweringLocked(true);
      const isCorrect = (country.cca3 || '').toUpperCase() === (currentTarget.cca3 || '').toUpperCase();
      
      if (isCorrect) {
        setScore(prev => prev + 1);
        setGameHighlightCca3(currentTarget.cca3);
        setGameHighlightColor('green');
        setGameToast({
          message: `🎉 答對了！恭喜 +1 分！這就是【${currentTarget.commonName}】。`,
          type: 'success'
        });
        setShowCorrectOverlay(true);
      } else {
        // 點錯了：立即將鏡頭與高亮對焦在正確國家 (currentTarget.cca3) 並顯示綠色，提示正確位置
        setGameHighlightCca3(currentTarget.cca3);
        setGameHighlightColor('green');
        setGameToast({
          message: `❌ 答錯囉！你點到的是【${country.commonName}】。正確的位置其實是這裡【${currentTarget.commonName}】。請點擊下方「下一題」按鈕。`,
          type: 'error'
        });
      }
    } else {
      setSelectedCountry(country);
      setSelectedLandmark(null);
    }
  };

  const handleRandomCountry = () => {
    if (countries && countries.length > 0) {
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
      setSelectedCountry(randomCountry);
      setSelectedLandmark(null);
    }
  };

  // Reset image loading state when selected country changes
  useEffect(() => {
    if (selectedCountry) {
      setIsImageLoading(true);
    }
  }, [selectedCountry?.cca3]);

  const countriesMap: Record<string, string> = {
    'All': '全部',
    'Africa': '非洲',
    'Americas': '美洲',
    'Asia': '亞洲',
    'Europe': '歐洲',
    'Oceania': '大洋洲',
    'Antarctic': '南極洲'
  };

  const subregionsMap: Record<string, string> = {
    'Eastern Asia': '東亞',
    'Western Asia': '西亞',
    'South-Eastern Asia': '東南亞',
    'Southern Asia': '南亞',
    'Central Asia': '中亞',
    'Western Europe': '西歐',
    'Northern Europe': '北歐',
    'Southern Europe': '南歐',
    'Eastern Europe': '東歐',
    'Northern Africa': '北非',
    'Western Africa': '西非',
    'Middle Africa': '中非',
    'Eastern Africa': '東非',
    'Southern Africa': '南非',
    'Northern America': '北美洲',
    'South America': '南美洲',
    'Central America': '中美洲',
    'Caribbean': '加勒比地區',
    'Australia and New Zealand': '紐澳地區',
    'Melanesia': '美拉尼西亞',
    'Micronesia': '密克羅尼西亞',
    'Polynesia': '玻里尼西亞',
    'South-Eastern Europe': '東南歐'
  };

  const languagesMap: Record<string, string> = {
    'English': '英語',
    'Chinese': '中文',
    'Mandarin Chinese': '國語/普通話',
    'Spanish': '西班牙語',
    'French': '法語',
    'Arabic': '阿拉伯語',
    'Portuguese': '葡萄牙語',
    'Russian': '俄語',
    'Japanese': '日語',
    'German': '德語',
    'Hindi': '印地語',
    'Bengali': '孟加拉語',
    'Korean': '韓語',
    'Vietnamese': '越南語',
    'Italian': '義大利語',
    'Turkish': '土耳其語',
    'Thai': '泰語',
    'Dutch': '荷蘭語',
    'Greek': '希臘語',
    'Indonesian': '印尼語',
    'Malay': '馬來語',
    'Polish': '波蘭語',
    'Swedish': '瑞典語',
    'Finnish': '芬蘭語',
    'Norwegian': '挪威語',
    'Danish': '丹麥語',
    'Hebrew': '希伯來語',
    'Hinglish': '印地英語',
    'Fijian': '斐濟語',
    'Urdu': '烏爾都語',
    'Persian': '波斯語',
    'Amharic': '阿姆哈拉語',
    'Somali': '索馬利亞語',
    'Swahili': '斯瓦希里語',
    'Yoruba': '約魯巴語',
    'Zulu': '祖魯語',
    'Tagalog': '塔加洛語',
    'Filipino': '菲律賓語',
    'Lao': '寮語',
    'Khmer': '高棉語',
    'Burmese': '緬甸語',
    'Sinhala': '僧伽羅語',
    'Tamil': '坦米爾語'
  };

  const capitalsMap: Record<string, string> = {
    'Washington, D.C.': '華盛頓特區',
    'London': '倫敦',
    'Paris': '巴黎',
    'Tokyo': '東京',
    'Beijing': '北京',
    'Taipei': '台北',
    'Seoul': '首爾',
    'Bangkok': '曼谷',
    'Singapore': '新加坡',
    'Ottawa': '渥太華',
    'Canberra': '坎培拉',
    'Berlin': '柏林',
    'Rome': '羅馬',
    'Madrid': '馬德里',
    'Moscow': '莫斯科',
    'New Delhi': '新德里',
    'Jakarta': '雅加達',
    'Manila': '馬尼拉',
    'Hanoi': '河內',
    'Kuala Lumpur': '吉隆坡',
    'Vatican City': '梵蒂岡',
    'Pyongyang': '平壤',
    'Athens': '雅典',
    'Cairo': '開羅',
    'Brasília': '巴西利亞',
    'Buenos Aires': '布宜諾斯艾利斯',
    'Mexico City': '墨西哥城',
    'Stockholm': '斯德哥爾摩',
    'Oslo': '奧斯陸',
    'Copenhagen': '哥本哈根',
    'Amsterdam': '阿姆斯特丹',
    'Brussels': '布魯塞爾',
    'Vienna': '維也納',
    'Prague': '布拉格',
    'Jerusalem': '耶路撒冷',
    'Abu Dhabi': '阿布達比',
    'Riyadh': '利雅德',
    'Ankara': '安卡拉',
    'Lisbon': '里斯本',
    'Warsaw': '華沙',
    'Kyiv': '基輔',
    'Bern': '伯恩',
    'Helsinki': '赫爾辛基',
    'Dublin': '都柏林',
    'Budapest': '布達佩斯',
    'Bucharest': '布加勒斯特',
    'Sofia': '索非亞',
    'Belgrade': '貝爾格勒',
    'Zagreb': '札格瑞布',
    'Wellington': '威靈頓',
    'Islamabad': '伊斯蘭馬巴德',
    'Tehran': '德黑蘭',
    'Baghdad': '巴格達',
    'Damascus': '大馬士革',
    'Beirut': '貝魯特',
    'Amman': '安曼',
    'Kuwait City': '科威特城',
    'Doha': '杜哈',
    'Manama': '麥納瑪',
    'Muscat': '馬斯喀特',
    'Sanaa': '沙那',
    'Kabul': '喀布爾',
    'Nairobi': '奈洛比',
    'Addis Ababa': '阿迪斯阿貝巴',
    'Pretoria': '普利托里亞',
    'Cape Town': '開普敦',
    'Johannesburg': '約翰尼斯堡',
    'Lagos': '拉哥斯',
    'Accra': '阿克拉',
    'Casablanca': '卡薩布蘭卡',
    'Marrakesh': '馬拉喀什',
    'Tunis': '突尼斯',
    'Algiers': '阿爾及爾',
    'Triopli': '的黎波里',
    'Khartoum': '喀土穆',
    'Santiago': '聖地牙哥',
    'Lima': '利馬',
    'Bogotá': '波哥大',
    'Quito': '基多',
    'Caracas': '加拉加斯',
    'Montevideo': '蒙特維多',
    'Asunción': '亞松森',
    'La Paz': '拉巴斯',
    'Panama City': '巴拿馬城',
    'San José': '聖荷西',
    'San Salvador': '聖薩爾瓦多',
    'Managua': '馬拿瓜',
    'Tegucigalpa': '德古斯加巴',
    'Guatemala City': '瓜地馬拉市',
    'Havana': '哈瓦那',
    'Kingston': '京斯敦',
    'Nassau': '拿索',
    'Port-au-Prince': '太子港',
    'Santo Domingo': '聖多明哥',
    'San Juan': '聖胡安',
    'Port of Spain': '西班牙港',
    'Castries': '卡斯特里',
    'Saint George\'s': '聖喬治',
    'Kingstown': '金斯敦',
    'Basseterre': '巴斯特爾',
    'St. John\'s': '聖約翰',
    'Roseau': '羅索',
    'Belmopan': '貝爾墨潘'
  };

  const regions = ['All', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];

  const filteredCountries = useMemo(() => {
    const query = normalizeChinese(searchTerm);
    if (!query) return [];
    return countries.filter(c => {
      // Get the translated capital name for the country (e.g., 'Washington, D.C.' matches '華盛頓特區')
      const zhCapital = capitalsMap[c.capital] || '';
      const normCommonName = normalizeChinese(c.commonName || '');
      const normOfficialName = normalizeChinese(c.name || '');
      const normCapital = normalizeChinese(c.capital || '');
      const normZhCapital = normalizeChinese(zhCapital);
      
      const matchesSearch = 
        normCommonName.includes(query) ||
        normOfficialName.includes(query) ||
        (c.cca2 && c.cca2.toLowerCase().includes(query)) ||
        (c.cca3 && c.cca3.toLowerCase().includes(query)) ||
        normCapital.includes(query) ||
        normZhCapital.includes(query) ||
        (c.region && countriesMap[c.region] && normalizeChinese(countriesMap[c.region]).includes(query)) ||
        (c.subregion && subregionsMap[c.subregion] && normalizeChinese(subregionsMap[c.subregion]).includes(query));
      
      return matchesSearch;
    });
  }, [countries, searchTerm]);

  const filteredLandmarks = useMemo(() => {
    const query = normalizeChinese(searchTerm);
    if (!query) return [];
    return LANDMARKS.filter(landmark => {
      const normName = normalizeChinese(landmark.name || '');
      const normChineseName = normalizeChinese(landmark.chineseName || '');
      const normCountry = normalizeChinese(landmark.country || '');
      const normDescription = normalizeChinese(landmark.description || '');
      return (
        normName.includes(query) ||
        normChineseName.includes(query) ||
        normCountry.includes(query) ||
        normDescription.includes(query)
      );
    });
  }, [searchTerm]);

  const handleSearchSelect = (country: CountryData) => {
    setSelectedCountry(country);
    setSelectedLandmark(null);
    setSearchTerm('');
  };

  const handleSearchSelectLandmark = (landmark: any) => {
    setSelectedLandmark(landmark);
    // Auto-select the corresponding country so the panel opens and provides local context,
    // and also allows the camera to smoothly target the landmark on the globe!
    const parentCountry = countries.find(c => {
      const normCountryOfLandmark = normalizeChinese(landmark.country || '');
      const normCommonName = normalizeChinese(c.commonName || '');
      const normName = normalizeChinese(c.name || '');
      return (
        normCommonName.includes(normCountryOfLandmark) ||
        normCountryOfLandmark.includes(normCommonName) ||
        normName.includes(normCountryOfLandmark)
      );
    });
    if (parentCountry) {
      setSelectedCountry(parentCountry);
    }
    setSearchTerm('');
  };

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden font-sans selection:bg-blue-500/30">
      {/* 3D Globe Section - Only render when parent is ready */}
      <div className="absolute inset-0 z-0 bg-neutral-950 font-sans">
        {!loading && countries.length > 0 && (
          <Globe 
            countries={countries}
            onCountryClick={handleCountryClick}
            selectedCountry={selectedCountry}
            searchTerm={searchTerm}
            regionFilter={regionFilter}
            showClouds={showClouds}
            showAtmosphere={showAtmosphere}
            showGrid={showGrid}
            showBorders={showBorders}
            selectedLandmark={selectedLandmark}
            isNightMode={isNightMode}
            setIsNightMode={setIsNightMode}
            isGameActive={isPlaying}
            gameHighlightCca3={gameHighlightCca3}
            gameHighlightColor={gameHighlightColor}
          />
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 p-10 text-center">
            <p>地球系統初始化錯誤: {error}</p>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-white font-sans"
          >
            <div className="relative w-24 h-24 mb-8">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-blue-800 border-l-transparent rounded-full"
              />
              <div className="absolute inset-4 bg-neutral-900 rounded-full flex items-center justify-center">
                <GlobeIcon className="w-8 h-8 text-blue-400 animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-medium tracking-widest text-neutral-400 animate-pulse text-center px-6">
              正在初始化地球數據...<br/>
              <span className="text-[10px] opacity-50 block mt-2">正在建立地理空間鏈接...</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Correct Answer Meme Celebration Overlay */}
      <AnimatePresence>
        {showCorrectOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.85, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: -15, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-neutral-900 border border-neutral-700/80 p-5 rounded-3xl max-w-sm w-full shadow-[0_0_50px_rgba(16,185,129,0.3)] flex flex-col items-center gap-4 text-center"
            >
              {/* Celebration Animation Header */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-emerald-400 font-extrabold text-2xl tracking-widest flex items-center gap-2">
                  🎉 答對了！太神啦
                </span>
                <span className="text-neutral-400 text-xs font-semibold uppercase tracking-widest">
                  +1 POINT CELEBRATION
                </span>
              </div>
              
              {/* Humorous subtext & Continue action */}
              <div className="text-center px-2 w-full flex flex-col gap-3">
                <p className="text-xs text-emerald-400 font-bold tracking-wide italic leading-relaxed">
                  「恭喜答對！繼續保持！」
                </p>
                <button
                  onClick={() => {
                    setShowCorrectOverlay(false);
                    advanceGame();
                    // Auto focus the state to clear toast
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer text-xs tracking-wider border border-emerald-500/30"
                >
                  下一題 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Earth Style Left Floating Search Panel */}
      {!isPlaying && (
        <div className="absolute top-6 left-6 z-20 flex flex-col gap-4 pointer-events-none items-start max-h-[85vh] font-sans">
          <div className="w-80 md:w-96 bg-neutral-900/98 backdrop-blur-2xl border border-neutral-700 rounded-3xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.6)] pointer-events-auto flex flex-col max-h-[80vh]">
            {/* Search View layout */}
            <div className="p-4 flex flex-col gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type="text"
                  placeholder="搜尋城市、國家、區域..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (filteredLandmarks.length > 0) {
                        handleSearchSelectLandmark(filteredLandmarks[0]);
                        (e.target as HTMLInputElement).blur();
                      } else if (filteredCountries.length > 0) {
                        handleSearchSelect(filteredCountries[0]);
                        (e.target as HTMLInputElement).blur();
                      }
                    }
                  }}
                  className="w-full bg-neutral-800/90 border border-neutral-600 text-white pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all placeholder:text-neutral-300 text-sm font-medium shadow-inner"
                />
                
                {/* Search Suggestions List */}
                {searchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden max-h-56 overflow-y-auto z-30 shadow-2xl custom-scrollbar">
                    {filteredLandmarks.length > 0 || filteredCountries.length > 0 ? (
                      <>
                        {/* Landmarks matches */}
                        {filteredLandmarks.map(landmark => (
                          <button 
                            key={landmark.id}
                            onClick={() => handleSearchSelectLandmark(landmark)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 text-left text-neutral-200 hover:text-white transition-colors border-b border-neutral-800 cursor-pointer"
                          >
                            <div className="w-7 h-4.5 bg-neutral-800 rounded border border-neutral-700 flex items-center justify-center flex-shrink-0 text-amber-500">
                              <MapPin className="w-3 h-3" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs truncate font-medium text-amber-400">{landmark.chineseName}</span>
                              <span className="text-[9px] text-neutral-400 truncate">{landmark.name} · {landmark.country}</span>
                            </div>
                            <span className="ml-auto text-[9px] text-amber-400/90 uppercase tracking-widest font-black">地標景點</span>
                          </button>
                        ))}

                        {/* Countries matches */}
                        {filteredCountries.map(c => (
                          <button 
                            key={c.cca3}
                            onClick={() => handleSearchSelect(c)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 text-left text-neutral-200 hover:text-white transition-colors border-b border-neutral-800 cursor-pointer"
                          >
                            <img src={c.flag} className="w-7 h-4.5 object-cover rounded shadow-sm flex-shrink-0" alt="" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs truncate font-semibold text-white">{c.commonName}</span>
                              {c.capital && c.capital !== '無' && (
                                <span className="text-[9px] text-neutral-400 truncate">
                                  首都: {capitalsMap[c.capital] || c.capital}
                                </span>
                              )}
                            </div>
                            <span className="ml-auto text-[9px] text-neutral-400 uppercase tracking-widest font-medium">{countriesMap[c.region] || c.region}</span>
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="px-4 py-6 text-center text-xs text-neutral-400 italic">找不到匹配的結果</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Country Detail Panel - Right Side */}
      <AnimatePresence>
        {selectedCountry && (
          <motion.div 
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 bottom-0 z-30 w-full sm:w-96 bg-neutral-950/95 backdrop-blur-3xl border-l border-neutral-800 shadow-2xl flex flex-col"
          >
            {/* Header with Flag Background */}
            <div className="relative h-48 overflow-hidden">
              <img 
                src={selectedCountry.flag} 
                className="w-full h-full object-cover blur-sm opacity-20 scale-110"
                alt=""
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-950" />
              
              <button 
                onClick={() => setSelectedCountry(null)}
                className="absolute top-6 right-6 z-10 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all backdrop-blur-md border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-6 right-6">
                <div className="flex items-end gap-5">
                  <div className="w-24 h-16 rounded-lg overflow-hidden shadow-2xl border-2 border-white/10 flex-shrink-0">
                    <img src={selectedCountry.flag} className="w-full h-full object-cover" alt="Flag" />
                  </div>
                  <div className="pb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 block">國家檔案館</span>
                    <h2 className="text-2xl font-bold text-white leading-tight">{selectedCountry.commonName}</h2>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-neutral-900/40 p-4 rounded-2xl border border-neutral-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-500">
                        <Users className="w-5 h-5 text-blue-400" />
                        <span className="text-xs font-black uppercase tracking-widest">2026年 總人口數量</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-3xl font-black text-white tracking-tighter flex items-baseline gap-1">
                          {selectedCountry.population !== undefined && selectedCountry.population !== null ? formatNumber(selectedCountry.population) : '無資料'}
                          <span className="text-[10px] text-blue-500 font-bold">人</span>
                        </div>
                        <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.15em] flex items-center gap-1">
                          <span className="w-1 to-1.5 h-1 to-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" style={{ width: '4px', height: '4px' }}></span>
                          2026年 最新預測數據
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-900/40 p-4 rounded-2xl border border-neutral-800/50">
                      <div className="flex items-center gap-2 mb-2 text-neutral-500">
                        <Navigation className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">國家首都</span>
                      </div>
                      <div className="text-md font-bold text-white truncate">{capitalsMap[selectedCountry.capital] || selectedCountry.capital}</div>
                    </div>

                    <div className="bg-neutral-900/40 p-4 rounded-2xl border border-neutral-800/50">
                      <div className="flex items-center gap-2 mb-2 text-neutral-500">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">法定貨幣</span>
                      </div>
                      <div className="text-md font-bold text-white truncate">{selectedCountry.currencyName || selectedCountry.currency}</div>
                    </div>
                  </div>
                </div>

                {/* Regional Info */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-neutral-900/20 rounded-xl border border-neutral-800/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-neutral-800 rounded-lg">
                        <MapPin className="w-4 h-4 text-neutral-400" />
                      </div>
                      <div>
                        <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">所屬大洲</div>
                        <div className="text-sm font-semibold text-neutral-200">{countriesMap[selectedCountry.region] || selectedCountry.region}</div>
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">次分區</div>
                       <div className="text-sm font-semibold text-neutral-400">{subregionsMap[selectedCountry.subregion] || selectedCountry.subregion}</div>
                    </div>
                  </div>



                  <div>
                    <h3 className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                       <div className="w-1 h-1 bg-blue-500 rounded-full" />
                       語言基礎
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCountry.languages.length > 0 ? selectedCountry.languages.map(lang => (
                        <span key={lang} className="px-3 py-1.5 bg-neutral-900/80 rounded-full text-xs text-neutral-300 border border-neutral-800 hover:border-blue-500/30 transition-colors cursor-default">
                          {languagesMap[lang] || lang}
                        </span>
                      )) : <span className="text-neutral-600 text-xs italic">無可用數據</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 mt-auto border-t border-neutral-900 bg-black/40 backdrop-blur-md">
              <button 
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/10 active:scale-[0.98] flex items-center justify-center gap-2 group cursor-pointer"
                onClick={() => window.open(`https://zh.wikipedia.org/wiki/${selectedCountry.commonName}`, '_blank')}
              >
                <span>維基百科情報庫</span>
                <Info className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 「國家位置猜謎遊戲」按鍵與模式 HUD */}
      {!isPlaying ? (
        <div className="absolute bottom-6 right-6 z-20 pointer-events-auto">
          <button
            onClick={startGame}
            className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center gap-2.5 cursor-pointer group border border-blue-500/20"
          >
            <Trophy className="w-5 h-5 text-amber-300 animate-pulse group-hover:scale-110 transition-transform" />
            <span className="tracking-wider">開始遊戲</span>
          </button>
        </div>
      ) : (
        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-4 pointer-events-auto items-end max-w-sm w-full font-sans">
          <div className="w-80 sm:w-96 bg-neutral-900/95 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
            {!showResult ? (
              <>
                <div className="flex items-center justify-between border-b border-neutral-800/60 pb-3">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-neutral-300">位置猜謎遊戲 中</span>
                  </div>
                  <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full text-[11px] text-blue-400 font-bold">
                    題數 {currentQuestionIdx + 1} / 10
                  </div>
                </div>

                <div className="space-y-1.5 py-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block">請在地球上找出此國家：</span>
                  <h3 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
                    <MapPin className="w-6 h-6 text-red-500 animate-bounce" />
                    {gameCountries[currentQuestionIdx]?.commonName}
                  </h3>
                </div>

                <div className="flex items-center justify-between bg-neutral-950/60 border border-neutral-850 p-3 rounded-xl">
                  <span className="text-xs text-neutral-400">目前得分：</span>
                  <span className="text-sm font-black text-emerald-400">{score} 分</span>
                </div>

                {gameToast && (
                  <div className={cn(
                    "p-3 rounded-xl border text-xs font-semibold leading-relaxed tracking-wide flex items-start gap-2.5 shadow-sm",
                    gameToast.type === 'success' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                    gameToast.type === 'error' && "bg-rose-500/10 border-rose-500/20 text-rose-300",
                    gameToast.type === 'info' && "bg-blue-500/10 border-blue-500/20 text-blue-300"
                  )}>
                    <span className="text-base leading-none">
                      {gameToast.type === 'success' ? '🎉' : gameToast.type === 'error' ? '📍' : '💡'}
                    </span>
                    <div>
                      {gameToast.message}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5 mt-1">
                  {isAnsweringLocked ? (
                    <button
                      onClick={advanceGame}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/10 border border-emerald-500/20"
                    >
                      <ArrowRight className="w-4 h-4" />
                      下一題
                    </button>
                  ) : (
                    <button
                      onClick={handleSkipQuestion}
                      disabled={isAnsweringLocked}
                      className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 hover:text-white text-xs font-bold rounded-xl transition-all border border-neutral-700/30 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-neutral-400" />
                      跳過此題
                    </button>
                  )}
                  
                  <button
                    onClick={quitGame}
                    className="py-3 px-4 bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 text-xs font-bold rounded-xl transition-all border border-rose-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Power className="w-4 h-4" />
                    退出遊戲
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <Trophy className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-white">遊戲結束！</h3>
                    <p className="text-xs text-neutral-400">你順利完成了 10 題國家位置考驗</p>
                  </div>

                  <div className="bg-neutral-950/80 border border-neutral-850 rounded-2xl p-4 max-w-xs mx-auto">
                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">最終分數</div>
                    <div className="text-4xl font-black text-amber-400 tracking-tight">
                      {score} <span className="text-sm text-neutral-500 font-semibold">/ 10 分</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-2">
                      {score === 10 ? '👑 天才地理學家！完美滿分！' : score >= 7 ? '🌟 太厲害了！你對世界地圖非常熟悉！' : score >= 4 ? '👍 很不錯！繼續加油！' : '🌱 熟能生巧，再挑戰一次吧！'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={startGame}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/10 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      重新開始
                    </button>
                    
                    <button
                      onClick={quitGame}
                      className="py-3 px-4 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-xl transition-all border border-neutral-850 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      退出
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Decorative Gradient Overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40 z-0" />
    </div>
  );
}
