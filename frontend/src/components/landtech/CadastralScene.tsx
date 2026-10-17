import React, { useState, useMemo } from 'react';
import './landtech.css';
import { Compass, Layers } from 'lucide-react';

export interface Parcel {
  id: string;
  label: string;
  area: string;
  status: 'verified' | 'review' | 'pending';
  points: string;
  center: [number, number];
  dag: string;
  mouza: string;
  owner?: string;
  khatian?: string;
  landType?: 'agri' | 'residential' | 'commercial' | 'water' | 'khas';
  landTypeNameBn?: string;
  surveyDistance?: string;
  disputeNote?: string;
}

export interface MouzaData {
  id: string;
  nameBn: string;
  nameEn: string;
  jlNo: string;
  sheetNo: string;
  thana: string;
  circle: string;
  district: string;
  coordinates: string;
  roadName: string;
  roadPoints: string;
  waterName: string;
  waterPoints: string;
  parcels: Parcel[];
}

export const MOUZA_REGISTRY: Record<string, MouzaData> = {
  DHANMONDI: {
    id: 'DHANMONDI',
    nameBn: 'ধানমন্ডি মৌজা',
    nameEn: 'Dhanmondi Mouza',
    jlNo: '২৯',
    sheetNo: '০৪',
    thana: 'ধানমন্ডি',
    circle: 'ধানমন্ডি রাজস্ব সার্কেল',
    district: 'ঢাকা',
    coordinates: "23° 44' 45\" N, 90° 22' 30\" E",
    roadName: 'মিরপুর রোড ও রোড ২৭ এভিনিউ (৮০ ফুট)',
    roadPoints: 'M 20 180 Q 150 145 230 155 T 390 125',
    waterName: 'ধানমন্ডি লেক সংযোগ খাল (Dhanmondi Lake Link)',
    waterPoints: 'M 10 35 Q 110 55 190 40 T 390 48',
    parcels: [
      {
        id: 'P-DHAN-4101',
        label: 'দাগ নং ৪১০১ (আবাসিক ভিটি)',
        area: '৫.১০ শতক',
        status: 'verified',
        points: '55,55 155,42 185,108 85,122',
        center: [120, 81],
        dag: '৪১০১',
        mouza: 'ধানমন্ডি',
        owner: 'বেগম রোকেয়া রহমান',
        khatian: '৩১২/আরএস',
        landType: 'residential',
        landTypeNameBn: 'আবাসিক ভিটি',
        surveyDistance: '১১০ ফুট × ৮৫ ফুট',
      },
      {
        id: 'P-DHAN-4102',
        label: 'দাগ নং ৪১০২ (বাণিজ্যিক প্লট)',
        area: '৭.৮০ শতক',
        status: 'verified',
        points: '162,40 272,30 298,96 192,106',
        center: [231, 68],
        dag: '৪১০২',
        mouza: 'ধানমন্ডি',
        owner: 'ড্যাফোডিল এডুকেশন ট্রাস্ট',
        khatian: '৯৮৫/বিএস',
        landType: 'commercial',
        landTypeNameBn: 'বাণিজ্যিক প্লট',
        surveyDistance: '১৪০ ফুট × ৯৫ ফুট',
      },
      {
        id: 'P-DHAN-4103',
        label: 'দাগ নং ৪১০৩ (লেকভিউ রেসিডেন্সিয়াল)',
        area: '৪.৫০ শতক',
        status: 'verified',
        points: '278,32 375,44 388,102 304,96',
        center: [336, 68],
        dag: '৪১০৩',
        mouza: 'ধানমন্ডি',
        owner: 'প্রফেসর ড. আনিসুজ্জামান',
        khatian: '১১৪/সিএস',
        landType: 'residential',
        landTypeNameBn: 'লেকভিউ আবাসিক',
        surveyDistance: '৮৫ ফুট × ৭৫ ফুট',
      },
      {
        id: 'P-DHAN-4104',
        label: 'দাগ নং ৪১০৪ (বিতর্কিত খাস জমি)',
        area: '৩.২০ শতক',
        status: 'review',
        points: '88,128 190,114 218,176 112,192',
        center: [152, 152],
        dag: '৪১০৪',
        mouza: 'ধানমন্ডি',
        owner: 'গণপূর্ত অধিদপ্তর বনাম ব্যক্তি মালিকানা',
        khatian: '০১/খাস',
        landType: 'khas',
        landTypeNameBn: 'বিতর্কিত সরকারি খাস',
        surveyDistance: '৭০ ফুট × ৬৫ ফুট',
        disputeNote: 'সরকারি খাস জমি চিহ্নিতকরণ ও অবৈধ দখলের অভিযোগের শুনানি বিচারাধীন।',
      },
      {
        id: 'P-DHAN-4105',
        label: 'দাগ নং ৪১০৫ (ঐতিহ্যবাহী পুকুর)',
        area: '৬.২০ শতক',
        status: 'pending',
        points: '224,112 334,104 358,168 244,180',
        center: [290, 141],
        dag: '৪১০৫',
        mouza: 'ধানমন্ডি',
        owner: 'ধানমন্ডি ঐতিহ্য সংরক্ষণ কমিটি',
        khatian: '৭২১/আরএস',
        landType: 'water',
        landTypeNameBn: 'পুকুর ও জলাশয়',
        surveyDistance: '১২০ ফুট × ৮০ ফুট',
      },
    ],
  },
  TEJGAON: {
    id: 'TEJGAON',
    nameBn: 'তেজগাঁও শিল্প এলাকা মৌজা',
    nameEn: 'Tejgaon Industrial Area',
    jlNo: '১৪',
    sheetNo: '০১',
    thana: 'তেজগাঁও',
    circle: 'তেজগাঁও সার্কেল',
    district: 'ঢাকা',
    coordinates: "23° 45' 50\" N, 90° 23' 40\" E",
    roadName: 'শহীদ তাজউদ্দীন আহমদ সরণি (১০০ ফুট)',
    roadPoints: 'M 15 170 Q 140 160 240 145 T 395 130',
    waterName: 'বেগুনবাড়ি খাল ডাইভারশন (Begunbari Canal)',
    waterPoints: 'M 10 40 Q 120 28 220 42 T 390 32',
    parcels: [
      {
        id: 'P-4520',
        label: 'দাগ নং ১২০৫ (তেজগাঁও প্লট)',
        area: '১২.৫০ শতক',
        status: 'verified',
        points: '60,52 175,40 205,108 90,122',
        center: [132, 80],
        dag: '১২০৫',
        mouza: 'তেজগাঁও শিল্প এলাকা',
        owner: 'প্রগতি অটোমোবাইলস লিঃ',
        khatian: '৩৪০/বিএস',
        landType: 'commercial',
        landTypeNameBn: 'শিল্প কারখানা ও গুদাম',
        surveyDistance: '২০০ ফুট × ১১০ ফুট',
      },
      {
        id: 'P-SMOKE-CONFLICT',
        label: 'দাগ নং ১২৩৪ (রেলওয়ে বাফার জোন)',
        area: '৮.২০ শতক',
        status: 'review',
        points: '182,38 290,44 316,104 212,108',
        center: [250, 73],
        dag: '১২৩৪',
        mouza: 'তেজগাঁও শিল্প এলাকা',
        owner: 'বাংলাদেশ রেলওয়ে বনাম করিম টেক্সটাইল',
        khatian: '৫১২/আরএস',
        landType: 'khas',
        landTypeNameBn: 'রেলওয়ে অধিগ্রহণ বাফার',
        surveyDistance: '১৫০ ফুট × ৯৫ ফুট',
        disputeNote: 'রেলওয়ে নিরাপত্তা করিডোরে ২.১ শতক সীমানা অনুপ্রবেশের ঝুঁকি শনাক্ত হয়েছে।',
      },
      {
        id: 'P-TEJ-1235',
        label: 'দাগ নং ১২৩৫ (বাণিজ্যিক শোরুম)',
        area: '৭.১০ শতক',
        status: 'verified',
        points: '95,128 208,114 235,178 120,195',
        center: [164, 153],
        dag: '১২৩৫',
        mouza: 'তেজগাঁও শিল্প এলাকা',
        owner: 'স্টার সিরামিকস কর্পোরেশন',
        khatian: '৮৮৯/বিএস',
        landType: 'commercial',
        landTypeNameBn: 'বাণিজ্যিক কমপ্লেক্স',
        surveyDistance: '১৩০ ফুট × ৮৮ ফুট',
      },
      {
        id: 'P-TEJ-1236',
        label: 'দাগ নং ১২৩৬ (এভিনিউ ফ্রন্ট)',
        area: '৯.৬০ শতক',
        status: 'verified',
        points: '215,114 328,106 358,170 242,180',
        center: [285, 142],
        dag: '১২৩৬',
        mouza: 'তেজগাঁও শিল্প এলাকা',
        owner: 'বেঙ্গল ফুডস অ্যান্ড বেভারেজ',
        khatian: '৪২০/আরএস',
        landType: 'commercial',
        landTypeNameBn: 'কর্পোরেট প্রধান কার্যালয়',
        surveyDistance: '১৬০ ফুট × ১০০ ফুট',
      },
    ],
  },
  GULSHAN: {
    id: 'GULSHAN',
    nameBn: 'গুলশান ও বাড্ডা সার্কেল',
    nameEn: 'Gulshan-Badda Circle',
    jlNo: '০৮',
    sheetNo: '০২',
    thana: 'গুলশান',
    circle: 'গুলশান রাজস্ব সার্কেল',
    district: 'ঢাকা',
    coordinates: "23° 47' 30\" N, 90° 24' 50\" E",
    roadName: 'গুলশান এভিনিউ ও মাদানী এভিনিউ (১২০ ফুট)',
    roadPoints: 'M 15 140 Q 130 155 240 160 T 395 165',
    waterName: 'গুলশান লেক ও বাড্ডা সংযোগ খাল (Gulshan Lake)',
    waterPoints: 'M 10 32 Q 130 45 250 35 T 390 42',
    parcels: [
      {
        id: 'P-1088',
        label: 'দাগ নং ৩৪০১ (কূটনৈতিক জোন সংলগ্ন)',
        area: '৮.৪০ শতক',
        status: 'verified',
        points: '50,48 165,38 195,102 78,115',
        center: [122, 75],
        dag: '৩৪০১',
        mouza: 'গুলশান ও বাড্ডা',
        owner: 'এম. এ. লতিফ মেমোরিয়াল ট্রাস্ট',
        khatian: '১০৮/বিএস',
        landType: 'residential',
        landTypeNameBn: 'কূটনৈতিক আবাসিক প্লট',
        surveyDistance: '১৪৫ ফুট × ৯০ ফুট',
      },
      {
        id: 'P-GUL-3402',
        label: 'দাগ নং ৩৪০২ (লেকভিউ গার্ডেন)',
        area: '৬.৭০ শতক',
        status: 'verified',
        points: '172,36 280,30 306,95 202,102',
        center: [240, 65],
        dag: '৩৪০২',
        mouza: 'গুলশান ও বাড্ডা',
        owner: 'মিসেস শামসুন্নাহার চৌধুরী',
        khatian: '৪৫২/আরএস',
        landType: 'residential',
        landTypeNameBn: 'লেকভিউ রেসিডেন্সিয়াল',
        surveyDistance: '১১০ ফুট × ৮৫ ফুট',
      },
      {
        id: 'P-GUL-3403',
        label: 'দাগ নং ৩৪০৩ (লিংক রোড কর্নার)',
        area: '৫.২০ শতক',
        status: 'verified',
        points: '82,120 198,106 226,170 110,185',
        center: [154, 145],
        dag: '৩৪০৩',
        mouza: 'গুলশান ও বাড্ডা',
        owner: 'নর্থএন্ড ক্যাফে প্রোপার্টিজ',
        khatian: '৭৭৩/বিএস',
        landType: 'commercial',
        landTypeNameBn: 'বাণিজ্যিক কর্নার প্লট',
        surveyDistance: '৯৫ ফুট × ৮০ ফুট',
      },
      {
        id: 'P-GUL-3404',
        label: 'দাগ নং ৩৪০৪ (বাড্ডা খাল জলাধার বাফার)',
        area: '৪.৯০ শতক',
        status: 'review',
        points: '205,106 318,100 345,164 232,172',
        center: [275, 135],
        dag: '৩৪০৪',
        mouza: 'গুলশান ও বাড্ডা',
        owner: 'রাজউক ওয়াটার রিটেনশন রিজার্ভ',
        khatian: '০০০/রাজউক',
        landType: 'water',
        landTypeNameBn: 'জলাধার সংরক্ষণ বাফার',
        surveyDistance: '৯০ ফুট × ৭৫ ফুট',
        disputeNote: 'জলাধার ভরাট নিষেধাজ্ঞা অনুযায়ী প্লটটির সীমানা জরিপ যাচাইাধীন।',
      },
    ],
  },
  PURBACHAL: {
    id: 'PURBACHAL',
    nameBn: 'পূর্বাচল স্মার্ট সিটি মৌজা',
    nameEn: 'Purbachal Smart City',
    jlNo: '৫৫',
    sheetNo: '১৭',
    thana: 'রূপগঞ্জ',
    circle: 'পূর্বাচল সেক্টর ১৭',
    district: 'নারায়ণগঞ্জ / ঢাকা',
    coordinates: "23° 49' 20\" N, 90° 30' 15\" E",
    roadName: '৩০০ ফুট বঙ্গবন্ধু ট্রাই-এক্সপ্রেসওয়ে (Expressway)',
    roadPoints: 'M 15 175 Q 160 165 260 150 T 395 135',
    waterName: 'পূর্বাচল সেন্ট্রাল ইকোলজিক্যাল লেক (Central Lake)',
    waterPoints: 'M 10 38 Q 120 50 240 36 T 390 44',
    parcels: [
      {
        id: 'P-PUR-7801',
        label: 'দাগ নং ৭৮০১ (রাজউক স্মার্ট প্লট)',
        area: '১০.০০ শতক',
        status: 'verified',
        points: '55,54 165,42 195,110 85,124',
        center: [125, 82],
        dag: '৭৮০১',
        mouza: 'পূর্বাচল স্মার্ট সিটি',
        owner: 'প্রকৌশলী মাহবুবুল আলম',
        khatian: '৯০০১/রাজউক',
        landType: 'residential',
        landTypeNameBn: 'রাজউক অনুমোদিত স্মার্ট আবাসিক',
        surveyDistance: '১৮০ ফুট × ১০৫ ফুট',
      },
      {
        id: 'P-PUR-7802',
        label: 'দাগ নং ৭৮০২ (গ্রিন ইকোলজিক্যাল পার্ক)',
        area: '৭.৫০ শতক',
        status: 'verified',
        points: '172,40 282,32 308,98 202,110',
        center: [241, 70],
        dag: '৭৮০২',
        mouza: 'পূর্বাচল স্মার্ট সিটি',
        owner: 'পূর্বাচল স্পোর্টস অ্যান্ড ইকোলজি একাডেমি',
        khatian: '৮৮১২/বিএস',
        landType: 'agri',
        landTypeNameBn: 'ইকো পার্ক ও উন্মুক্ত স্থান',
        surveyDistance: '১৩০ ফুট × ৯৫ ফুট',
      },
      {
        id: 'P-PUR-7803',
        label: 'দাগ নং ৭৮০৩ (সেন্ট্রাল বুলভার্ড)',
        area: '৯.০০ শতক',
        status: 'verified',
        points: '90,130 205,116 234,180 118,196',
        center: [161, 155],
        dag: '৭৮০৩',
        mouza: 'পূর্বাচল স্মার্ট সিটি',
        owner: 'মেঘনা টেকনোলজিস পার্ক লিঃ',
        khatian: '৯০৫২/বিএস',
        landType: 'commercial',
        landTypeNameBn: 'আইটি ও কমার্শিয়াল হাব',
        surveyDistance: '১৫৫ ফুট × ১০০ ফুট',
      },
      {
        id: 'P-PUR-7804',
        label: 'দাগ নং ৭৮০৪ (বন্যা নিষ্কাশন গ্রিন বেল্ট)',
        area: '৬.২০ শতক',
        status: 'pending',
        points: '212,116 325,108 354,172 240,182',
        center: [282, 144],
        dag: '৭৮০৪',
        mouza: 'পূর্বাচল স্মার্ট সিটি',
        owner: 'বাংলাদেশ পানি উন্নয়ন বোর্ড (পাউবো)',
        khatian: '০২/পাউবো',
        landType: 'khas',
        landTypeNameBn: 'বন্যা নিষ্কাশন অঞ্চল',
        surveyDistance: '১২০ ফুট × ৮০ ফুট',
      },
    ],
  },
  MIRPUR: {
    id: 'MIRPUR',
    nameBn: 'মিরপুর ও পল্লবী মৌজা',
    nameEn: 'Mirpur Pallabi Mouza',
    jlNo: '৪১',
    sheetNo: '০৭',
    thana: 'পল্লবী',
    circle: 'মিরপুর রাজস্ব সার্কেল',
    district: 'ঢাকা',
    coordinates: "23° 49' 15\" N, 90° 21' 55\" E",
    roadName: 'কালশী রোড ও পল্লবী মেইন এভিনিউ (৯০ ফুট)',
    roadPoints: 'M 15 155 Q 140 170 250 160 T 395 150',
    waterName: 'বাউনিয়া খাল ড্রেনেজ চ্যানেল (Baunia Drainage)',
    waterPoints: 'M 10 35 Q 110 46 220 38 T 390 40',
    parcels: [
      {
        id: 'P-9901',
        label: 'দাগ নং ৫৬৭৮ (পল্লবী আবাসিক)',
        area: '৫.১০ শতক',
        status: 'pending',
        points: '55,50 165,38 194,104 84,116',
        center: [124, 77],
        dag: '৫৬৭৮',
        mouza: 'মিরপুর ও পল্লবী',
        owner: 'মোঃ রফিকুল ইসলাম',
        khatian: '৬৫৪/আরএস',
        landType: 'residential',
        landTypeNameBn: 'পল্লবী আবাসিক প্লট',
        surveyDistance: '১০০ ফুট × ৮৫ ফুট',
      },
      {
        id: 'P-MIR-5679',
        label: 'দাগ নং ৫৬৭৯ (ডিওএইচএস সংলগ্ন)',
        area: '৬.৩০ শতক',
        status: 'verified',
        points: '172,36 280,30 306,94 202,104',
        center: [240, 66],
        dag: '৫৬৭৯',
        mouza: 'মিরপুর ও পল্লবী',
        owner: 'লেঃ কর্নেল (অবঃ) এম এ জামান',
        khatian: '২১২/বিএস',
        landType: 'residential',
        landTypeNameBn: 'ডিওএইচএস প্রাচীর সংলগ্ন প্লট',
        surveyDistance: '১১০ ফুট × ৮৫ ফুট',
      },
      {
        id: 'P-MIR-5680',
        label: 'দাগ নং ৫৬৮০ (কালশী রোড ফ্রন্ট)',
        area: '৪.৪০ শতক',
        status: 'verified',
        points: '88,122 202,110 230,174 115,188',
        center: [158, 148],
        dag: '৫৬৮০',
        mouza: 'মিরপুর ও পল্লবী',
        owner: 'হাজী আবুল বাশার এস্টেট',
        khatian: '৯৮১/বিএস',
        landType: 'commercial',
        landTypeNameBn: 'কালশী রোড বাণিজ্যিক প্লট',
        surveyDistance: '৯০ ফুট × ৭৬ ফুট',
      },
      {
        id: 'P-MIR-5681',
        label: 'দাগ নং ৫৬৮১ (সংরক্ষিত ঐতিহাসিক পুকুর)',
        area: '৮.০০ শতক',
        status: 'review',
        points: '210,110 322,104 350,168 238,176',
        center: [280, 139],
        dag: '৫৬৮১',
        mouza: 'মিরপুর ও পল্লবী',
        owner: 'ঢাকা উত্তর সিটি কর্পোরেশন (ডিএনসিসি)',
        khatian: '০১/ডিএনসিসি',
        landType: 'water',
        landTypeNameBn: 'ঐতিহাসিক সংরক্ষিত পুকুর',
        surveyDistance: '১৫০ ফুট × ৯২ ফুট',
        disputeNote: 'প্রাকৃতিক জলাধার সংরক্ষণ আইন ২০০০ এর অধীনে প্লটটি সুরক্ষার আওতাভুক্ত।',
      },
    ],
  },
};

export const defaultDemoParcels: Parcel[] = MOUZA_REGISTRY.TEJGAON.parcels;

interface CadastralSceneProps {
  parcels?: Parcel[];
  selectedId: string;
  onSelect: (id: string) => void;
  scanning?: boolean;
  className?: string;
  activeMouzaId?: string;
  onMouzaChange?: (mouzaId: string) => void;
  allowAreaSwitching?: boolean;
}

export const CadastralScene: React.FC<CadastralSceneProps> = ({
  selectedId,
  onSelect,
  scanning = true,
  className = '',
  activeMouzaId = 'TEJGAON',
  onMouzaChange,
  allowAreaSwitching = true,
}) => {
  const [internalMouzaId, setInternalMouzaId] = useState<string>(activeMouzaId);
  const [viewMode, setViewMode] = useState<'cadastral' | 'satellite' | 'dispute'>('cadastral');
  const [tiltAngle, setTiltAngle] = useState<'isometric' | 'drone' | 'ortho'>('isometric');
  const [showRoads, setShowRoads] = useState<boolean>(true);
  const [showWater, setShowWater] = useState<boolean>(true);
  const [showPillars, setShowPillars] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  const currentMouzaKey = activeMouzaId || internalMouzaId;
  const currentMouza = MOUZA_REGISTRY[currentMouzaKey] || MOUZA_REGISTRY.TEJGAON;
  const currentParcels = currentMouza.parcels;

  const handleAreaSelect = (mouzaKey: string) => {
    setInternalMouzaId(mouzaKey);
    if (onMouzaChange) {
      onMouzaChange(mouzaKey);
    }
    const newMouza = MOUZA_REGISTRY[mouzaKey];
    if (newMouza && newMouza.parcels.length > 0) {
      onSelect(newMouza.parcels[0].id);
    }
  };

  const selectedParcel = useMemo(() => {
    return currentParcels.find((p) => p.id === selectedId) || currentParcels[0];
  }, [currentParcels, selectedId]);

  const perspectiveClass =
    tiltAngle === 'isometric'
      ? 'tilt-isometric'
      : tiltAngle === 'drone'
      ? 'tilt-drone'
      : 'tilt-ortho';

  return (
    <div className={`lt-scene-wrapper ${className}`}>
      {/* Top Banner: Authentic Bangladesh Mouza Sheet Banner */}
      <div className="lt-mouza-header-strip">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-extrabold text-emerald-300 tracking-wider uppercase">
            গণপ্রজাতন্ত্রী বাংলাদেশ সরকার • ভূমি রেকর্ড ও জরিপ অধিদপ্তর
          </span>
        </div>
        <div className="text-[10px] font-mono text-slate-300">
          জে.এল নং: <b className="text-white font-bold">{currentMouza.jlNo}</b> • সিট নং:{' '}
          <b className="text-white font-bold">{currentMouza.sheetNo}</b> • সার্কেল:{' '}
          <b className="text-emerald-400 font-bold">{currentMouza.circle}</b>
        </div>
      </div>

      {/* Interactive Controls Bar: Mouza Selector & View Modes */}
      {allowAreaSwitching && (
        <div className="lt-mouza-selector-bar">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-400" /> এলাকা:
            </span>
            {Object.keys(MOUZA_REGISTRY).map((key) => {
              const m = MOUZA_REGISTRY[key];
              const isActive = m.id === currentMouza.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleAreaSelect(m.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 border ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md shadow-emerald-500/20'
                      : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/60'
                  }`}
                >
                  {m.nameBn.split(' ')[0]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-black/60 rounded-lg p-0.5 border border-slate-700/60 text-[10px]">
              <button
                onClick={() => setViewMode('cadastral')}
                className={`px-2 py-0.5 rounded font-bold transition-colors ${
                  viewMode === 'cadastral' ? 'bg-amber-600/90 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Cadastral Mouza Survey Map"
              >
                নকশা
              </button>
              <button
                onClick={() => setViewMode('satellite')}
                className={`px-2 py-0.5 rounded font-bold transition-colors ${
                  viewMode === 'satellite' ? 'bg-emerald-600/90 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Satellite Ortho GIS"
              >
                উপগ্রহ
              </button>
              <button
                onClick={() => setViewMode('dispute')}
                className={`px-2 py-0.5 rounded font-bold transition-colors ${
                  viewMode === 'dispute' ? 'bg-rose-600/90 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Dispute Heatmap Radar"
              >
                বিরোধ স্ক্যান
              </button>
            </div>

            {/* 3D Tilt Selector */}
            <div className="flex items-center bg-black/60 rounded-lg p-0.5 border border-slate-700/60 text-[10px]">
              <button
                onClick={() => setTiltAngle('isometric')}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  tiltAngle === 'isometric' ? 'bg-slate-700 text-white' : 'text-slate-400'
                }`}
                title="3D Isometric View"
              >
                3D
              </button>
              <button
                onClick={() => setTiltAngle('drone')}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  tiltAngle === 'drone' ? 'bg-slate-700 text-white' : 'text-slate-400'
                }`}
                title="Drone Aerial View"
              >
                ড্রোণ
              </button>
              <button
                onClick={() => setTiltAngle('ortho')}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  tiltAngle === 'ortho' ? 'bg-slate-700 text-white' : 'text-slate-400'
                }`}
                title="Ortho Flat View"
              >
                ২ডি
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main 3D Canvas Box */}
      <div
        className={`lt-scene ${perspectiveClass} ${
          viewMode === 'cadastral'
            ? 'theme-cadastral'
            : viewMode === 'satellite'
            ? 'theme-satellite'
            : 'theme-dispute'
        }`}
        aria-label={`3D Map for ${currentMouza.nameBn}`}
      >
        {/* Cadastral Topo Background Grid */}
        <div className="lt-scene-grid" aria-hidden="true" />
        <div className="lt-scene-orbit lt-orbit-one" aria-hidden="true" />
        <div className="lt-scene-orbit lt-orbit-two" aria-hidden="true" />

        {/* HUD Elements */}
        <div className="lt-map-float-label lt-label-north">
          <span>↑</span>
          <div>
            <div className="font-bold text-slate-200">NORTH 3D GIS</div>
            <div className="text-[7px] text-emerald-400 font-mono">মৌজা: {currentMouza.nameBn}</div>
          </div>
        </div>

        <div className="lt-map-float-label lt-label-scale">
          <div className="text-right">
            <span className="text-emerald-400 font-bold">১৬" = ১ মাইল</span>
            <div className="text-[7px] text-slate-400">CADASTRAL RADAR V4</div>
          </div>
        </div>

        {/* 3D Map SVG Scene */}
        <svg
          className="lt-parcel-svg"
          viewBox="0 0 410 235"
          role="group"
          aria-label="Select a cadastral parcel"
        >
          <defs>
            {/* Cadastral Survey Land Gradients (Natural, Authentic Colors) */}
            <linearGradient id="cadastralAgri" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#2d5236" />
              <stop offset="100%" stopColor="#1a3521" />
            </linearGradient>

            <linearGradient id="cadastralResidential" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#433b2e" />
              <stop offset="100%" stopColor="#2b241c" />
            </linearGradient>

            <linearGradient id="cadastralCommercial" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#263a48" />
              <stop offset="100%" stopColor="#17242e" />
            </linearGradient>

            <linearGradient id="cadastralWater" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#0c4a6e" />
            </linearGradient>

            <linearGradient id="cadastralKhas" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>

            {/* Selected Glow Filter */}
            <filter id="ltGlowSelect">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pattern: Survey Hatching for Khas / Disputed Lands */}
            <pattern id="surveyHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />
            </pattern>
          </defs>

          {/* Water canal / Khal spline */}
          {showWater && (
            <g className="lt-waterway-group">
              <path
                d={currentMouza.waterPoints}
                className="lt-waterway-path"
                stroke="#0284c7"
                strokeWidth="14"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d={currentMouza.waterPoints}
                className="lt-waterway-flow"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="12 8"
                strokeLinecap="round"
                fill="none"
              />
              <text x="200" y="34" className="lt-waterway-label font-bold">
                🌊 {currentMouza.waterName}
              </text>
            </g>
          )}

          {/* Paved Road / Highway Network */}
          {showRoads && (
            <g className="lt-road-group">
              <path
                d={currentMouza.roadPoints}
                className="lt-road-bed"
                stroke="#1e293b"
                strokeWidth="18"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d={currentMouza.roadPoints}
                className="lt-road-curb"
                stroke="#475569"
                strokeWidth="18"
                strokeDasharray="4 4"
                strokeLinecap="round"
                fill="none"
                opacity="0.3"
              />
              <path
                d={currentMouza.roadPoints}
                className="lt-road-centerline"
                stroke="#facc15"
                strokeWidth="1.6"
                strokeDasharray="8 6"
                fill="none"
              />
              <text x="180" y="168" className="lt-road-label font-bold">
                🛣️ {currentMouza.roadName}
              </text>
            </g>
          )}

          {/* Render All Cadastral Parcels */}
          {currentParcels.map((parcel) => {
            const selected = parcel.id === selectedId;
            const [cx, cy] = parcel.center;

            // Pick gradient based on land use
            let fillGrad = 'url(#cadastralAgri)';
            if (parcel.landType === 'residential') fillGrad = 'url(#cadastralResidential)';
            if (parcel.landType === 'commercial') fillGrad = 'url(#cadastralCommercial)';
            if (parcel.landType === 'water') fillGrad = 'url(#cadastralWater)';
            if (parcel.landType === 'khas') fillGrad = 'url(#cadastralKhas)';

            // Status border styling
            const statusColor =
              parcel.status === 'verified'
                ? '#10b981'
                : parcel.status === 'review'
                ? '#f59e0b'
                : '#64748b';

            return (
              <g
                key={parcel.id}
                className={`lt-parcel ${selected ? 'is-selected' : ''}`}
                onClick={() => onSelect(parcel.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelect(parcel.id);
                }}
                role="button"
                tabIndex={0}
                aria-label={`Select ${parcel.label}`}
              >
                {/* 3D Extruded Depth Side */}
                <polygon
                  points={parcel.points}
                  transform="translate(0 14)"
                  className="lt-parcel-side-extrude"
                  fill="#0a120e"
                  stroke={statusColor}
                  strokeWidth="0.8"
                  opacity="0.8"
                />

                {/* Main Parcel Top Face */}
                <polygon
                  points={parcel.points}
                  fill={fillGrad}
                  className="lt-parcel-top"
                  stroke={statusColor}
                  strokeWidth={selected ? 2.8 : 1.4}
                />

                {/* Dispute / Warning Hatch if in review */}
                {parcel.status === 'review' && (
                  <polygon points={parcel.points} fill="url(#surveyHatch)" opacity="0.45" />
                )}

                {/* Subtle sheen highlight */}
                <polygon points={parcel.points} className="lt-parcel-shine" />

                {/* Selected Pulse Ring */}
                {selected && (
                  <polygon
                    points={parcel.points}
                    className="lt-parcel-highlight"
                    stroke="#10b981"
                    filter="url(#ltGlowSelect)"
                  />
                )}

                {/* Center Coordinates & Dag Pill */}
                {showPillars && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={selected ? 5 : 3}
                    fill={statusColor}
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    className="lt-parcel-point"
                  />
                )}

                {/* Dag Number Badge */}
                {showLabels && (
                  <g className="lt-dag-badge" transform={`translate(${cx}, ${cy - 8})`}>
                    <rect
                      x="-28"
                      y="-12"
                      width="56"
                      height="15"
                      rx="4"
                      fill="#04080c"
                      stroke={statusColor}
                      strokeWidth="1"
                      opacity="0.9"
                    />
                    <text
                      x="0"
                      y="-1"
                      className="lt-dag-text font-bold"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontFamily="Inter, 'Noto Sans Bengali', sans-serif"
                    >
                      দাগ {parcel.dag}
                    </text>
                  </g>
                )}

                {/* Measurement Chain Label if Selected */}
                {selected && parcel.surveyDistance && (
                  <text
                    x={cx}
                    y={cy + 16}
                    className="lt-survey-distance font-mono"
                    textAnchor="middle"
                    fill="#a7f3d0"
                    fontSize="7.5"
                  >
                    📏 {parcel.surveyDistance}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Live Laser Sweep Line */}
        {scanning && <div className="lt-scan-line" aria-hidden="true" />}

        {/* Bottom Coordinates & Metadata Chip */}
        <div className="lt-map-coordinates">
          <span>{currentMouza.coordinates}</span>
          <span className="text-emerald-400 font-bold">• মৌজা কোড: {currentMouza.jlNo}</span>
        </div>

        <div className="lt-map-side-chip">
          <span className="lt-pulse-dot" />
          দাগ সংখ্যা: <b>{currentParcels.length} টি প্লট</b>
        </div>
      </div>

      {/* Layer Toggle Quick Bar */}
      <div className="lt-layer-toggle-strip">
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="font-bold text-slate-300 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" /> লেয়ার:
          </span>
          <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={showRoads}
              onChange={(e) => setShowRoads(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-0"
            />
            <span>পাকা রাস্তা</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={showWater}
              onChange={(e) => setShowWater(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-0"
            />
            <span>খাল ও জলাশয়</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={showPillars}
              onChange={(e) => setShowPillars(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-0"
            />
            <span>সীমানা পিলার (⚲)</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-0"
            />
            <span>দাগ নম্বর</span>
          </label>
        </div>

        {/* Selected plot quick feedback badge */}
        <div className="text-[11px] font-bold text-slate-300 flex items-center gap-2">
          <span>নির্বাচিত:</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono">
            {selectedParcel.dag} ({selectedParcel.landTypeNameBn || selectedParcel.area})
          </span>
        </div>
      </div>
    </div>
  );
};
