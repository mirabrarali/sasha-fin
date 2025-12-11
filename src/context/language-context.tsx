
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  dir: 'ltr' | 'rtl';
}

const translations: { [key in Language]: { [key: string]: string } } = {
  en: {
    pageTitle: 'Abdullah Banking',
    initialMessage: "Hello! I'm Abdullah, your financial advisor. How can I help you today?",
    placeholder: "Message Abdullah...",
    uploadCsvTooltip: "Upload Loan CSV",
    uploadPdfTooltip: "Upload Financial PDF",
    micTooltip: "Use Microphone",
    sendSr: "Send",
    analyzingFile: "Context: {{fileName}}",
    clearPdfTooltip: "Clear PDF from session",
    pdfClearedTitle: "PDF Cleared",
    pdfClearedDesc: "The document has been removed from the session.",
    clearedPdfMessage: "I have cleared the previous document. How can I assist you now?",
    csvUploadTitle: "CSV File Uploaded",
    csvUploadDesc: "{{fileName}} is ready for loan analysis.",
    pdfUploadTitle: "PDF File Uploaded",
    pdfUploadDesc: "{{fileName}} is ready for analysis.",
    pdfLoadedForChat: "I've loaded {{fileName}}. Feel free to ask me any questions about it.",
    analyzingPdfMessage: "Analyzing financial statement: {{fileName}}...",
    analysisFailedTitle: "Analysis Failed",
    analysisFailedDesc: "Abdullah could not analyze the document. Please ensure it's a valid financial statement and try again.",
    unableToAnalyzeMessage: 'Sorry, I was unable to analyze that document.',
    loanAnalysisHeader: "Here is the analysis for Loan ID **{{loanId}}**:",
    financialAnalysisHeader: "Here is the analysis of the financial statement:",
    uploadCsvFirst: 'Please upload a CSV file before requesting a loan analysis.',
    invalidPdfTitle: 'Invalid File Type',
    invalidPdfDesc: 'Please upload a PDF file.',
    sessionSaveErrorTitle: 'Could not save session',
    sessionSaveErrorDesc: 'Your browser may be out of space or in private mode.',
    documentLoadedTitle: 'Document Loaded',
    documentLoadedDesc: "Continuing session with {{fileName}}.",
    genericErrorTitle: 'Oh no! Something went wrong.',
    genericErrorDesc: 'Failed to get a response from Abdullah. Please try again.',
    loanAnalysisReportTitle: "Loan Analysis Report",
    financialAnalysisReportTitle: "Financial Statement Analysis",
    summary: "Summary",
    prediction: "Prediction",
    eligibility: "Eligibility",
    creditScoreAssessment: "Credit Score Assessment",
    downloadPdf: "Download PDF",
    english: 'English',
    arabic: 'العربية',
    choosePdfLanguageTitle: "Choose PDF Language",
    choosePdfLanguageDesc: "In which language would you like to download the report?",
    cancel: "Cancel",
    clearCsvTooltip: "Clear CSV from session",
    csvClearedTitle: "CSV Cleared",
    csvClearedDesc: "The CSV data has been cleared from the session.",
    clearedCsvMessage: "I have cleared the CSV data. How can I help you now?",
    translationErrorTitle: 'Translation Error',
    translationErrorDesc: 'Failed to generate the report in {{lang}}. Please try again.',
    generatingTranslatedPdf: 'Generating translated PDF...',
    trendsAndGraphsTitle: "Trends & Visualizations",
    identifiedFlawsTitle: "Identified Flaws & Risks",
    financialPerformanceTitle: "Financial Performance",
    revenue: "Revenue",
    netIncome: "Net Income",
    pdfGenerationError: "Could not generate the PDF report.",
    maintenanceMessage: "Services are undergoing maintenance and major upgrades. Time remaining: {{time}}",
    
    // Abdullah Vision
    abdullahVisionTitle: "Abdullah Vision",
    abdullahVisionDesc: "A creative space to generate and enhance images using AI.",
    textToImageTitle: "Text-to-Image",
    imageEnhancementTitle: "Image Enhancement",
    promptLabel: "Prompt",
    promptPlaceholder: "e.g., A photorealistic image of a cat wearing a small hat, sitting in a library",
    generateButton: "Generate",
    generatingMessage: "Abdullah is creating your image...",
    uploadButton: "Upload Image",
    upscaleButton: "Upscale Image",
    upscalingMessage: "Abdullah is enhancing your image...",
    resultTitle: "Result",
    noResult: "Your generated or enhanced image will appear here.",
    imageGenFailedTitle: "Image Generation Failed",
    imageGenFailedDesc: "Sorry, I couldn't create an image at this time. Please try again later.",
    imageUpscaleFailedTitle: "Image Upscaling Failed",
    imageUpscaleFailedDesc: "Sorry, I couldn't enhance the image. Please ensure it's a valid format and try again.",
    downloadButton: "Download",
    startOver: "Start Over",

    newSessionButton: "New Session",
    newSessionTitle: "New Session Started",
    newSessionDesc: "Your chat has been cleared.",
    newSessionDescSpreadsheet: "Your spreadsheet and chat have been cleared.",
    newSessionDescDA: "Your data analysis dashboard has been cleared.",
    newSessionConfirmTitle: "Are you sure?",
    newSessionConfirmDescChat: "This will clear your entire chat history and remove any uploaded files. This action cannot be undone.",
    newSessionConfirmDescSpreadsheet: "This will clear your entire spreadsheet, including data and charts, and reset the chat. This action cannot be undone.",
    newSessionConfirmButton: "Start New Session",

    // Abdullah Status
    abdullahStatusOnline: 'Online',
    abdullahStatusOffline: 'Offline',
    
    // Nav
    chatTitle: 'Chat',
    aboutTitle: 'Enterprise',
    spreadsheetTitle: 'Spreadsheet',
    spreadsheetGuideTitle: 'Spreadsheet Guide',
    dataAnalyticsTitle: 'Data Analytics',
    knowledgeBaseTitle: 'Knowledge Base',
    
    // Enterprise Page (New About Page)
    enterprisePageTitle: 'Abdullah for Enterprise',
    enterpriseHeader: "The Generative AI Platform for Modern Finance",
    enterpriseSubHeader: "Abdullah is a state-of-the-art financial AI, engineered for the rigorous demands of banking, investment firms, and large-scale enterprises in the Middle East and beyond. Move beyond simple chatbots to a fully-agentic system that delivers unparalleled analytical power, security, and scalability.",
    enterpriseCorePitchTitle: "From Billions of Datapoints to Actionable Intelligence",
    enterpriseCorePitchP1: "Abdullah is architected to process and synthesize vast datasets—from terabytes of transactional records to thousands of complex financial documents—in near real-time. Our custom AI models, trained specifically for financial analysis, identify critical patterns, predict risk, and generate institutional-grade insights at a scale and speed that is impossible for human teams alone.",
    enterpriseCorePitchP2: "Leverage this power to accelerate due diligence, enhance credit risk modeling, and provide your teams with a strategic co-pilot for high-stakes decision-making.",
    enterpriseCapabilitiesTitle: "A Suite of Powerful, Integrated Capabilities",
    capabilityAnalysisTitle: "Deep Financial Analysis",
    capabilityAnalysisDesc: "Perform forensic analysis on financial statements (P&L, Balance Sheet, Cash Flow) to evaluate financial health, creditworthiness, and identify red flags.",
    capabilityDocIntelTitle: "Intelligent Document Processing",
    capabilityDocIntelDesc: "Extract, analyze, and query data from unstructured documents like PDFs, reports, and contracts using natural language.",
    capabilityRiskTitle: "Predictive Risk & Trend Modeling",
    capabilityRiskDesc: "Utilize AI-driven models to forecast financial trajectories, predict credit scores, and identify emerging market trends from your proprietary data.",
    capabilityDataTitle: "Agentic Data Analysis",
    capabilityDataDesc: "Go beyond dashboards. Command Abdullah to perform complex data operations, create ad-hoc visualizations, and answer deep questions about your data.",
    capabilityBilingualTitle: "Bilingual & Region-Aware",
    capabilityBilingualDesc: "Fully fluent in both Arabic and English, with a nuanced understanding of Middle Eastern financial regulations and market context.",
    capabilityKnowledgeTitle: "Customizable Knowledge Base",
    capabilityKnowledgeDesc: "Securely augment Abdullah's core knowledge with your institution's specific rules, policies, and proprietary data for tailored analysis.",

    enterpriseDeploymentTitle: "Enterprise-Grade Deployment & Security",
    deploymentSecurityTitle: "Uncompromising Security",
    deploymentSecurityDesc: "Your data is your most valuable asset. Abdullah is built on a private architecture with end-to-end encryption. Your data is never used for external training.",
    deploymentOnPremTitle: "On-Premise & Private Cloud",
    deploymentOnPremDesc: "Maintain full control over your data. Abdullah can be deployed on your own infrastructure, ensuring compliance with the strictest data residency and security policies.",
    deploymentDataTitle: "Flexible Licensing & Integration",
    deploymentDataDesc: "We offer tailored licensing models to fit your organization's needs, with robust API access for seamless integration into your existing workflows and systems.",
    
    enterpriseCtaTitle: "Ready to Transform Your Financial Intelligence?",
    enterpriseCtaDesc: "Discover how Abdullah can empower your organization to make faster, smarter decisions. Schedule a private demo with our team to see the platform in action.",
    enterpriseCtaButton: "Request a Demo",

  },
  ar: {
    pageTitle: 'عبدالله المصرفية',
    initialMessage: "مرحباً! أنا عبدالله، مستشارك المالي. كيف يمكنني مساعدتك اليوم؟",
    placeholder: "راسل عبدالله...",
    uploadCsvTooltip: "تحميل ملف CSV للقروض",
    uploadPdfTooltip: "تحميل ملف PDF مالي",
    micTooltip: "استخدام الميكروفون",
    sendSr: "إرسال",
    analyzingFile: "السياق: {{fileName}}",
    clearPdfTooltip: "مسح ملف PDF من الجلسة",
    pdfClearedTitle: "تم مسح PDF",
    pdfClearedDesc: "تمت إزالة المستند من الجلسة.",
    clearedPdfMessage: "لقد قمت بمسح المستند السابق. كيف يمكنني مساعدتك الآن؟",
    csvUploadTitle: "تم تحميل ملف CSV",
    csvUploadDesc: "{{fileName}} جاهز لتحليل القرض.",
    pdfUploadTitle: "تم تحميل ملف PDF",
    pdfUploadDesc: "{{fileName}} جاهز للتحليل.",
    pdfLoadedForChat: "لقد قمت بتحميل {{fileName}}. لا تتردد في طرح أي أسئلة حوله.",
    analyzingPdfMessage: "جاري تحليل البيان المالي: {{fileName}}...",
    analysisFailedTitle: "فشل التحليل",
    analysisFailedDesc: "لم يتمكن عبدالله من تحليل المستند. يرجى التأكد من أنه بيان مالي صالح والمحاولة مرة أخرى.",
    unableToAnalyzeMessage: 'عذراً، لم أتمكن من تحليل ذلك المستند.',
    loanAnalysisHeader: "إليك تحليل معرف القرض **{{loanId}}**:",
    financialAnalysisHeader: "إليك تحليل البيان المالي:",
    uploadCsvFirst: 'يرجى تحميل ملف CSV قبل طلب تحليل القرض.',
    invalidPdfTitle: 'نوع ملف غير صالح',
    invalidPdfDesc: 'يرجى تحميل ملف PDF.',
    sessionSaveErrorTitle: 'تعذر حفظ الجلسة',
    sessionSaveErrorDesc: 'قد تكون مساحة متصفحك ممتلئة أو في وضع التصفح الخاص.',
    documentLoadedTitle: 'تم تحميل المستند',
    documentLoadedDesc: "متابعة الجلسة مع {{fileName}}.",
    genericErrorTitle: 'عفوًا! حدث خطأ ما.',
    genericErrorDesc: 'فشل الحصول على رد من عبدالله. يرجى المحاولة مرة أخرى.',
    loanAnalysisReportTitle: "تقرير تحليل القرض",
    financialAnalysisReportTitle: "تحليل البيان المالي",
    summary: "ملخص",
    prediction: "توقع",
    eligibility: "الأهلية",
    creditScoreAssessment: "تقييم الجدارة الائتمانية",
    downloadPdf: "تحميل PDF",
    english: 'الإنجليزية',
    arabic: 'العربية',
    choosePdfLanguageTitle: "اختر لغة التقرير",
    choosePdfLanguageDesc: "بأي لغة تود تحميل التقرير؟",
    cancel: "إلغاء",
    clearCsvTooltip: "مسح ملف CSV من الجلسة",
    csvClearedTitle: "تم مسح CSV",
    csvClearedDesc: "تمت إزالة بيانات CSV من الجلسة.",
    clearedCsvMessage: "لقد قمت بمسح بيانات CSV. كيف يمكنني مساعدتك الآن؟",
    translationErrorTitle: 'خطأ في الترجمة',
    translationErrorDesc: 'فشل إنشاء التقرير باللغة {{lang}}. يرجى المحاولة مرة أخرى.',
    generatingTranslatedPdf: 'جاري إنشاء ملف PDF مترجم...',
    trendsAndGraphsTitle: "الاتجاهات والتصورات",
    identifiedFlawsTitle: "العيوب والمخاطر المحددة",
    financialPerformanceTitle: "الأداء المالي",
    revenue: "الإيرادات",
    netIncome: "صافي الدخل",
    pdfGenerationError: "تعذر إنشاء تقرير PDF.",
    maintenanceMessage: "تخضع الخدمات للصيانة والتحديثات الرئيسية. الوقت المتبقي: {{time}}",
    
    // Abdullah Vision
    abdullahVisionTitle: "رؤية عبدالله",
    abdullahVisionDesc: "مساحة إبداعية لإنشاء الصور وتحسينها باستخدام الذكاء الاصطناعي.",
    textToImageTitle: "نص إلى صورة",
    imageEnhancementTitle: "تحسين الصور",
    promptLabel: "الموجه",
    promptPlaceholder: "مثال: صورة واقعية لقطة ترتدي قبعة صغيرة، تجلس في مكتبة",
    generateButton: "إنشاء",
    generatingMessage: "عبدالله ينشئ صورتك...",
    uploadButton: "تحميل صورة",
    upscaleButton: "تحسين الصورة",
    upscalingMessage: "عبدالله يقوم بتحسين صورتك...",
    resultTitle: "النتيجة",
    noResult: "ستظهر صورتك المنشأة أو المحسنة هنا.",
    imageGenFailedTitle: "فشل إنشاء الصورة",
    imageGenFailedDesc: "عذرًا، لم أتمكن من إنشاء صورة في هذا الوقت. يرجى المحاولة مرة أخرى لاحقًا.",
    imageUpscaleFailedTitle: "فشل تحسين الصورة",
    imageUpscaleFailedDesc: "عذرًا، لم أتمكن من تحسين الصورة. يرجى التأكد من أنها بتنسيق صالح والمحاولة مرة أخرى.",
    downloadButton: "تنزيل",
    startOver: "البدء من جديد",
    
    newSessionButton: "جلسة جديدة",
    newSessionTitle: "بدأت جلسة جديدة",
    newSessionDesc: "تم مسح محادثتك.",
    newSessionDescSpreadsheet: "تم مسح جدول البيانات والدردشة.",
    newSessionDescDA: "تم مسح لوحة معلومات تحليل البيانات الخاصة بك.",
    newSessionConfirmTitle: "هل أنت متأكد؟",
    newSessionConfirmDescChat: "سيؤدي هذا إلى مسح سجل الدردشة بالكامل وإزالة أي ملفات تم تحميلها. لا يمكن التراجع عن هذا الإجراء.",
    newSessionConfirmDescSpreadsheet: "سيؤدي هذا إلى مسح جدول البيانات بالكامل، بما في ذلك البيانات والمخططات، وإعادة تعيين الدردشة. لا يمكن التراجع عن هذا الإجراء.",
    newSessionConfirmButton: "بدء جلسة جديدة",

    // Abdullah Status
    abdullahStatusOnline: 'متصل',
    abdullahStatusOffline: 'غير متصل',

    // Nav
    chatTitle: 'الدردشة',
    aboutTitle: 'للمؤسسات',
    spreadsheetTitle: 'جدول البيانات',
    spreadsheetGuideTitle: 'دليل جدول البيانات',
    dataAnalyticsTitle: 'تحليل البيانات',
    knowledgeBaseTitle: 'قاعدة المعرفة',
    
    // Enterprise Page (New About Page)
    enterprisePageTitle: 'عبدالله للمؤسسات',
    enterpriseHeader: "منصة الذكاء الاصطناعي التوليدي للمالية الحديثة",
    enterpriseSubHeader: "عبدالله هو ذكاء اصطناعي مالي فائق الحداثة، مصمم للمتطلبات الصارمة للبنوك وشركات الاستثمار والمؤسسات الكبرى في الشرق الأوسط وخارجه. تجاوز روبوتات الدردشة البسيطة إلى نظام وكيلي بالكامل يقدم قوة تحليلية وأمانًا وقابلية للتوسع لا مثيل لها.",
    enterpriseCorePitchTitle: "من مليارات نقاط البيانات إلى ذكاء قابل للتنفيذ",
    enterpriseCorePitchP1: "تم تصميم عبدالله لمعالجة وتجميع مجموعات بيانات ضخمة - من تيرابايت من سجلات المعاملات إلى آلاف المستندات المالية المعقدة - في الوقت الفعلي تقريبًا. تحدد نماذج الذكاء الاصطناعي المخصصة لدينا، والتي تم تدريبها خصيصًا للتحليل المالي، الأنماط الحرجة وتتنبأ بالمخاطر وتولد رؤى على مستوى المؤسسات بحجم وسرعة يستحيل على الفرق البشرية وحدها تحقيقها.",
    enterpriseCorePitchP2: "استفد من هذه القوة لتسريع العناية الواجبة، وتعزيز نمذجة مخاطر الائتمان، وتزويد فرقك بمساعد استراتيجي لاتخاذ القرارات عالية المخاطر.",
    enterpriseCapabilitiesTitle: "مجموعة من القدرات القوية والمتكاملة",
    capabilityAnalysisTitle: "تحليل مالي عميق",
    capabilityAnalysisDesc: "قم بإجراء تحليل جنائي للبيانات المالية (بيان الدخل، الميزانية العمومية، التدفقات النقدية) لتقييم الصحة المالية والجدارة الائتمانية وتحديد العلامات الحمراء.",
    capabilityDocIntelTitle: "معالجة ذكية للمستندات",
    capabilityDocIntelDesc: "استخرج وحلل واستعلم عن البيانات من المستندات غير المهيكلة مثل ملفات PDF والتقارير والعقود باستخدام اللغة الطبيعية.",
    capabilityRiskTitle: "نمذجة المخاطر والاتجاهات التنبؤية",
    capabilityRiskDesc: "استخدم النماذج المدفوعة بالذكاء الاصطناعي للتنبؤ بالمسارات المالية، وتوقع درجات الائتمان، وتحديد اتجاهات السوق الناشئة من بياناتك الخاصة.",
    capabilityDataTitle: "تحليل بيانات وكيلي",
    capabilityDataDesc: "تجاوز لوحات المعلومات. أصدر أوامر لعبدالله لإجراء عمليات بيانات معقدة، وإنشاء تصورات مخصصة، والإجابة على أسئلة عميقة حول بياناتك.",
    capabilityBilingualTitle: "ثنائي اللغة ومدرك للمنطقة",
    capabilityBilingualDesc: "يتقن اللغتين العربية والإنجليزية تمامًا، مع فهم دقيق للوائح المالية في الشرق الأوسط وسياق السوق.",
    capabilityKnowledgeTitle: "قاعدة معرفة قابلة للتخصيص",
    capabilityKnowledgeDesc: "عزز بشكل آمن معرفة عبدالله الأساسية بالقواعد والسياسات والبيانات الخاصة بمؤسستك لتحليل مخصص.",

    enterpriseDeploymentTitle: "نشر وأمان على مستوى المؤسسات",
    deploymentSecurityTitle: "أمان لا هوادة فيه",
    deploymentSecurityDesc: "بياناتك هي أثمن أصولك. تم بناء عبدالله على بنية خاصة مع تشفير من طرف إلى طرف. لا يتم استخدام بياناتك أبدًا للتدريب الخارجي.",
    deploymentOnPremTitle: "في أماكن العمل والسحابة الخاصة",
    deploymentOnPremDesc: "حافظ على السيطرة الكاملة على بياناتك. يمكن نشر عبدالله على بنيتك التحتية الخاصة، مما يضمن الامتثال لأكثر سياسات الإقامة والأمان صرامة للبيانات.",
    deploymentDataTitle: "ترخيص وتكامل مرن",
    deploymentDataDesc: "نحن نقدم نماذج ترخيص مخصصة لتناسب احتياجات مؤسستك، مع وصول قوي إلى واجهة برمجة التطبيقات للتكامل السلس في سير عملك وأنظمتك الحالية.",

    enterpriseCtaTitle: "هل أنت مستعد لتحويل ذكائك المالي؟",
    enterpriseCtaDesc: "اكتشف كيف يمكن لعبدالله تمكين مؤسستك من اتخاذ قرارات أسرع وأكثر ذكاءً. حدد موعدًا لعرض توضيحي خاص مع فريقنا لرؤية المنصة أثناء العمل.",
    enterpriseCtaButton: "طلب عرض توضيحي",

  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const t = (key: string, replacements?: { [key: string]: string | number }) => {
    let translation = translations[language][key] || key;
    if (replacements) {
        Object.keys(replacements).forEach(rKey => {
            translation = translation.replace(`{{${rKey}}}`, String(replacements[rKey]));
        });
    }
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

    