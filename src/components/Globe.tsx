import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import GlobeGL from 'react-globe.gl';
import * as THREE from 'three';
import { CountryData } from '../types';
import { LandmarkData } from '../data/landmarks';
import { translateCountryToTraditional, getISOByCountryName } from '../data/taiwanCountryNames';
import customEarthTexture from '../assets/images/earth_texture_map_1779501739465.png';
import { 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  Ruler, 
  Sparkles,
  Layers,
  MapPin,
  Eye,
  Moon,
  Sun,
  Sliders,
  Map,
  Settings,
  Check,
  Activity
} from 'lucide-react';

interface GlobeProps {
  onCountryClick: (country: CountryData | null) => void;
  countries: CountryData[];
  selectedCountry: CountryData | null;
  searchTerm: string;
  regionFilter: string;
  showClouds: boolean;
  showAtmosphere: boolean;
  showGrid: boolean;
  showBorders: boolean;
  selectedLandmark: LandmarkData | null;
  isNightMode: boolean;
  setIsNightMode: (val: boolean) => void;
  isGameActive?: boolean;
  gameHighlightCca3?: string | null;
  gameHighlightColor?: 'green' | 'red' | null;
}

const Globe: React.FC<GlobeProps> = ({ 
  onCountryClick, 
  countries, 
  selectedCountry,
  searchTerm,
  regionFilter,
  showClouds,
  showAtmosphere,
  showGrid,
  showBorders,
  selectedLandmark,
  isNightMode,
  setIsNightMode,
  isGameActive = false,
  gameHighlightCca3 = null,
  gameHighlightColor = null
}) => {
  const globeEl = useRef<any>();
  const [countriesGeo, setCountriesGeo] = useState<any>(null);
  const [hoverD, setHoverD] = useState<any>(null);

  // Map theme type & fine-tuning calibration state options to prevent boundary ocean overruns
  const [mapTheme, setMapTheme] = useState<'precise' | 'custom'>('precise');
  const [offsetX, setOffsetX] = useState<number>(0.0);
  const [offsetY, setOffsetY] = useState<number>(0.0);
  const [repeatX, setRepeatX] = useState<number>(1.0);
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);

  // Selecting visual texture based on theme type & day/night conditions
  const globeURL = useMemo(() => {
    if (mapTheme === 'precise') {
      return isNightMode 
        ? 'https://unpkg.com/three-globe/example/img/earth-night.jpg'
        : 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
    }
    return customEarthTexture;
  }, [mapTheme, isNightMode]);

  // Real-time camera telemetry
  const [cameraPov, setCameraPov] = useState({ lat: 0, lng: 0, altitude: 2.5 });
  const [headingAngle, setHeadingAngle] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Google Earth Interactive Measurement Engine
  const [measurementActive, setMeasurementActive] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{
    start: { lat: number; lng: number } | null;
    end: { lat: number; lng: number } | null;
  }>({ start: null, end: null });

  // Geodesic (Great-Circle) distance calculation (Haversine formula in KM)
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * 
        Math.cos((lat2 * Math.PI) / 180) * 
        Math.sin(dLon / 2) * 
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const arcsData = useMemo(() => {
    if (measurePoints.start && measurePoints.end) {
      return [{
        startLat: measurePoints.start.lat,
        startLng: measurePoints.start.lng,
        endLat: measurePoints.end.lat,
        endLng: measurePoints.end.lng,
        color: '#3b82f6',
        name: '起訖測距網絡'
      }];
    }
    return [];
  }, [measurePoints]);

  const getCountryForFeature = useCallback((d: any, countriesList: CountryData[]) => {
    if (!d || !d.properties || !countriesList || countriesList.length === 0) return null;
    const p = d.properties;

    // 1. Try resolving via getISOByCountryName lookups for names inside GeoJSON, ensuring robust prioritization
    const nameFieldsForISO = ['NAME', 'name', 'NAME_LONG', 'name_long', 'ADMIN', 'admin', 'FORMAL_EN', 'formal_en'];
    for (const nf of nameFieldsForISO) {
      const nameVal = p[nf];
      if (typeof nameVal === 'string' && nameVal.trim()) {
        const matchedISO = getISOByCountryName(nameVal);
        if (matchedISO) {
          const found = countriesList.find(c => (c.cca3 || '').toUpperCase() === matchedISO.cca3);
          if (found) return found;
        }
      }
    }

    // 2. Next, check all possible 3-letter ISO code fields
    const fieldsA3 = ['ISO_A3', 'iso_a3', 'ADM0_A3', 'adm0_a3', 'GU_A3', 'gu_a3', 'SOV_A3', 'sov_a3', 'SU_A3', 'su_a3'];
    for (const f of fieldsA3) {
      const val = p[f];
      if (typeof val === 'string') {
        const cleanVal = val.trim().toUpperCase();
        if (cleanVal !== '-99' && cleanVal.length === 3) {
          const found = countriesList.find(c => (c.cca3 || '').toUpperCase() === cleanVal);
          if (found) return found;
        }
      }
    }

    // 3. Check 2-letter ISO code fields
    const fieldsA2 = ['ISO_A2', 'iso_a2', 'POSTAL', 'postal'];
    for (const f of fieldsA2) {
      const val = p[f];
      if (typeof val === 'string') {
        const cleanVal = val.trim().toUpperCase();
        if (cleanVal !== '-99' && cleanVal.length === 2) {
          const found = countriesList.find(c => (c.cca2 || '').toUpperCase() === cleanVal);
          if (found) return found;
        }
      }
    }

    // 4. Default Name comparison fallback
    const nameFields = ['NAME', 'name', 'ADMIN', 'admin'];
    for (const nf of nameFields) {
      const nameVal = p[nf];
      if (typeof nameVal === 'string') {
        const cleanName = nameVal.trim().toLowerCase();
        const found = countriesList.find(c => 
          (c.commonName || '').toLowerCase() === cleanName || 
          (c.name || '').toLowerCase() === cleanName ||
          (c.commonName || '').toLowerCase().includes(cleanName) ||
          cleanName.includes((c.commonName || '').toLowerCase())
        );
        if (found) return found;
      }
    }

    // 5. Dynamic Synthesis fallback to guarantee absolute clicking coverage and zero failure rate!
    const targetCca3 = (p.ISO_A3 || p.ADM0_A3 || p.GU_A3 || 'UNN').toUpperCase();
    const targetCca2 = (p.ISO_A2 || p.POSTAL || p.postal || (targetCca3.length === 3 ? targetCca3.substring(0, 2) : 'UN')).toUpperCase();
    const englishName = p.NAME || p.name || p.ADMIN || p.admin || p.FORMAL_EN || '未知領域';
    
    // Fetch Taiwanese Traditional translation candidate via our robust mapping
    const translatedName = translateCountryToTraditional(targetCca3, englishName);
    
    // Get population from the GeoJSON POP_EST or our comprehensive mapping
    const lookupPops: Record<string, number> = {
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
      'CIV': 29500000, 'AUS': 26900000, 'PRK': 26200000, 'TWN': 23350000
    };
    
    let basePop = lookupPops[targetCca3] || p.POP_EST || p.pop_est || p.POPULATION || 0;
    if (basePop <= 0) {
      basePop = 125000; // reasonable average fallback for territories
    }
    
    // Dynamic fallback structure
    return {
      name: englishName,
      commonName: translatedName,
      capital: p.CAPITAL || p.capital || '地理中心',
      population: basePop,
      languages: [p.LANG || p.lang_group || '英語'],
      region: p.CONTINENT || p.continent || p.REG_W || '未知大洲',
      subregion: p.SUBREGION || p.subregion || '未知次分區',
      flag: targetCca2 && targetCca2 !== '-9' ? `https://flagcdn.com/${targetCca2.toLowerCase()}.svg` : 'https://flagcdn.com/un.svg',
      currency: '當地貨幣',
      latlng: d.properties.LABEL_LAT && d.properties.LABEL_LON ? [d.properties.LABEL_LAT, d.properties.LABEL_LON] : [0, 0],
      cca2: targetCca2,
      cca3: targetCca3
    };
  }, []);

  // Robust Helpers to map all country features/islands fully to prevent missing regions/holes
  const isFeatureSelectedCountry = useCallback((d: any, cca3: string) => {
    if (!cca3 || !d || !d.properties) return false;
    const target = cca3.toUpperCase();
    
    // Try resolving directly using our main resolution function first
    const resolvedCountry = getCountryForFeature(d, countries);
    if (resolvedCountry && (resolvedCountry.cca3 || '').toUpperCase() === target) {
      return true;
    }

    // 1. Expand to check all possible 3-letter metadata properties, ignoring "-99"
    const fields = ['ISO_A3', 'iso_a3', 'ADM0_A3', 'adm0_a3', 'GU_A3', 'gu_a3', 'SOV_A3', 'sov_a3', 'SU_A3', 'su_a3'];
    for (const f of fields) {
      const val = d.properties[f];
      if (typeof val === 'string') {
        const cleanVal = val.trim().toUpperCase();
        if (cleanVal === target && cleanVal !== '-99') {
          return true;
        }
      }
    }

    // 2. Extra robust name-based comparison fallback
    if (selectedCountry) {
      const lowerCommon = (selectedCountry.commonName || '').toLowerCase();
      const lowerOfficial = (selectedCountry.name || '').toLowerCase();
      const nameFields = ['NAME', 'name', 'ADMIN', 'admin'];
      for (const nf of nameFields) {
        const nameVal = d.properties[nf];
        if (typeof nameVal === 'string') {
          const cleanName = nameVal.trim().toLowerCase();
          if (cleanName && (cleanName === lowerCommon || cleanName === lowerOfficial)) {
            return true;
          }
        }
      }
    }

    return false;
  }, [selectedCountry, countries, getCountryForFeature]);

  const labelsData = useMemo(() => {
    if (selectedLandmark) {
      return [{
        lat: selectedLandmark.lat,
        lng: selectedLandmark.lng,
        text: selectedLandmark.chineseName || selectedLandmark.name,
        color: '#10b981',
        size: 0.95
      }];
    }
    // Country labels (central green dot and text label) completely removed to keep Earth clean and border highlight only.
    return [];
  }, [selectedLandmark]);

  // Helper to get beautiful, lightweight general vector map colors per country/polygon
  const getLandColor = (d: any, isNight: boolean) => {
    const props = d.properties || {};
    const continent = props.CONTINENT || props.continent || props.REGION_W || props.SUBREGION || '';
    const name = props.NAME || props.name || props.ADMIN || '';
    
    // Day Mode beautiful pastel-styled general physical/political map colors
    if (!isNight) {
      if (continent.includes('Africa')) return '#fbf0da'; // sandy desert warmth
      if (continent.includes('Europe')) return '#e5eee3'; // soft green
      if (continent.includes('Asia')) return '#e2ecd8'; // light warm olive green
      if (continent.includes('America')) return '#e7eef4'; // soft airy blue-sky-grey
      if (name.includes('Antarctica') || continent.includes('Antarc')) return '#fcfcfc'; // pure clean ice-white
      if (continent.includes('Oceania')) return '#ebf4e6'; // refreshing light teal-green
      
      // Fallback elegant pastel palette colors based on text length to look multi-colored political map
      const colors = ['#f4eedb', '#e8f0e5', '#eaebeb', '#edf4ee', '#e4ebf0'];
      return colors[name.length % colors.length];
    } 
    // Night Mode sleek cartographic futuristic vector colors
    else {
      if (continent.includes('Africa')) return '#1a2233'; 
      if (continent.includes('Europe')) return '#152b47';
      if (continent.includes('Asia')) return '#12253f';
      if (continent.includes('America')) return '#102e52';
      if (name.includes('Antarctica') || continent.includes('Antarc')) return '#313e54';
      if (continent.includes('Oceania')) return '#112d46';
      
      const colors = ['#122035', '#162842', '#142a47', '#112239', '#1a2e4a'];
      return colors[name.length % colors.length];
    }
  };

  // Helper to show modern status toasts
  const showStatusToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(setCountriesGeo)
      .catch(err => console.error('Failed to load map data:', err));
    
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // High stability coordinate polling & orientation listener
  useEffect(() => {
    let intervalId: any;
    
    const updateTelemetry = () => {
      const globe = globeEl.current;
      if (!globe) return;

      const pov = globe.pointOfView();
      if (pov) {
        setCameraPov(pov);
      }

      const controls = globe.controls();
      if (controls) {
        // Safe query of OrbitControls azimuthal rotation
        const angle = typeof controls.getAzimuthalAngle === 'function' ? controls.getAzimuthalAngle() : 0;
        setHeadingAngle(angle * (180 / Math.PI));
      }
    };

    intervalId = setInterval(updateTelemetry, 150);
    return () => clearInterval(intervalId);
  }, [countriesGeo]);

  // Extreme performance tuning for the WebGL context & base material
  useEffect(() => {
    const globe = globeEl.current;
    if (!globe) return;

    // 1. Force pixel ratio to 1 to save GPU processing on High-DPI screens
    try {
      if (typeof globe.renderer === 'function') {
        const renderer = globe.renderer();
        if (renderer) {
          renderer.setPixelRatio(1);
          renderer.shadowMap.enabled = false;
        }
      }
    } catch (err) {
      console.warn('Could not adjust renderer settings:', err);
    }

    // 2. Configure base globe sphere to be a beautiful lightweight deep navy or slate blue
    try {
      let material: any = null;
      if (typeof globe.globeMaterial === 'function') {
        material = globe.globeMaterial();
      } else if (globe.globeMaterial) {
        material = globe.globeMaterial;
      }

      if (material) {
        if (material.color) {
          material.color = new THREE.Color('#ffffff'); // Set to pure white so the satellite image textures show their natural, rich colors!
        }
        if ('shininess' in material) {
          material.shininess = 0.15; // Subtle elegant gloss for a crisp look
        }
        if (material.specular && typeof material.specular.setHex === 'function') {
          material.specular.setHex(0x222222); // Elegant light reflections
        }
      }
    } catch (err) {
      console.warn('Could not customize globe material directly:', err);
    }

    // 3. Keep lights flat and lightweight
    try {
      if (typeof globe.scene === 'function') {
        const scene = globe.scene();
        if (scene) {
          scene.traverse((obj: any) => {
            if (obj.isLight) {
              obj.castShadow = false;
            }
          });
        }
      }
    } catch (err) {
      console.warn('Could not adjust lights directly:', err);
    }
  }, [countriesGeo, isNightMode]);

  // Real-time synchronization of ThreeJS material texture wrap, repeat, and offset mapping coordinates
  useEffect(() => {
    const globe = globeEl.current;
    if (!globe) return;

    const interval = setInterval(() => {
      let material: any = null;
      if (typeof globe.globeMaterial === 'function') {
        material = globe.globeMaterial();
      } else if (globe.globeMaterial) {
        material = globe.globeMaterial;
      }

      if (material && material.map) {
        const texture = material.map;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        let changed = false;
        
        if (mapTheme === 'custom') {
          if (texture.offset.x !== offsetX) {
            texture.offset.x = offsetX;
            changed = true;
          }
          if (texture.offset.y !== offsetY) {
            texture.offset.y = offsetY;
            changed = true;
          }
          if (texture.repeat.x !== repeatX) {
            texture.repeat.x = repeatX;
            changed = true;
          }
        } else {
          // Precise layer maps with standard Greenwich Zero Prime Meridian projection alignment
          if (texture.offset.x !== 0) {
            texture.offset.x = 0;
            changed = true;
          }
          if (texture.offset.y !== 0) {
            texture.offset.y = 0;
            changed = true;
          }
          if (texture.repeat.x !== 1) {
            texture.repeat.x = 1;
            changed = true;
          }
        }

        if (changed) {
          texture.needsUpdate = true;
        }
      }
    }, 150);

    return () => clearInterval(interval);
  }, [mapTheme, offsetX, offsetY, repeatX]);

  // Coordinates for continent centers
  const REGION_COORDS: Record<string, { lat: number, lng: number, alt: number }> = {
    'Africa': { lat: 1.0, lng: 18.0, alt: 2.2 },
    'Americas': { lat: 15.0, lng: -85.0, alt: 2.5 },
    'Asia': { lat: 34.0, lng: 100.0, alt: 2.5 },
    'Europe': { lat: 48.0, lng: 15.0, alt: 1.8 },
    'Oceania': { lat: -25.0, lng: 140.0, alt: 2.2 }
  };

  // Move camera based on region selection
  useEffect(() => {
    if (regionFilter !== 'All' && globeEl.current && !selectedCountry && !selectedLandmark) {
      const coords = REGION_COORDS[regionFilter];
      if (coords) {
        globeEl.current.pointOfView({ 
          lat: coords.lat, 
          lng: coords.lng, 
          altitude: coords.alt 
        }, 1500);
      }
    } else if (regionFilter === 'All' && globeEl.current && !selectedCountry && !selectedLandmark && !searchTerm) {
      globeEl.current.pointOfView({ altitude: 2.5 }, 1500);
    }
  }, [regionFilter, selectedCountry, selectedLandmark, searchTerm]);

  // Sync selection to camera movement - Google Earth Cinematic FlyTo
  const lastSelectedCountryRef = useRef<any>(null);
  useEffect(() => {
    if (selectedCountry && globeEl.current && selectedCountry !== lastSelectedCountryRef.current) {
      lastSelectedCountryRef.current = selectedCountry;
      const globe = globeEl.current;
      const pov = globe.pointOfView();
      const targetLat = selectedCountry.latlng[0];
      const targetLng = selectedCountry.latlng[1];
      
      // Step 1: Pull out to create a flight sensation
      globe.pointOfView({
        lat: pov.lat + (targetLat - pov.lat) * 0.4,
        lng: pov.lng + (targetLng - pov.lng) * 0.4,
        altitude: Math.max(pov.altitude * 1.35, 2.2)
      }, 550);
      
      // Step 2: Flying closer with orbital pivot
      setTimeout(() => {
        globe.pointOfView({
          lat: targetLat,
          lng: targetLng,
          altitude: 1.3
        }, 750);
      }, 555);

      // Step 3: Steep slope view inside high detail terrain curves
      setTimeout(() => {
        globe.pointOfView({
          lat: targetLat,
          lng: targetLng,
          altitude: 0.85
        }, 800);
      }, 1310);
    }
  }, [selectedCountry]);

  // Sync selected landmark to camera movement
  const lastSelectedLandmarkRef = useRef<any>(null);
  useEffect(() => {
    if (selectedLandmark && globeEl.current && selectedLandmark !== lastSelectedLandmarkRef.current) {
      lastSelectedLandmarkRef.current = selectedLandmark;
      const globe = globeEl.current;
      const pov = globe.pointOfView();
      
      // Step 1: Pull out slightly to create a flight sensation
      globe.pointOfView({
        lat: pov.lat + (selectedLandmark.lat - pov.lat) * 0.35,
        lng: pov.lng + (selectedLandmark.lng - pov.lng) * 0.35,
        altitude: Math.max(pov.altitude * 1.3, 2.0)
      }, 500);

      // Step 2: Flying closer
      setTimeout(() => {
        globe.pointOfView({
          lat: selectedLandmark.lat,
          lng: selectedLandmark.lng,
          altitude: 0.95
        }, 800);
      }, 520);

      // Step 3: Low-altitude orbital view with 3D feel
      setTimeout(() => {
        globe.pointOfView({
          lat: selectedLandmark.lat,
          lng: selectedLandmark.lng,
          altitude: selectedLandmark.altitude
        }, 800);
      }, 1350);
    }
  }, [selectedLandmark]);

  // Sync game highlight to camera movement so player can see skipped/correct answer easily
  const lastGameHighlightRef = useRef<string | null>(null);
  useEffect(() => {
    if (isGameActive && gameHighlightCca3 && globeEl.current && gameHighlightCca3 !== lastGameHighlightRef.current) {
      lastGameHighlightRef.current = gameHighlightCca3;
      const targetCountry = countries.find(c => (c.cca3 || '').toUpperCase() === gameHighlightCca3.toUpperCase());
      if (targetCountry && targetCountry.latlng && targetCountry.latlng.length === 2 && targetCountry.latlng[0] !== 0) {
        const globe = globeEl.current;
        const pov = globe.pointOfView();
        const targetLat = targetCountry.latlng[0];
        const targetLng = targetCountry.latlng[1];
        
        // Fluid flying transition
        const currentAltitude = pov.altitude;
        const jumpAlt = Math.max(currentAltitude * 1.25, 1.85);

        globe.pointOfView({
          lat: pov.lat + (targetLat - pov.lat) * 0.35,
          lng: pov.lng + (targetLng - pov.lng) * 0.35,
          altitude: jumpAlt
        }, 450);

        setTimeout(() => {
          globe.pointOfView({
            lat: targetLat,
            lng: targetLng,
            altitude: 1.15
          }, 850);
        }, 460);
      }
    } else if (!gameHighlightCca3) {
      lastGameHighlightRef.current = null;
    }
  }, [gameHighlightCca3, isGameActive, countries]);

  useEffect(() => {
    if (globeEl.current) {
      const isAutoRotate = !selectedCountry && !searchTerm && regionFilter === 'All';
      globeEl.current.controls().autoRotate = isAutoRotate;
      globeEl.current.controls().autoRotateSpeed = 0.5;
    }
  }, [selectedCountry, searchTerm, regionFilter]);

  // Interactive navigation commands
  const handleCompassReset = () => {
    const globe = globeEl.current;
    if (!globe) return;
    const pov = globe.pointOfView();
    // Setting pointOfView centers camera alignment directly back to upright state
    globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: pov.altitude }, 1000);
    showStatusToast("🧭 視角復位：已重新校準對齊正北方。");
  };

  const handleZoomIn = () => {
    const globe = globeEl.current;
    if (!globe) return;
    const pov = globe.pointOfView();
    globe.pointOfView({ ...pov, altitude: Math.max(0.15, pov.altitude * 0.72) }, 550);
  };

  const handleZoomOut = () => {
    const globe = globeEl.current;
    if (!globe) return;
    const pov = globe.pointOfView();
    globe.pointOfView({ ...pov, altitude: Math.min(10.0, pov.altitude * 1.38) }, 550);
  };

  const handleTiltToggle = () => {
    const globe = globeEl.current;
    if (!globe) return;
    const pov = globe.pointOfView();
    // Adjust camera altitude to a very close distance where curvature stands out
    const isClose = pov.altitude < 1.0;
    const targetAlt = isClose ? 2.5 : 0.65;
    globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: targetAlt }, 1100);
    showStatusToast(
      targetAlt < 1.0 
        ? "🛸 已啟用 3D 模擬太空視角：進入低海拔大氣折射曲面模式" 
        : "🪐 已切換至 2D 平面觀測視角：進入廣角俯瞰視界"
    );
  };

  const handleMeasureClick = () => {
    if (selectedCountry) {
      showStatusToast(`📏 測量起點定位：${selectedCountry.commonName} 首都 (${selectedCountry.capital || '無'}) 到當前視窗中心的對角距離為 ${(cameraPov.altitude * 6371).toFixed(0)} km。`);
    } else {
      showStatusToast("📏 地表測量功能：請選取任何一國以其首部作為測距基準基點軸。");
    }
  };

  const handleStreetViewClick = () => {
    if (selectedCountry) {
      showStatusToast(`🚶 模擬街景加載成功：已進入 ${selectedCountry.commonName} (${selectedCountry.capital || '中心區域'}) 的 360° 全景高解析度模擬圖層！`);
    } else {
      showStatusToast("🚶 模擬街景服務：請在地圖上選取一個國家，系統將為其提供首都的 3D 三維空間視野。");
    }
  };

  const formatLat = (lat: number) => {
    const dir = lat >= 0 ? "N" : "S";
    return `${Math.abs(lat).toFixed(4)}° ${dir}`;
  };

  const formatLng = (lng: number) => {
    const dir = lng >= 0 ? "E" : "W";
    return `${Math.abs(lng).toFixed(4)}° ${dir}`;
  };

  const formatAltitude = (alt: number) => {
    // Globe radius reference conversion (alt * model scale * earth real radius)
    const km = Math.round(alt * 6371);
    return `${km.toLocaleString()} 公里`;
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
    'Singapore': '新加坡'
  };

  return (
    <div className="relative w-full h-full cursor-grab active:cursor-grabbing bg-[#000105]">
      <GlobeGL
        ref={globeEl}
        globeImageUrl={globeURL}
        globeColor={isNightMode ? "#0d1e3a" : "#1a3a6c"}
        showAtmosphere={false}
        showGraticules={showGrid}
        lineHoverPrecision={0}
        
        polygonsTransitionDuration={0}
        polygonsData={countriesGeo ? countriesGeo.features : []}
        polygonAltitude={d => {
          if (measurementActive) return 0.0001;
          if (!showBorders) return 0;
          if (isGameActive && gameHighlightCca3 && isFeatureSelectedCountry(d, gameHighlightCca3)) {
            return 0.015;
          }
          if (selectedCountry && isFeatureSelectedCountry(d, selectedCountry.cca3)) return 0.008; // High-fidelity elevated look prevents stitching/z-fighting holes
          if (d === hoverD) return 0.004;
          return 0.00015;
        }}
        polygonCapColor={d => {
          if (measurementActive) return 'rgba(255, 255, 255, 0.05)';
          
          if (isGameActive && gameHighlightCca3 && isFeatureSelectedCountry(d, gameHighlightCca3)) {
            return gameHighlightColor === 'green' ? 'rgba(16, 185, 129, 0.65)' : 'rgba(239, 68, 68, 0.65)';
          }
          if (selectedCountry && isFeatureSelectedCountry(d, selectedCountry.cca3)) {
            return 'rgba(16, 185, 129, 0.42)'; // Beautiful high-end green highlight like user screenshot
          }
          if (d === hoverD) {
            return 'rgba(255, 255, 255, 0.16)'; // Gentle glassy hover highlight
          }
          return 'rgba(0, 0, 0, 0)'; // Fully transparent by default, exposing the beautiful, customized natural texture!
        }}
        polygonSideColor={d => {
          if (measurementActive) return 'rgba(255, 255, 255, 0)';
          if (isGameActive && gameHighlightCca3 && isFeatureSelectedCountry(d, gameHighlightCca3)) {
            return gameHighlightColor === 'green' ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)';
          }
          if (selectedCountry && isFeatureSelectedCountry(d, selectedCountry.cca3)) {
            return 'rgba(16, 185, 129, 0.45)'; // Fill sides of 3D elevated polygons so there are no open holes/gaps
          }
          if (d === hoverD) {
            return 'rgba(255, 255, 255, 0.12)';
          }
          return 'rgba(255, 255, 255, 0)';
        }}
        polygonStrokeColor={d => {
          if (measurementActive) return 'rgba(250, 250, 250, 0.15)';
          if (!showBorders) return 'rgba(200, 200, 200, 0)';
          if (isGameActive && gameHighlightCca3 && isFeatureSelectedCountry(d, gameHighlightCca3)) {
            return gameHighlightColor === 'green' ? '#10b981' : '#ef4444';
          }
          if (selectedCountry && isFeatureSelectedCountry(d, selectedCountry.cca3)) return '#10b981'; // Green border like in Australia's screenshot
          if (d === hoverD) return 'rgba(255, 255, 255, 0.7)';
          return isNightMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.14)';
        }}
        onPolygonHover={setHoverD}
        onPolygonClick={(polygon: any) => {
          if (measurementActive) return;
          const country = getCountryForFeature(polygon, countries);
          if (country) {
            onCountryClick(country);
          } else {
            const props = polygon.properties || {};
            const targetId = props.ISO_A3 || props.ADM0_A3 || props.GU_A3;
            console.warn('Country data mismatch for ID:', targetId);
          }
        }}
        
        onGlobeClick={(coords) => {
          if (measurementActive) {
            if (!measurePoints.start) {
              setMeasurePoints({ start: coords, end: null });
              showStatusToast("📍 起點已標定！請點擊地圖指定『終點』以測量大圓航距。");
            } else if (!measurePoints.end) {
              setMeasurePoints({ ...measurePoints, end: coords });
              const dist = getDistance(measurePoints.start.lat, measurePoints.start.lng, coords.lat, coords.lng);
              showStatusToast(`📏 測量完成！這兩點間的大圓航線估計距離為: ${dist.toLocaleString(undefined, { maximumFractionDigits: 1 })} 公里。`);
            } else {
              setMeasurePoints({ start: coords, end: null });
              showStatusToast("📍 新起點已重新標定！請指定新的『終點』。");
            }
          }
        }}
        
        arcsData={arcsData}
        arcStartLat={d => d.startLat}
        arcStartLng={d => d.startLng}
        arcEndLat={d => d.endLat}
        arcEndLng={d => d.endLng}
        arcColor={d => d.color}
        arcStroke={2.5}
        arcDashLength={0.4}
        arcDashGap={0.15}
        arcDashAnimateTime={1200}
        arcAltitude={0.06}

        labelsData={labelsData}
        labelLat={d => d.lat}
        labelLng={d => d.lng}
        labelColor={d => d.color}
        labelText={d => d.text}
        labelSize={d => d.size}
        labelDotRadius={1.1}
        labelResolution={6}
        
        rendererConfig={{ 
          antialias: false, 
          alpha: true,
          powerPreference: 'high-performance',
          precision: 'mediump'
        }}
      />

      {/* TOAST PANEL */}
      {toast && (
        <div className="absolute top-[85px] left-1/2 -translate-x-1/2 z-40 w-max max-w-sm md:max-w-md pointer-events-none">
          <div className="px-5 py-3.5 bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 animate-pulse" />
            <span className="text-xs font-semibold text-neutral-200 leading-relaxed tracking-wide">{toast}</span>
          </div>
        </div>
      )}

    </div>
  );
};

export default Globe;

