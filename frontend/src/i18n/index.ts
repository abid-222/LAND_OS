import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  bn: {
    translation: {
      appName: 'বাংলাদেশ ল্যান্ডওএস',
      tagline: 'স্ক্যান-টু-সার্চ ডিজিটাল ভূমি সেবা ও দলিল গোয়েন্দা',
      systemStatus: 'সিস্টেম স্ট্যাটাস',
      liveness: 'লাইভনেস',
      readiness: 'সার্ভিস রেডিনেস',
      database: 'ডাটাবেজ সংযোগ',
      redis: 'রেডিস কিউ ও ক্যাশ',
      trustBadgesTitle: 'তথ্য বিশ্বস্ততা লেবেল (Epistemic Trust)',
      scanToSearch: 'দলিল বা খতিয়ান স্ক্যান করুন',
      disclaimerMap: 'প্রদর্শিত সীমানা শুধুমাত্র উদাহরণের জন্য / এটি কোনো আইনি সীমানা নয়',
      disclaimerSynthetic: 'প্রদর্শিত সকল রেকর্ড ও খতিয়ান ডেমো সিন্থেটিক ডাটা',
      navHome: 'হোম',
      navScan: 'স্ক্যান',
      navSearch: 'অনুসন্ধান',
      navGuide: 'ভূমি সহায়িকা',
      navNamjari: 'ই-নামজারি',
      navCases: 'মামলা',
      statusOnline: 'সক্রিয়',
      statusDegraded: 'আংশিক সচল',
      statusOffline: 'অফলাইন',
      roleCitizen: 'নাগরিক',
      roleStaff: 'ভূমি কর্মকর্তা',
      verifyRequired: 'তথ্য যাচাই প্রয়োজন',
      quickSearchPlaceholder: 'খতিয়ান নং বা দাগ নং লিখুন...',
      searchBtn: 'খুঁজুন',
    },
  },
  en: {
    translation: {
      appName: 'Bangladesh LandOS',
      tagline: 'Scan-to-Search Digital Land Service & Document Intelligence',
      systemStatus: 'System Status',
      liveness: 'Liveness',
      readiness: 'Service Readiness',
      database: 'Database Connection',
      redis: 'Redis Queue & Cache',
      trustBadgesTitle: 'Epistemic Trust Labels',
      scanToSearch: 'Scan Deed or Khatian Record',
      disclaimerMap: 'Illustrative / Not a legal boundary',
      disclaimerSynthetic: 'All records and parcels are synthetic demo data',
      navHome: 'Home',
      navScan: 'Scan',
      navSearch: 'Search',
      navGuide: 'AI Guide',
      navNamjari: 'E-Namjari',
      navCases: 'Cases',
      statusOnline: 'Operational',
      statusDegraded: 'Degraded',
      statusOffline: 'Offline',
      roleCitizen: 'Citizen',
      roleStaff: 'Land Officer',
      verifyRequired: 'Verification Required',
      quickSearchPlaceholder: 'Enter Khatian or Dag No...',
      searchBtn: 'Search',
    },
  },
};

const initialLng = (typeof window !== 'undefined' && localStorage.getItem('landos-lng')) || 'bn';

i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    localStorage.setItem('landos-lng', lng);
  });
}

export default i18n;
