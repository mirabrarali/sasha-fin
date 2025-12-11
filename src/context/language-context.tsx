
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
    uploadCsvTooltip: "Upload Loan CSV/XLSX",
    uploadPdfTooltip: "Upload Financial PDF",
    sendSr: "Send",
    analyzingFile: "Context: {{fileName}}",
    clearPdfTooltip: "Clear PDF from session",
    pdfClearedTitle: "PDF Cleared",
    pdfClearedDesc: "The document has been removed from the session.",
    clearedPdfMessage: "I have cleared the previous document. How can I assist you now?",
    csvUploadTitle: "File Uploaded",
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
    clearCsvTooltip: "Clear file from session",
    csvClearedTitle: "File Cleared",
    csvClearedDesc: "The file data has been cleared from the session.",
    clearedCsvMessage: "I have cleared the file data. How can I help you now?",
    translationErrorTitle: 'Translation Error',
    translationErrorDesc: 'Failed to generate the report in {{lang}}. Please try again.',
    generatingTranslatedPdf: 'Generating translated PDF...',
    trendsAndGraphsTitle: "Trends & Visualizations",
    identifiedFlawsTitle: "Identified Flaws & Risks",
    financialPerformanceTitle: "Financial Performance",
    revenue: "Revenue",
    netIncome: "Net Income",
    pdfGenerationError: "Could not generate the PDF report.",
    
    devToolsTitle: "Access Denied",
    devToolsDescription: "For your security and the protection of our proprietary systems, access to developer tools is restricted on this application.",
    devToolsMessage: "Welcome to Abdullah Banking. For security reasons, developer features are disabled. If you need assistance, please contact support.",

    newSessionButton: "New Session",
    newSessionTitle: "New Session Started",
    newSessionDesc: "Your chat has been cleared.",
    newSessionDescDA: "The dashboard has been cleared.",
    newSessionConfirmTitle: "Are you sure?",
    newSessionConfirmDescChat: "This will clear your entire chat history and remove any uploaded files. This action cannot be undone.",
    newSessionConfirmButton: "Start New Session",

    // Abdullah Status
    abdullahStatusOnline: 'Online',
    
    // Nav
    chatTitle: 'Chat',
    aboutTitle: 'Enterprise',
    knowledgeBaseTitle: 'Knowledge Base',
    
    // Enterprise Page (New About Page)
    enterprisePageTitle: 'Abdullah for Enterprise',
    enterpriseHeader: "The Generative AI Platform for Modern Finance",
    enterpriseSubHeader: "Abdullah is a state-of-the-art financial AI, engineered for the rigorous demands of banking, investment firms, and large-scale enterprises in the Middle East and beyond. Move beyond simple chatbots to a fully-agentic system that delivers unparalleled analytical power, security, and scalability.",
    enterpriseCorePitchTitle: "From Billions of Datapoints to Actionable Intelligence",
    enterpriseCorePitchP1: "Abdullah is architected to process and synthesize vast datasets—from terabytes of transactional records to thousands of complex financial documents—in near real-time. Our custom AI models, trained specifically for financial analysis, identify critical patterns, predict risk, and generate institutional-grade insights at a scale and speed that is impossible for human teams alone.",
    enterpriseCorePitchP2: "Leverage this power to accelerate due diligence, enhance credit risk modeling, and provide your teams with a strategic co-pilot for high-stakes decision-making.",
    enterpriseCorePitchP3: "Our system is built to handle the complexities of regional financial data, offering unparalleled accuracy and relevance for the GCC markets.",
    enterpriseCapabilitiesTitle: "A Suite of Powerful, Integrated Capabilities",
    capabilityAnalysisTitle: "Deep Financial Analysis",
    capabilityAnalysisDesc: "Perform forensic analysis on financial statements (P&L, Balance Sheet, Cash Flow) to evaluate financial health, creditworthiness, and identify red flags. Abdullah can process years of financial data in seconds to provide a comprehensive overview.",
    capabilityDocIntelTitle: "Intelligent Document Processing",
    capabilityDocIntelDesc: "Instantly extract, analyze, and query data from unstructured documents like PDFs, annual reports, and legal contracts using natural language. Ask complex questions and get precise answers, complete with citations.",
    capabilityRiskTitle: "Predictive Risk & Trend Modeling",
    capabilityRiskDesc: "Utilize AI-driven models to forecast financial trajectories, predict credit scores with high accuracy, and identify emerging market trends from your proprietary data, with specific tuning for Middle Eastern markets.",
    capabilityDataTitle: "Agentic Data Analysis",
    capabilityDataDesc: "Go beyond static dashboards. Command Abdullah to perform complex data operations, create ad-hoc visualizations, and answer deep, multi-dimensional questions about your data in a conversational interface.",
    capabilityBilingualTitle: "Bilingual & Region-Aware",
    capabilityBilingualDesc: "Fully fluent in both Arabic and English, with a nuanced understanding of GCC financial regulations, cultural context, and market-specific terminology, ensuring accurate and relevant analysis.",
    capabilityKnowledgeTitle: "Customizable Knowledge Base",
    capabilityKnowledgeDesc: "Securely augment Abdullah's core knowledge with your institution's specific rules, internal policies, and proprietary data for analysis that is perfectly tailored to your operational framework.",

    enterpriseDeploymentTitle: "Enterprise-Grade Deployment & Security",
    deploymentSecurityTitle: "Uncompromising Security",
    deploymentSecurityDesc: "Your data is your most valuable asset. Abdullah is built on a private-first architecture with end-to-end encryption. Your proprietary data is never used for external model training, guaranteed.",
    deploymentOnPremTitle: "On-Premise & Private Cloud",
    deploymentOnPremDesc: "Maintain full control over your data and compute. Abdullah can be deployed on your own infrastructure or private cloud, ensuring compliance with the strictest data residency and security policies.",
    deploymentDataTitle: "Flexible Licensing & Integration",
    deploymentDataDesc: "We offer tailored licensing models, from per-seat to full enterprise, to fit your organization's needs. Robust API access allows for seamless integration into your existing CRM, ERP, and internal banking platforms.",
    
    enterpriseCtaTitle: "Ready to Transform Your Financial Intelligence?",
    enterpriseCtaDesc: "Discover how Abdullah can empower your organization to make faster, smarter decisions with unparalleled data-driven insights. Schedule a private demo with our enterprise team to see the platform in action.",
    enterpriseCtaButton: "Request a Demo",

    // New Sections
    complianceTitle: "Built for Trust & Compliance",
    complianceSAMATitle: "SAMA-Compliant Framework",
    complianceSAMADesc: "Designed with the Saudi Central Bank's regulatory framework in mind, ensuring our on-premise solutions meet stringent data sovereignty and security requirements for financial institutions in the Kingdom.",
    complianceISOTitle: "ISO 27001 Certified",
    complianceISODesc: "Our security practices are aligned with ISO 27001 standards, providing a certified Information Security Management System (ISMS) that protects your data integrity, confidentiality, and availability.",

    highSkillsTitle: "High-Skill Agentic Functions",
    skillAgenticTitle: "Agentic Workflow Automation",
    skillAgenticDesc: "Abdullah can execute multi-step financial processes autonomously. From running month-end reconciliations to generating board-ready reports, he acts as a tireless digital analyst.",
    skillAnomalyTitle: "Forensic Anomaly Detection",
    skillAnomalyDesc: "Leveraging advanced pattern recognition, Abdullah can sift through millions of transactions to flag potentially fraudulent activities, compliance breaches, or data inconsistencies that would evade human review.",
    skillScenarioTitle: "Complex Scenario Modeling",
    skillScenarioDesc: "Ask Abdullah to model complex what-if scenarios, such as the impact of interest rate changes on a loan portfolio or market volatility on investment performance, and receive data-backed projections in seconds.",
    skillIntegrationTitle: "Seamless Systems Integration",
    skillIntegrationDesc: "Abdullah is not a silo. He can be integrated with your core banking systems, data warehouses, and market data feeds to pull and push information, enriching his analysis with real-time context.",

    // Data Analytics
    dataAnalyticsTitle: 'Data Analytics',
    daUploadPromptTitle: "Instant Data Dashboard",
    daUploadPromptDesc: "Upload a CSV, XLSX, or PDF file to generate a dashboard with insights and visualizations.",
    daUploadButton: "Upload Data File",
    daGeneratingDashboardTitle: 'Generating Your Dashboard...',
    daGeneratingDashboardDesc: 'Abdullah is analyzing your data to find key insights.',
    daSummaryTitle: "AI Summary",
    daKeyInsightsTitle: "Key Insights",
    daDownloadPdfButton: "Download Report",
    daGeneratingPdfTitle: "Generating PDF report...",
    daPdfGenerationFailedTitle: "PDF Generation Failed",
    daPdfGenerationFailedDesc: "There was an error creating the PDF report.",
    daUnsupportedFileType: "Unsupported File Type",
    daDragDropValid: "Drop file to start analysis",
    daDragDropInvalid: "Unsupported file type",
    daDragDropSupported: "Supported: CSV, XLSX, PDF",
    daAnalysisFailedDesc: "Could not generate dashboard. Check the file format or try a different file.",
  },
  ar: {
    pageTitle: 'عبدالله المصرفية',
    initialMessage: "مرحباً! أنا عبدالله، مستشارك المالي. كيف يمكنني مساعدتك اليوم؟",
    placeholder: "راسل عبدالله...",
    uploadCsvTooltip: "تحميل ملف CSV/XLSX للقروض",
    uploadPdfTooltip: "تحميل ملف PDF مالي",
    sendSr: "إرسال",
    analyzingFile: "السياق: {{fileName}}",
    clearPdfTooltip: "مسح ملف PDF من الجلسة",
    pdfClearedTitle: "تم مسح PDF",
    pdfClearedDesc: "تمت إزالة المستند من الجلسة.",
    clearedPdfMessage: "لقد قمت بمسح المستند السابق. كيف يمكنني مساعدتك الآن؟",
    csvUploadTitle: "تم تحميل الملف",
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
    clearCsvTooltip: "مسح الملف من الجلسة",
    csvClearedTitle: "تم مسح الملف",
    csvClearedDesc: "تمت إزالة بيانات الملف من الجلسة.",
    clearedCsvMessage: "لقد قمت بمسح بيانات الملف. كيف يمكنني مساعدتك الآن؟",
    translationErrorTitle: 'خطأ في الترجمة',
    translationErrorDesc: 'فشل إنشاء التقرير باللغة {{lang}}. يرجى المحاولة مرة أخرى.',
    generatingTranslatedPdf: 'جاري إنشاء ملف PDF مترجم...',
    trendsAndGraphsTitle: "الاتجاهات والتصورات",
    identifiedFlawsTitle: "العيوب والمخاطر المحددة",
    financialPerformanceTitle: "الأداء المالي",
    revenue: "الإيرادات",
    netIncome: "صافي الدخل",
    pdfGenerationError: "تعذر إنشاء تقرير PDF.",

    devToolsTitle: "الوصول مرفوض",
    devToolsDescription: "لأمانك وحماية أنظمتنا الخاصة، الوصول إلى أدوات المطورين مقيد في هذا التطبيق.",
    devToolsMessage: "أهلاً بك في عبدالله المصرفية. لأسباب أمنية، ميزات المطورين معطلة. إذا كنت بحاجة إلى مساعدة، يرجى الاتصال بالدعم.",
    
    newSessionButton: "جلسة جديدة",
    newSessionTitle: "بدأت جلسة جديدة",
    newSessionDesc: "تم مسح محادثتك.",
    newSessionDescDA: "تم مسح لوحة المعلومات.",
    newSessionConfirmTitle: "هل أنت متأكد؟",
    newSessionConfirmDescChat: "سيؤدي هذا إلى مسح سجل الدردشة بالكامل وإزالة أي ملفات تم تحميلها. لا يمكن التراجع عن هذا الإجراء.",
    newSessionConfirmButton: "بدء جلسة جديدة",

    // Abdullah Status
    abdullahStatusOnline: 'متصل',

    // Nav
    chatTitle: 'الدردشة',
    aboutTitle: 'للمؤسسات',
    knowledgeBaseTitle: 'قاعدة المعرفة',
    
    // Enterprise Page (New About Page)
    enterprisePageTitle: 'عبدالله للمؤسسات',
    enterpriseHeader: "منصة الذكاء الاصطناعي التوليدي للمالية الحديثة",
    enterpriseSubHeader: "عبدالله هو ذكاء اصطناعي مالي فائق الحداثة، مصمم للمتطلبات الصارمة للبنوك وشركات الاستثمار والمؤسسات الكبرى في الشرق الأوسط وخارجه. تجاوز روبوتات الدردشة البسيطة إلى نظام وكيلي بالكامل يقدم قوة تحليلية وأمانًا وقابلية للتوسع لا مثيل لها.",
    enterpriseCorePitchTitle: "من مليارات نقاط البيانات إلى ذكاء قابل للتنفيذ",
    enterpriseCorePitchP1: "تم تصميم عبدالله لمعالجة وتجميع مجموعات بيانات ضخمة - من تيرابايت من سجلات المعاملات إلى آلاف المستندات المالية المعقدة - في الوقت الفعلي تقريبًا. تحدد نماذج الذكاء الاصطناعي المخصصة لدينا، والتي تم تدريبها خصيصًا للتحليل المالي، الأنماط الحرجة وتتنبأ بالمخاطر وتولد رؤى على مستوى المؤسسات بحجم وسرعة يستحيل على الفرق البشرية وحدها تحقيقها.",
    enterpriseCorePitchP2: "استفد من هذه القوة لتسريع العناية الواجبة، وتعزيز نمذجة مخاطر الائتمان، وتزويد فرقك بمساعد استراتيجي لاتخاذ القرارات عالية المخاطر.",
    enterpriseCorePitchP3: "نظامنا مصمم للتعامل مع تعقيدات البيانات المالية الإقليمية، مما يوفر دقة وأهمية لا مثيل لها لأسواق دول مجلس التعاون الخليجي.",
    enterpriseCapabilitiesTitle: "مجموعة من القدرات القوية والمتكاملة",
    capabilityAnalysisTitle: "تحليل مالي عميق",
    capabilityAnalysisDesc: "قم بإجراء تحليل جنائي للبيانات المالية (بيان الدخل، الميزانية العمومية، التدفقات النقدية) لتقييم الصحة المالية والجدارة الائتمانية وتحديد العلامات الحمراء. يمكن لعبدالله معالجة سنوات من البيانات المالية في ثوانٍ لتقديم نظرة عامة شاملة.",
    capabilityDocIntelTitle: "معالجة ذكية للمستندات",
    capabilityDocIntelDesc: "استخرج وحلل واستعلم عن البيانات على الفور من المستندات غير المهيكلة مثل ملفات PDF والتقارير السنوية والعقود القانونية باستخدام اللغة الطبيعية. اطرح أسئلة معقدة واحصل على إجابات دقيقة مع الاستشهادات.",
    capabilityRiskTitle: "نمذجة المخاطر والاتجاهات التنبؤية",
    capabilityRiskDesc: "استخدم النماذج المدفوعة بالذكاء الاصطناعي للتنبؤ بالمسارات المالية، وتوقع درجات الائتمان بدقة عالية، وتحديد اتجاهات السوق الناشئة من بياناتك الخاصة، مع ضبط خاص لأسواق الشرق الأوسط.",
    capabilityDataTitle: "تحليل بيانات وكيلي",
    capabilityDataDesc: "تجاوز لوحات المعلومات الثابتة. أصدر أوامر لعبدالله لإجراء عمليات بيانات معقدة، وإنشاء تصورات مخصصة، والإجابة على أسئلة عميقة متعددة الأبعاد حول بياناتك في واجهة محادثة.",
    capabilityBilingualTitle: "ثنائي اللغة ومدرك للمنطقة",
    capabilityBilingualDesc: "يتقن اللغتين العربية والإنجليزية تمامًا، مع فهم دقيق للوائح المالية لدول مجلس التعاون الخليجي، والسياق الثقافي، والمصطلحات الخاصة بالسوق، مما يضمن تحليلًا دقيقًا وملائمًا.",
    capabilityKnowledgeTitle: "قاعدة معرفة قابلة للتخصيص",
    capabilityKnowledgeDesc: "عزز بشكل آمن معرفة عبدالله الأساسية بالقواعد والسياسات الداخلية والبيانات الخاصة بمؤسستك لتحليل مصمم خصيصًا لإطار عملك التشغيلي.",

    enterpriseDeploymentTitle: "نشر وأمان على مستوى المؤسسات",
    deploymentSecurityTitle: "أمان لا هوادة فيه",
    deploymentSecurityDesc: "بياناتك هي أثمن أصولك. تم بناء عبدالله على بنية خاصة أولاً مع تشفير من طرف إلى طرف. نضمن عدم استخدام بياناتك الخاصة أبدًا لتدريب النماذج الخارجية.",
    deploymentOnPremTitle: "في أماكن العمل والسحابة الخاصة",
    deploymentOnPremDesc: "حافظ على السيطرة الكاملة على بياناتك وحوسبتك. يمكن نشر عبدالله على بنيتك التحتية الخاصة أو سحابتك الخاصة، مما يضمن الامتثال لأكثر سياسات إقامة البيانات وأمانها صرامة.",
    deploymentDataTitle: "ترخيص وتكامل مرن",
    deploymentDataDesc: "نقدم نماذج ترخيص مخصصة، من الترخيص لكل مقعد إلى المؤسسة الكاملة، لتناسب احتياجات مؤسستك. يتيح الوصول القوي إلى واجهة برمجة التطبيقات التكامل السلس مع أنظمة CRM و ERP ومنصاتك المصرفية الداخلية الحالية.",
    
    enterpriseCtaTitle: "هل أنت مستعد لتحويل ذكائك المالي؟",
    enterpriseCtaDesc: "اكتشف كيف يمكن لعبدالله تمكين مؤسستك من اتخاذ قرارات أسرع وأكثر ذكاءً برؤى لا مثيل لها تعتمد على البيانات. حدد موعدًا لعرض توضيحي خاص مع فريق المؤسسات لدينا لرؤية المنصة أثناء العمل.",
    enterpriseCtaButton: "طلب عرض توضيحي",
    
    // New Sections
    complianceTitle: "مصمم للثقة والامتثال",
    complianceSAMATitle: "متوافق مع إطار SAMA",
    complianceSAMADesc: "مصمم مع الأخذ في الاعتبار الإطار التنظيمي للبنك المركزي السعودي، مما يضمن أن حلولنا المحلية تلبي متطلبات سيادة البيانات والأمان الصارمة للمؤسسات المالية في المملكة.",
    complianceISOTitle: "معتمد بشهادة ISO 27001",
    complianceISODesc: "تتوافق ممارساتنا الأمنية مع معايير ISO 27001، مما يوفر نظام إدارة أمن معلومات (ISMS) معتمد يحمي سلامة بياناتك وسريتها وتوافرها.",

    highSkillsTitle: "وظائف وكيلية عالية المهارة",
    skillAgenticTitle: "أتمتة سير العمل الوكيلية",
    skillAgenticDesc: "يمكن لعبدالله تنفيذ عمليات مالية متعددة الخطوات بشكل مستقل. من إجراء تسويات نهاية الشهر إلى إنشاء تقارير جاهزة لمجلس الإدارة، يعمل كمحلل رقمي لا يكل.",
    skillAnomalyTitle: "كشف الشذوذ الجنائي",
    skillAnomalyDesc: "باستخدام التعرف المتقدم على الأنماط، يمكن لعبدالله فحص ملايين المعاملات للإبلاغ عن الأنشطة الاحتيالية المحتملة أو انتهاكات الامتثال أو تناقضات البيانات التي قد تفلت من المراجعة البشرية.",
    skillScenarioTitle: "نمذجة السيناريوهات المعقدة",
    skillScenarioDesc: "اطلب من عبدالله نمذجة سيناريوهات 'ماذا لو' المعقدة، مثل تأثير تغييرات أسعار الفائدة على محفظة القروض أو تقلبات السوق على أداء الاستثمار، واحصل على توقعات مدعومة بالبيانات في ثوانٍ.",
    skillIntegrationTitle: "تكامل سلس للأنظمة",
    skillIntegrationDesc: "عبدالله ليس نظامًا معزولًا. يمكن دمجه مع أنظمتك المصرفية الأساسية ومستودعات البيانات وتغذية بيانات السوق لسحب ودفع المعلومات، مما يثري تحليله بالسياق في الوقت الفعلي.",

    // Data Analytics
    dataAnalyticsTitle: 'تحليلات البيانات',
    daUploadPromptTitle: "لوحة بيانات فورية",
    daUploadPromptDesc: "قم بتحميل ملف CSV أو XLSX أو PDF لإنشاء لوحة معلومات مع رؤى وتصورات.",
    daUploadButton: "تحميل ملف البيانات",
    daGeneratingDashboardTitle: 'جاري إنشاء لوحة المعلومات الخاصة بك...',
    daGeneratingDashboardDesc: 'يقوم عبدالله بتحليل بياناتك للعثور على رؤى أساسية.',
    daSummaryTitle: "ملخص الذكاء الاصطناعي",
    daKeyInsightsTitle: "الرؤى الرئيسية",
    daDownloadPdfButton: "تحميل التقرير",
    daGeneratingPdfTitle: "جاري إنشاء تقرير PDF...",
    daPdfGenerationFailedTitle: "فشل إنشاء PDF",
    daPdfGenerationFailedDesc: "حدث خطأ أثناء إنشاء تقرير PDF.",
    daUnsupportedFileType: "نوع ملف غير مدعوم",
    daDragDropValid: "أفلت الملف لبدء التحليل",
    daDragDropInvalid: "نوع ملف غير مدعوم",
    daDragDropSupported: "المدعومة: CSV ، XLSX ، PDF",
    daAnalysisFailedDesc: "تعذر إنشاء لوحة المعلومات. تحقق من تنسيق الملف أو جرب ملفًا مختلفًا.",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const browserLang = navigator.language.split('-')[0];
        const storedLang = localStorage.getItem('abdullah-lang') as Language;

        if (storedLang) {
            setLanguage(storedLang);
        } else if (browserLang === 'ar') {
            setLanguage('ar');
        }
    }
  }, []);
  
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    try {
        localStorage.setItem('abdullah-lang', language);
    } catch(e) {
        console.error("Failed to save language preference to localStorage", e);
    }
  }, [language, dir]);

  const t = (key: string, replacements?: { [key: string]: string | number }) => {
    let translation = translations[language][key] || translations['en'][key] || key;
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
