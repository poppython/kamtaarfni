// =====================================================================
//  ALL UI TEXTS + FUNNY PHRASES LIVE HERE  ✏️
//  Edit freely (e.g. switch to Tunisian dialect). Keep the keys the same.
// =====================================================================

export const T = {
  appName: "كم تعرفني؟",
  tagline: "اختبر أصحابك... وشوف مين يعرفك صح! 😼",
  loading: "لحظة...",
  errorGeneric: "صار شي غلط 😿 جرّب مرة ثانية",
  notFound: "هالاختبار مش موجود 🙈",
  backHome: "الصفحة الرئيسية",
  mute: "كتم الصوت",
  unmute: "تشغيل الصوت",

  home: {
    start: "ابدأ اختبارك",
    myQuizzes: "اختباراتي",
    empty: "ما عندك اختبارات لسا. ابدأ أول واحد! ✨",
    share: "مشاركة",
    manage: "إدارة",
    leaderboard: "الترتيب",
  },

  create: {
    stepLabels: ["عنك", "صوتك", "أسئلتك", "نشر"],
    yourName: "اسمك",
    yourNamePh: "مثلاً: سارة",
    quizTitle: "عنوان الاختبار",
    quizTitlePh: "كم تعرفني؟",
    next: "التالي",
    back: "رجوع",
    skip: "تخطّي",
    detailsHeading: "عرّف بنفسك 👋",
    questionsHeading: "اكتب أسئلتك ✍️",
    questionsHint: "اسأل عن نفسك: أي شي يعرفه بس اللي يعرفك صح!",
    addQuestion: "+ أضف سؤال",
    questionPh: "اكتب سؤالك هنا...",
    optionPh: "خيار",
    addOption: "+ خيار",
    tapCorrect: "اضغط على الدائرة لتحديد الإجابة الصحيحة ✅",
    remove: "حذف",
    moveUp: "للأعلى",
    moveDown: "للأسفل",
    maxQuestions: "وصلت للحد الأقصى (30 سؤال)",
    publish: "نشر الاختبار",
    publishing: "جاري النشر...",
    publishHeading: "جاهز للنشر؟ 🚀",
    publishSummary: (q: number, clips: number) => `${q} سؤال • ${clips} تسجيل صوتي`,
    uploadingVoices: "جاري رفع تسجيلاتك...",
    voiceUploadFailed: "بعض التسجيلات ما انرفعت. تقدر تعيدها من صفحة الإدارة.",
    errNeedName: "اكتب اسمك واسم الاختبار",
    errNeedQuestions: "أضف سؤال واحد على الأقل",
    errQuestionIncomplete: (n: number) => `السؤال رقم ${n} ناقص: اكتب النص والخيارات وحدد الإجابة الصحيحة`,
  },

  voice: {
    heading: "سجّل صوتك 🎤",
    intro: "اختياري! سجّل ردّات فعلك بصوتك الحقيقي، وصاحبك رح يسمعها بعد كل إجابة. 😂",
    skipNote: "ممكن تتخطى وتسجّل بعدين من رابط الإدارة.",
    record: "اضغط للتسجيل",
    stop: "اضغط للإيقاف",
    recording: "جاري التسجيل...",
    preview: "تشغيل",
    delete: "حذف",
    testButton: "جرب كيف سيسمعها صديقك 😈",
    micDenied: "ما قدرنا نوصل للميكروفون 🎙️ تأكد من الإذن في المتصفح. ما تقلق، رح نستخدم الأصوات الجاهزة.",
    micUnsupported: "جهازك أو متصفحك ما يدعم التسجيل. رح نستخدم الأصوات الجاهزة.",
    tooShort: "التسجيل قصير كتير! جرّب مرة ثانية 🙂",
    maxLen: "الحد الأقصى 5 ثواني",
    slotFull: "وصلت للحد الأقصى من التسجيلات هون",
    caption: (name: string) => `🎤 صوت ${name}`,
    slots: [
      {
        kind: "wrong" as const,
        title: "لما يغلط 😈",
        hints: ["انت عمرك ما عرفتني!", "تحكي جد؟!", "يا ساتر!"],
      },
      {
        kind: "correct" as const,
        title: "لما يصيب 🥳",
        hints: ["برافو عليك!", "عرفتني صح!"],
      },
      {
        kind: "result_low" as const,
        title: "نتيجة ضعيفة (أقل من 50%) 😬",
        hints: ["لازم نتعرف من جديد!", "ولا يهمك، حاول بعدين"],
      },
      {
        kind: "result_high" as const,
        title: "نتيجة حلوة (50% وأكثر) 🏆",
        hints: ["إنت صديقي الحقيقي!", "يا سلام عليك!"],
      },
    ],
    perQuestion: "🎤 صوت خاص",
    perQuestionTitle: "صوت خاص لهالسؤال (لما يغلط فيه)",
  },

  share: {
    heading: "اختبارك جاهز! 🎉",
    linkLabel: "رابط اللعب (شاركه مع أصحابك)",
    copy: "نسخ الرابط",
    copied: "اننسخ! ✅",
    whatsapp: "واتساب",
    messenger: "ماسنجر",
    instagram: "انستغرام",
    native: "مشاركة...",
    instagramHint: "انستغرام ما يسمح بالمشاركة المباشرة: انسخنا الرابط، الصقه في الستوري أو الرسائل.",
    shareText: (name: string) => `${name} تحداك: كم تعرفني؟ 🎯`,
    qr: "أو امسح الكود",
    manageHeading: "🔒 رابط الإدارة (خاص فيك)",
    manageWarn: "احفظه! منه تشوف إجابات أصحابك وتغيّر تسجيلاتك. لا تشاركه مع أحد.",
    openLeaderboard: "شوف الترتيب",
    openManage: "افتح صفحة الإدارة",
  },

  landing: {
    challenge: (name: string) => `${name} يتحداك! 🎯`,
    sub: "كم تعرفه فعلاً؟ جاوب وبنشوف...",
    yourName: "اسمك",
    yourNamePh: "اكتب اسمك",
    pickAvatar: "اختر شخصيتك",
    start: "ابدأ",
    needName: "اكتب اسمك أول 😉",
    alreadyPlayed: (score: number, total: number) => `لعبت قبل: نتيجتك ${score}/${total}`,
    seeResult: "شوف ترتيبك",
    tryAgain: "حاول مرة ثانية",
  },

  play: {
    question: (i: number, n: number) => `سؤال ${i} من ${n}`,
    next: "التالي",
    finish: "شوف النتيجة",
    correctRevealed: "الإجابة الصحيحة:",
    right: "صح! 🎉",
    wrong: "غلط! 😹",
  },

  result: {
    drumroll: "جاري حساب النتيجة...",
    score: (s: number, t: number) => `${s} / ${t}`,
    rank: (r: number) => `ترتيبك: #${r}`,
    leaderboard: "شوف الترتيب 🏆",
    makeYours: "اصنع اختبارك أنت ✨",
    // Funny message per score range (pct = 0..100). First match wins.
    message: (pct: number) => {
      if (pct >= 100) return "أنت توأم روحي! 🤯 عرفتني 100%";
      if (pct >= 80) return "تقريباً عارفني أكتر من أمي! 😍";
      if (pct >= 50) return "مش بطّال! بس لسا ما وصلت لمرحلة الصديق المقرّب 😏";
      if (pct >= 30) return "يا عيب الشوم! بالكاد تعرفني 😅";
      return "إنت جاد؟! كأنك أول مرة تشوفني 😭";
    },
  },

  leaderboard: {
    heading: "لوحة الشرف 🏆",
    empty: "لسا ما حدا خلّص الاختبار. كن أول واحد! 🏃",
    live: "مباشر",
    play: "العب الاختبار",
    manageLink: "🔒 شوف إجاباتهم (للمنشئ)",
  },

  manage: {
    heading: "إدارة الاختبار 🔒",
    tabParticipants: "المشاركين",
    tabVoices: "تسجيلاتي",
    noParticipants: "لسا ما حدا لعب. شارك الرابط! 📣",
    answersOf: (n: string) => `إجابات ${n}`,
    correctAnswer: "الصحيح:",
    theirAnswer: "جوابه:",
    voiceToggle: "تشغيل تسجيلاتي للأصدقاء",
    voiceToggleOffNote: "مطفية: الأصدقاء رح يسمعوا الأصوات الجاهزة فقط.",
    forbidden: "رابط الإدارة غير صحيح 🚫",
    perQuestionHeading: "أصوات خاصة لكل سؤال",
    shareLink: "رابط الاختبار",
  },

  // Emoji avatars for friends
  avatars: ["😺", "😸", "🐶", "🦊", "🐼", "🐸", "🦄", "🐙", "🐯", "🐵", "🐰", "🐥", "🦁", "🐨", "👻", "🤖"],
  floatingEmojis: ["⭐", "💖", "🎈", "✨", "🍭", "🎀", "🌈", "🐾"],
};

// ---------- Default voice lines (used when the creator did not record their own) ----------
// `file` → /public/sounds/voices/<file>.mp3 ; if missing, `text` is spoken with the Web Speech API (ar-SA).
export type VoiceEvent = "wrong" | "correct" | "result_low" | "result_high";
export interface DefaultLine { file: string; text: string }

export const DEFAULT_VOICES: Record<VoiceEvent, DefaultLine[]> = {
  wrong: [
    { file: "wrong1", text: "إنت جاد؟!" }, // signature line
    { file: "wrong2", text: "لا لا لا مش معقول!" },
    { file: "wrong3", text: "يا ساتر!" },
  ],
  correct: [
    { file: "correct1", text: "برافو!" },
    { file: "correct2", text: "ما شاء الله عليك!" },
    { file: "correct3", text: "عرفتني صح!" },
  ],
  result_low: [{ file: "low1", text: "ولا يهمك... لازم نتعرف من جديد!" }],
  result_high: [{ file: "high1", text: "يا سلام! إنت صديقي الحقيقي!" }],
};

export const SPEECH_LANG = "ar-SA";
