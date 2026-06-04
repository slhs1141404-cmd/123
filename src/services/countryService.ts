import { useState, useEffect } from 'react';
import { CountryData } from '../types';
import { FALLBACK_COUNTRIES } from '../data/fallbackCountries';
import { translateCountryToTraditional, getLocalizedCountryDetails, getISOByCountryName } from '../data/taiwanCountryNames';

// Multiple reliable sources
const SOURCES = [
  'https://restcountries.com/v3.1/all',
  'https://raw.githubusercontent.com/mledoze/countries/master/dist/countries.json'
];

// Compile a key-value mapping of all fallback country populations for ultra-robust backup
const FALLBACK_POP_MAP: Record<string, number> = FALLBACK_COUNTRIES.reduce((acc, c) => {
  if (c.cca3) acc[c.cca3.toUpperCase()] = c.population;
  if (c.cca2) acc[c.cca2.toUpperCase()] = c.population;
  return acc;
}, {} as Record<string, number>);

// Dynamic calculation of correct 2026 populations (UN estimates and projection models)
const EXTENSIVE_COUNTRY_POP_2026: Record<string, number> = {
  'IND': 1461000000, 'CHN': 1405000000, 'USA': 345000000, 'IDN': 281000000,
  'PAK': 256000000, 'NGA': 234000000, 'BRA': 218500000, 'BGD': 176000000,
  'RUS': 143800000, 'MEX': 131500000, 'JPN': 122500000, 'PHL': 119000000,
  'ETH': 132000000, 'EGY': 118500000, 'VNM': 100500000, 'COD': 109000000,
  'TUR': 86500000, 'DEU': 84200000, 'IRN': 91000000, 'FRA': 66400000,
  'GBR': 68900000, 'THA': 71700000, 'ZAF': 61700000, 'TZA': 69000000,
  'ITA': 58300000, 'MMR': 55000000, 'KOR': 51100000, 'COL': 52700000,
  'KEN': 57000000, 'ESP': 47500000, 'ARG': 46000000, 'DZA': 47000000,
  'SDN': 49000000, 'UGA': 50000000, 'IRQ': 46500000, 'UKR': 37000000,
  'CAN': 40500000, 'POL': 37500000, 'MAR': 38000000, 'SAU': 37000000,
  'UZB': 37000000, 'AGO': 37500000, 'PER': 34500000, 'AFG': 44000000,
  'MYS': 35400000, 'MOZ': 35000000, 'YEM': 35500000, 'GHA': 34500000,
  'NPL': 31000000, 'VEN': 29500000, 'MDG': 31500000, 'CMR': 29000000,
  'CIV': 29500000, 'AUS': 26900000, 'PRK': 26200000, 'TWN': 23350000,
  'NER': 28000000, 'LKA': 22000000, 'BFA': 24000000, 'MLI': 24500000,
  'ROU': 19000000, 'CHL': 19600000, 'KAZ': 20500000, 'ZMB': 21000000,
  'GTM': 18500000, 'ECU': 18200000, 'SYR': 24000000, 'SEN': 18800000,
  'KHM': 17200000, 'TCD': 19000000, 'SOM': 18500000, 'ZWE': 17000000,
  'GIN': 14500000, 'RWA': 14500000, 'BEN': 14000000, 'BDI': 13500000,
  'TUN': 12500000, 'BOL': 12500000, 'BEL': 11800000, 'HTI': 11900000,
  'CUB': 11000000, 'SSD': 11500000, 'DOM': 11400000, 'GRC': 10300000,
  'CZE': 10500000, 'PRT': 10200000, 'SWE': 10600000, 'AZE': 10400000,
  'JOR': 11500000, 'HND': 10500000, 'ARE': 9500000, 'HUN': 9600000,
  'TJK': 10500000, 'BLR': 9200000, 'AUT': 9100000, 'PNG': 10500000,
  'CHE': 8900000, 'ISR': 9900000, 'TGO': 9300000, 'SLE': 8900000,
  'HKG': 7500000, 'LBY': 7000000, 'LAO': 7700000, 'PRY': 6900000,
  'BGR': 6400000, 'SLV': 6400000, 'NCA': 7100000, 'KGZ': 7100000,
  'LBN': 5300000, 'TKM': 6600000, 'DNK': 5900000, 'SGP': 6050000,
  'FIN': 5600000, 'CAF': 5800000, 'SVK': 5400000, 'NOR': 5500000,
  'COG': 6200000, 'ERI': 3800000, 'PSE': 5400000, 'CRI': 5200000,
  'NZL': 5350000, 'IRL': 5200000, 'KWT': 4300000, 'OMN': 4700000,
  'PAN': 4500000, 'MRT': 4900000, 'HRV': 3900000, 'GEO': 3700000,
  'URY': 3400000, 'MNG': 3500000, 'MDA': 2500000, 'PRI': 3200000,
  'ALB': 2800000, 'JAM': 2800000, 'ARM': 2800000, 'LTU': 2700000,
  'GAB': 2500000, 'GMB': 2800000, 'NAM': 2700000, 'BWA': 2700000,
  'LSO': 2300000, 'MKD': 2100000, 'SVN': 2100000, 'LVA': 1800000,
  'GNB': 2200000, 'XKX': 1700000, 'GNQ': 1700000, 'BHR': 1500000,
  'TTO': 1500000, 'EST': 1300000, 'TLS': 1400000, 'MUS': 1300000,
  'CYP': 1300000, 'SWZ': 1200000, 'DJI': 1100000, 'FJI': 900000,
  'COM': 800000, 'GUY': 800000, 'BTN': 790000, 'SLB': 780000,
  'MNE': 620000, 'LUX': 660000, 'SUR': 630000, 'CPV': 600000,
  'MLT': 540000, 'BRN': 460000, 'BLZ': 420000, 'BHS': 410000,
  'ISL': 390000, 'VUT': 340000, 'MDV': 520000, 'WSM': 230000,
  'STP': 240000, 'LCA': 180000, 'KIR': 135000, 'GRL': 56000,
  'SYC': 100000, 'TON': 106000, 'FSM': 115000, 'GRD': 125000,
  'VCT': 110000, 'ABW': 106000, 'ATG': 94000, 'AND': 80000,
  'DMA': 73000, 'MCO': 39000, 'LIE': 39000, 'SMR': 34000,
  'PLW': 18000, 'NRU': 12000, 'TUV': 11500, 'VAT': 825,
  'FLK': 3500, 'ESH': 600000, 'SOM-1': 5000000, 'CYM': 69000,
  'BMU': 64000, 'MAC': 700000, 'AIA': 15800, 'VGB': 31000,
  'VIR': 104000, 'COK': 17500, 'NIU': 1600, 'TKL': 1400,
  'SHN': 4300, 'SPM': 5800, 'BLM': 10000, 'MAF': 32000,
  'SXM': 43000, 'BES': 26000, 'WLF': 11000, 'PYF': 286000,
  'NCL': 295000, 'SPM-1': 6000, 'SJM': 2500, 'GIB': 34000,
  'GGY': 64000, 'JEY': 104000, 'IMN': 85000, 'FRO': 54000,
  'MSR': 5000, 'MNP': 47000, 'GUM': 170000, 'ASM': 44000,
  'SGP-1': 6000000
};

export function useCountryData() {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData(urlIndex = 0) {
      if (urlIndex >= SOURCES.length) {
        console.warn('All external API nodes failed or are offline. Activating built-in 4K-ready local fallback countries database!');
        setCountries(FALLBACK_COUNTRIES);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(SOURCES[urlIndex]);
        if (!response.ok) throw new Error('Node unreachable');
        const data = await response.json();
        
        // Handle different schemas (v3.1 vs GitHub static)
        const mappedData: CountryData[] = data.map((item: any) => {
          // Detect schema (REST Countries v3.1 vs Others)
          const isV3 = !!item.name?.common;
          
          // Determine ISO codes (crucial for flags)
          let cca2 = (item.cca2 || item.alpha2 || item.alpha2Code || '').toLowerCase();
          let cca3 = (item.cca3 || item.alpha3 || item.alpha3Code || item.cioc || '').toUpperCase();

          // Prioritize ISO matcher by name first to resolve any name differences / ROC issues
          const defaultNamesCheck = [
            item.name?.common,
            item.name?.official,
            item.name
          ];
          for (const cand of defaultNamesCheck) {
            if (typeof cand === 'string' && cand) {
              const matchedISO = getISOByCountryName(cand);
              if (matchedISO) {
                cca3 = matchedISO.cca3;
                cca2 = matchedISO.cca2.toLowerCase();
                break;
              }
            }
          }

          // Get Chinese name if available
          let zhName = '';
          if (isV3 && item.translations) {
            // Prefer Traditional Chinese if available (REST countries usually has zho, chi)
            zhName = item.translations.zho?.common || item.translations.chi?.common || '';
          } else if (item.translations && typeof item.translations === 'object') {
            zhName = item.translations.cn || item.translations.zh || '';
          }
          
          // Specific mappings for common Traditional Chinese differences or Missing names
          const nameMap: Record<string, string> = {
            'Taiwan': '台灣',
            'South Korea': '韓國',
            'North Korea': '北韓',
            'United States': '美國',
            'Japan': '日本',
            'China': '中國',
            'Hong Kong': '香港',
            'Macau': '澳門',
            'United Kingdom': '英國',
            'Germany': '德國',
            'France': '法國',
            'Italy': '義大利',
            'Thailand': '泰國',
            'Vietnam': '越南',
            'Philippines': '菲律賓',
            'Singapore': '新加坡',
            'Malaysia': '馬來西亞',
            'Australia': '澳洲',
            'New Zealand': '紐西蘭',
            'Canada': '加拿大',
            'Russia': '俄羅斯',
            'Brazil': '巴西',
            'India': '印度',
            'Indonesia': '印尼',
            'Turkey': '土耳其',
            'Mexico': '墨西哥',
            'South Africa': '南非',
            'Egypt': '埃及',
            'Saudi Arabia': '沙烏地阿拉伯',
            'Israel': '以色列',
            'Netherlands': '荷蘭',
            'Belgium': '比利時',
            'Switzerland': '瑞士',
            'Sweden': '瑞典',
            'Norway': '挪威',
            'Denmark': '丹麥',
            'Finland': '芬蘭',
            'Portugal': '葡萄牙',
            'Greece': '希臘',
            'Ukraine': '烏克蘭',
            'Poland': '波蘭',
            'Ireland': '愛爾蘭',
            'Czech Republic': '捷克',
            'Slovakia': '斯洛伐克',
            'Hungary': '匈牙利',
            'Romania': '羅馬尼亞',
            'Bulgaria': '保加利亞',
            'Croatia': '克羅埃西亞',
            'Slovenia': '斯洛維尼亞',
            'Serbia': '塞爾維亞',
            'Bosnia and Herzegovina': '波士尼亞與赫塞哥維納',
            'Albania': '阿爾巴尼亞',
            'Montenegro': '蒙特內哥羅',
            'North Macedonia': '北馬其頓',
            'Belarus': '白俄羅斯',
            'Lithuania': '立宛陶',
            'Latvia': '拉脫維亞',
            'Estonia': '愛沙尼亞',
            'Georgia': '喬治亞',
            'Armenia': '亞美尼亞',
            'Azerbaijan': '亞塞拜然',
            'Kazakhstan': '哈薩克',
            'Uzbekistan': '烏茲別克',
            'Turkmenistan': '土庫曼',
            'Kyrgyzstan': '吉爾吉斯',
            'Tajikistan': '塔吉克',
            'Afghanistan': '阿富汗',
            'Pakistan': '巴基斯坦',
            'Bangladesh': '孟加拉',
            'Sri Lanka': '斯里蘭卡'
          };
          
          // Translate and normalize name to Traditional Chinese
          const rawChineseCandidate = zhName || (isV3 ? item.name?.common : (item.name?.common || item.name || ''));
          const commonName = translateCountryToTraditional(cca3, rawChineseCandidate);
          
          // Use a reliable Flag CDN based on cca2
          const flagUrl = cca2 
            ? `https://flagcdn.com/${cca2}.svg` 
            : (isV3 && item.flags?.svg ? item.flags.svg : 'https://flagcdn.com/un.svg');

          // Improved Population Parsing
          let basePopulation = 0;
          if (typeof item.population === 'number' && item.population > 0) {
            basePopulation = item.population;
          } else if (item.stats?.population && item.stats.population > 0) {
            basePopulation = item.stats.population;
          }

          // Robust fallback to static database populations if API is missing or 0
          if (basePopulation <= 0) {
            const fallbackPop = FALLBACK_POP_MAP[cca3] || FALLBACK_POP_MAP[cca2.toUpperCase()];
            if (fallbackPop) {
              basePopulation = fallbackPop;
            }
          }

          // Utilizes the static module-level 2026 estimate lookup maps directly
          const itemRegion = item.region || '未知';
          let population = EXTENSIVE_COUNTRY_POP_2026[cca3];
          if (!population) {
            let annualRate = 0.009;
            if (itemRegion === 'Africa') annualRate = 0.024;
            else if (itemRegion === 'Europe') annualRate = -0.0005;
            else if (itemRegion === 'Americas') annualRate = 0.007;
            else if (itemRegion === 'Asia') annualRate = 0.006;
            else if (itemRegion === 'Oceania') annualRate = 0.012;
            population = Math.round(basePopulation * Math.pow(1 + annualRate, 4.5));
          }

          // Safety guard for population values
          if (isNaN(population) || population <= 0) {
            if (cca3 === 'ATA' || cca2.toUpperCase() === 'AQ') {
              population = 0; // Uninhabited Antarctica
            } else {
              population = EXTENSIVE_COUNTRY_POP_2026[cca3] || FALLBACK_POP_MAP[cca3] || FALLBACK_POP_MAP[cca2.toUpperCase()] || 12500;
            }
          }

          const origCap = isV3 ? (item.capital ? item.capital[0] : '無') : (item.capital || '無');
          const origCurKeys = isV3 && item.currencies ? Object.keys(item.currencies) : [];
          const origCurName = isV3 
            ? (item.currencies ? Object.values(item.currencies).map((c: any) => c.name).join(', ') : '未知')
            : (item.currency || '未知');
          
          const localized = getLocalizedCountryDetails(cca3, origCap, origCurName, origCurKeys);

          return {
            name: isV3 ? item.name?.official : (item.name?.official || item.name || commonName),
            commonName: commonName,
            capital: localized.capital,
            population: population,
            languages: isV3 
              ? (item.languages ? Object.values(item.languages) : [])
              : (item.languages && typeof item.languages === 'object' ? Object.values(item.languages) : []),
            region: item.region || '未知',
            subregion: item.subregion || '未知',
            flag: flagUrl,
            currency: localized.currencyName,
            currencyName: localized.currencyName,
            currencyCode: localized.currencyCode,
            latlng: item.latlng || [0, 0],
            cca2: cca2.toUpperCase(),
            cca3: cca3
          };
        });

        // Filter out invalid entries
        const validData = mappedData.filter(c => c.cca3 && c.commonName);
        
        // Robust post-check validation sweep for every single country
        const validatedData = validData.map(c => {
          const code = (c.cca3 || '').trim().toUpperCase();
          const pLoc = getLocalizedCountryDetails(code, c.capital, c.currency, []);
          
          let validatedPop = c.population;
          
          // Force align population to our extremely robust 2026 UN estimates & fallback maps directly
          if (code === 'ATA' || c.cca2 === 'AQ') {
            validatedPop = 0; // Uninhabited
          } else if (EXTENSIVE_COUNTRY_POP_2026[code]) {
            validatedPop = EXTENSIVE_COUNTRY_POP_2026[code];
          } else if (FALLBACK_POP_MAP[code]) {
            validatedPop = FALLBACK_POP_MAP[code];
          }

          if (code !== 'ATA') {
            if (validatedPop === undefined || validatedPop === null || isNaN(validatedPop) || validatedPop <= 0) {
              const fallbackPopValue = EXTENSIVE_COUNTRY_POP_2026[code] || FALLBACK_POP_MAP[code] || 125000;
              console.warn(`Recovering missing population for ${code} -> ${fallbackPopValue}`);
              validatedPop = fallbackPopValue;
            }
          }
          
          return {
            ...c,
            capital: pLoc.capital,
            currency: pLoc.currencyName,
            currencyName: pLoc.currencyName,
            currencyCode: pLoc.currencyCode,
            population: validatedPop
          };
        });

        // Ensure key foundational countries are present; if missing, import them from FALLBACK_COUNTRIES
        const existingCodes = new Set(validatedData.map(c => c.cca3.toUpperCase()));
        FALLBACK_COUNTRIES.forEach(f => {
          const fCode = (f.cca3 || '').toUpperCase();
          if (fCode && !existingCodes.has(fCode)) {
            const loc = getLocalizedCountryDetails(fCode, f.capital, f.currency, []);
            validatedData.push({
              ...f,
              capital: loc.capital,
              currency: loc.currencyName,
              currencyName: loc.currencyName,
              currencyCode: loc.currencyCode
            });
            existingCodes.add(fCode);
          }
        });

        setCountries(validatedData);
        setLoading(false);
        setError(null);
      } catch (err) {
        console.warn(`Source ${urlIndex} failed, trying next...`);
        fetchData(urlIndex + 1);
      }
    }

    fetchData();
  }, []);

  return { countries, loading, error };
}
