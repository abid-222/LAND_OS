"""
Bengali Geographic, Cadastral, and Entity Dictionaries for Synthetic Generation.
"""

# 40 Fictional-but-plausible mouzas across major upazilas
MOUZAS = [
    # Dhaka - Tejgaon & Gulshan
    {"jl_no": "০১", "name_bn": "কাওরান বাজার", "name_en": "Kawran Bazar", "upazila": "Tejgaon", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "০৪", "name_bn": "তেজগাঁও শিল্পাঞ্চল", "name_en": "Tejgaon I/A", "upazila": "Tejgaon", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "০৮", "name_bn": "মহাখালী", "name_en": "Mohakhali", "upazila": "Gulshan", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "১২", "name_bn": "বাড্ডা উত্তর", "name_en": "Badda North", "upazila": "Gulshan", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "১৫", "name_bn": "ভাটারা", "name_en": "Vatara", "upazila": "Gulshan", "district": "Dhaka", "division": "Dhaka"},

    # Dhaka - Mirpur & Mohammadpur
    {"jl_no": "১৮", "name_bn": "পাইকপাড়া", "name_en": "Paikpara", "upazila": "Mirpur", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "২১", "name_bn": "সেনপাড়া পর্বতা", "name_en": "Senpara Parbata", "upazila": "Mirpur", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "২৫", "name_bn": "কাফরুল", "name_en": "Kafrul", "upazila": "Mirpur", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "২৮", "name_bn": "জাফরাবাদ", "name_en": "Jafrabad", "upazila": "Mohammadpur", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "৩২", "name_bn": "সুলতানগঞ্জ", "name_en": "Sultanganj", "upazila": "Mohammadpur", "district": "Dhaka", "division": "Dhaka"},

    # Dhaka - Savar & Dhamrai
    {"jl_no": "৩৫", "name_bn": "হেমায়েতপুর", "name_en": "Hemayetpur", "upazila": "Savar", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "৩৯", "name_bn": "বিরুলিয়া", "name_en": "Birulia", "upazila": "Savar", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "৪২", "name_bn": "আশুলিয়া", "name_en": "Ashulia", "upazila": "Savar", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "৪৬", "name_bn": "কুশুরা", "name_en": "Kushura", "upazila": "Dhamrai", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "৪৯", "name_bn": "সোমভাগ", "name_en": "Sombhag", "upazila": "Dhamrai", "district": "Dhaka", "division": "Dhaka"},

    # Dhaka - Keraniganj
    {"jl_no": "৫৩", "name_bn": "জিনজিরা", "name_en": "Zinzira", "upazila": "Keraniganj", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "৫৭", "name_bn": "তারানগর", "name_en": "Taranagar", "upazila": "Keraniganj", "district": "Dhaka", "division": "Dhaka"},
    {"jl_no": "৬০", "name_bn": "রোহিতপুর", "name_en": "Rohitpur", "upazila": "Keraniganj", "district": "Dhaka", "division": "Dhaka"},

    # Gazipur - Sadar & Sreepur
    {"jl_no": "০৩", "name_bn": "জয়দেবপুর", "name_en": "Joydebpur", "upazila": "Gazipur Sadar", "district": "Gazipur", "division": "Dhaka"},
    {"jl_no": "০৭", "name_bn": "চান্দনা", "name_en": "Chandana", "upazila": "Gazipur Sadar", "district": "Gazipur", "division": "Dhaka"},
    {"jl_no": "১১", "name_bn": "সালনা", "name_en": "Salna", "upazila": "Gazipur Sadar", "district": "Gazipur", "division": "Dhaka"},
    {"jl_no": "১৬", "name_bn": "মাওনা", "name_en": "Mawna", "upazila": "Sreepur", "district": "Gazipur", "division": "Dhaka"},
    {"jl_no": "১৯", "name_bn": "গোসিংগা", "name_en": "Gosinga", "upazila": "Sreepur", "district": "Gazipur", "division": "Dhaka"},

    # Gazipur - Kaliakair
    {"jl_no": "২২", "name_bn": "সফিপুর", "name_en": "Sofipur", "upazila": "Kaliakair", "district": "Gazipur", "division": "Dhaka"},
    {"jl_no": "২৬", "name_bn": "চন্দ্রা", "name_en": "Chandra", "upazila": "Kaliakair", "district": "Gazipur", "division": "Dhaka"},
    {"jl_no": "৩০", "name_bn": "ফুলবাড়িয়া", "name_en": "Fulbaria", "upazila": "Kaliakair", "district": "Gazipur", "division": "Dhaka"},

    # Narayanganj - Sadar, Sonargaon, Rupganj
    {"jl_no": "০২", "name_bn": "সিদ্ধিরগঞ্জ", "name_en": "Siddhirganj", "upazila": "Narayanganj Sadar", "district": "Narayanganj", "division": "Dhaka"},
    {"jl_no": "০৬", "name_bn": "ফতুল্লা", "name_en": "Fatullah", "upazila": "Narayanganj Sadar", "district": "Narayanganj", "division": "Dhaka"},
    {"jl_no": "১০", "name_bn": "পানাম নগর", "name_en": "Panam Nagar", "upazila": "Sonargaon", "district": "Narayanganj", "division": "Dhaka"},
    {"jl_no": "১৪", "name_bn": "কাঁচপুর", "name_en": "Kanchpur", "upazila": "Sonargaon", "district": "Narayanganj", "division": "Dhaka"},
    {"jl_no": "১৮", "name_bn": "মুড়াপাড়া", "name_en": "Murapara", "upazila": "Rupganj", "district": "Narayanganj", "division": "Dhaka"},
    {"jl_no": "২৩", "name_bn": "কাঞ্চন", "name_en": "Kanchan", "upazila": "Rupganj", "district": "Narayanganj", "division": "Dhaka"},

    # Cumilla - Kotwali & Burichang
    {"jl_no": "০৫", "name_bn": "টমসমব্রিজ", "name_en": "Tomsom Bridge", "upazila": "Kotwali", "district": "Cumilla", "division": "Chattogram"},
    {"jl_no": "০৯", "name_bn": "শাসনগাছা", "name_en": "Shashongacha", "upazila": "Kotwali", "district": "Cumilla", "division": "Chattogram"},
    {"jl_no": "১৩", "name_bn": "ময়নামতি", "name_en": "Mainamati", "upazila": "Burichang", "district": "Cumilla", "division": "Chattogram"},
    {"jl_no": "১৭", "name_bn": "কংশনগর", "name_en": "Kangshanagar", "upazila": "Burichang", "district": "Cumilla", "division": "Chattogram"},

    # Sylhet - Sadar & Golapganj
    {"jl_no": "০২", "name_bn": "আম্বরখানা", "name_en": "Amberkhana", "upazila": "Sylhet Sadar", "district": "Sylhet", "division": "Sylhet"},
    {"jl_no": "০৭", "name_bn": "কুমারগাঁও", "name_en": "Kumargaon", "upazila": "Sylhet Sadar", "district": "Sylhet", "division": "Sylhet"},
    {"jl_no": "১২", "name_bn": "বাঘা", "name_en": "Bagha", "upazila": "Golapganj", "district": "Sylhet", "division": "Sylhet"},
    {"jl_no": "১৬", "name_bn": "ঢাকা দক্ষিণ", "name_en": "Dhaka Dakshin", "upazila": "Golapganj", "district": "Sylhet", "division": "Sylhet"},
]

BANGLA_NAMES_MALE = [
    "আব্দুল করিম", "আবদুল করিম", "মোহাম্মদ রফিকুল ইসলাম", "মোঃ রফিকুল ইসলাম",
    "মোকাররম হোসেন", "আব্দুর রহিম তালুকদার", "নুরুল হক চৌধুরী", "নূরুল হক চৌধুরী",
    "কামাল উদ্দিন আহমেদ", "জয়নাল আবেদীন", "আফসার আলী মুন্সী", "শাহজাহান মিয়া",
    "মতিউর রহমান", "মফিজুল ইসলাম", "খোরশেদ আলম", "হারুন অর রশিদ",
    "সিরাজুল ইসলাম", "এনামুল হক", "বদরুল আলম", "তারেক মাহমুদ",
    "আবুল কাশেম", "দেওয়ান ফরিদ গাজী", "শাহাদাত হোসেন", "আখতারুজ্জামান",
    "গোলাম কিবরিয়া", "আজহারুল ইসলাম", "শামসুল আলম", "সুলতান মাহমুদ"
]

BANGLA_NAMES_FEMALE = [
    "ফাতেমা বেগম", "মোসাঃ ফাতেমা খাতুন", "রোকেয়া সুলতানা", "শাহানাজ পারভীন",
    "আমেনা খাতুন", "জাহানারা বেগম", "নাসরীন আক্তার", "সালমা চৌধুরী",
    "রাবেয়া বসরী", "বিলকিস বানু", "মেহেরুন্নেসা", "হাসিনা আক্তার",
    "শিরীন আক্তার", "মরিয়ম নেসা", "কুলসুম বিবি", "মনোয়ারা বেগম"
]

SIMILAR_NAME_VARIANTS = {
    "আব্দুল করিম": ["আবদুল করিম", "মোঃ আবদুল করিম", "আঃ করিম"],
    "মোহাম্মদ রফিকুল ইসলাম": ["মোঃ রফিকুল ইসলাম", "মো: রফিকুল ইসলাম", "রফিকুল ইসলাম"],
    "ফাতেমা বেগম": ["মোসাঃ ফাতেমা খাতুন", "ফাতেমা খাতুন", "মোসাম্মৎ ফাতেমা বেগম"],
    "নুরুল হক চৌধুরী": ["নূরুল হক চৌধুরী", "নুরুল হক", "নূরুল হক"],
    "আব্দুর রহিম তালুকদার": ["আবদুর রহিম তালুকদার", "আব্দুর রহিম", "আঃ রহিম তালুকদার"],
    "রোকেয়া সুলতানা": ["রোকেয়া বেগম", "মোসাঃ রোকেয়া সুলতানা", "রোকেয়া সুলতানা"],
    "মতিউর রহমান": ["মোঃ মতিউর রহমান", "মোজাহারুল রহমান", "মতিউর রাহমান"],
}

LAND_CLASSES_BN = [
    "নাল (Nal - Agricultural)",
    "ভিটি (Viti - High homestead land)",
    "বাড়ি (Bari - Residential)",
    "বাগান (Bagan - Orchard)",
    "পুকুর (Pond/Waterbody)",
    "দোকান (Commercial/Shop)",
    "পতিত (Fallow/Unused)",
    "রাস্তা (Access road)"
]

SURVEY_TYPES = ["CS", "SA", "RS", "BS", "City Survey"]

# Convert Arabic digits to Bengali digits
def to_bn_digits(n: int | str) -> str:
    bn_map = {'0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'}
    return "".join(bn_map.get(ch, ch) for ch in str(n))
