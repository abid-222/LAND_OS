import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Camera,
  FileCheck2,
  ChevronRight,
  ChevronLeft,
  X,
  AlertTriangle,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has already seen onboarding
    const seen = localStorage.getItem('landos_onboarding_seen');
    if (!seen && !isOpen) {
      // First run could auto trigger if requested
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFinish = () => {
    localStorage.setItem('landos_onboarding_seen', 'true');
    onClose();
  };

  const steps = [
    {
      icon: Sparkles,
      iconColor: 'text-emerald-400',
      title: 'LandOS কী এবং কীভাবে কাজ করে?',
      desc: 'LandOS হলো কৃত্রিম বুদ্ধিমত্তা সমৃদ্ধ একটি ডিজিটাল প্ল্যাটফর্ম। এটি আপনার দলিলের কিউআর কোড বা বাংলা দলিলের ছবি স্ক্যান করে দাগ, খতিয়ান, মৌজা ও নাম সরাসরি অনুসন্ধান করে এবং ভূমির রেকর্ড সমূহের তুলনামূলক বিশ্লেষণ প্রদর্শন করে।',
      tip: 'স্মার্ট স্ক্যান প্রযুক্তির মাধ্যমে এক ক্লিকেই জমি সম্পর্কিত সকল ঐতিহাসিক নথির সংযোগ খুঁজে পাবেন।',
    },
    {
      icon: Camera,
      iconColor: 'text-cyan-400',
      title: 'ক্যামেরা স্ক্যানের জরুরি টিপস',
      desc: 'দলিলের নির্ভুল অপটিক্যাল ক্যারেক্টার রিকগনিশন (OCR) নিশ্চিত করতে ক্যামেরা দলিলের উপর সোজাভাবে ধরুন। কোনো কোণাকুণি বা আঁকাবাঁকা শট পরিহার করুন।',
      tip: 'পর্যাপ্ত আলো ব্যবহার করুন। পৃষ্ঠার উপরে ছায়া বা মোবাইল ফ্ল্যাশের অতিরিক্ত প্রতিফলন এড়িয়ে চলুন।',
    },
    {
      icon: FileCheck2,
      iconColor: 'text-amber-400',
      title: 'ফলাফলের অর্থ ও আইনি সীমাবদ্ধতা',
      desc: 'সিস্টেমের ঝুঁকি নির্দেশক ও রিপোর্ট শুধুমাত্র ক্রেতা অনুসন্ধানের প্রাথমিক বিশ্লেষণের উদ্দেশ্যে তৈরি। সিস্টেম কখনো কোনো রায় দেয় না এবং মালিকানা বৈধ/অবৈধ ঘোষণা করে না।',
      tip: 'প্রদর্শিত তথ্য উদাহরণ মাত্র, আইনি সীমানা নয়। চূড়ান্ত জমি ক্রয়ের পূর্বে ভূমি অফিস ও যোগ্য আইনজীবীর পরামর্শ নিন।',
    },
  ];

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col">
        {/* Close Button */}
        <button
          onClick={handleFinish}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator dots */}
        <div className="flex gap-1.5 mb-6">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStep ? 'w-8 bg-emerald-400' : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4 shadow-xl">
            <CurrentIcon className={`w-8 h-8 ${steps[currentStep].iconColor}`} />
          </div>

          <h3 className="text-base font-bold text-white mb-2.5">
            {steps[currentStep].title}
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            {steps[currentStep].desc}
          </p>

          <div className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left flex items-start gap-2.5 text-[11px] text-emerald-300/90 mb-6">
            <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{steps[currentStep].tip}</span>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-3 pt-3 border-t border-slate-800">
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>পূর্ববর্তী</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="py-2.5 px-4 rounded-xl bg-primary hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 shadow-lg shadow-emerald-950/50"
            >
              <span>পরবর্তী</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-lg shadow-emerald-950/50"
            >
              <span>শুরু করুন</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
