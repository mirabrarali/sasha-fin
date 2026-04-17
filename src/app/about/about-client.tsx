'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  LineChart as LineChartIcon,
  Maximize2,
  MessageSquare,
  Minimize2,
  Shield,
  Sparkles,
  Table2,
} from 'lucide-react';

import { LanguageToggle } from '@/components/language-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChatbotAvatar } from '@/components/abdullah-avatar';

type Lang = 'en' | 'ar';

type SlideChart = 'line' | 'bar' | 'area' | 'combo' | 'stack' | null;

type Slide = {
  title: string;
  subtitle: string;
  bullets: string[];
  chart: SlideChart;
};

type AboutCopy = {
  pageTitle: string;
  presentCta: string;
  exitPresent: string;
  deckHint: string;
  deckHintKeys: string;
  slideLabel: (i: number, total: number) => string;
  openChat: string;
  openSpreadsheet: string;
  scrollIntroTitle: string;
  scrollIntroLead: string;
  pillars: { title: string; desc: string }[];
  modulesTitle: string;
  modules: { title: string; desc: string; icon: 'chat' | 'analytics' | 'sheet' }[];
  automationTitle: string;
  automationLead: string;
  automationPoints: string[];
  deployTitle: string;
  deployCards: { title: string; desc: string }[];
  closingTitle: string;
  closingLead: string;
  slides: Slide[];
};

const MIX_DATA = [
  { name: 'Ops', value: 28 },
  { name: 'Risk', value: 22 },
  { name: 'RM', value: 18 },
  { name: 'Finance', value: 32 },
  { name: 'Treasury', value: 24 },
  { name: 'Compliance', value: 20 },
];

/** Illustrative quarterly KPIs for deck storytelling (not live bank figures). */
const QUARTERLY_KPIS = [
  { quarter: 'Q1', revenue: 42.1, expense: 28.4, netMargin: 13.7 },
  { quarter: 'Q2', revenue: 48.6, expense: 30.1, netMargin: 18.5 },
  { quarter: 'Q3', revenue: 46.2, expense: 29.7, netMargin: 16.5 },
  { quarter: 'Q4', revenue: 55.4, expense: 31.9, netMargin: 23.5 },
  { quarter: 'Q1+1', revenue: 58.0, expense: 32.8, netMargin: 25.2 },
  { quarter: 'Q2+1', revenue: 61.3, expense: 33.5, netMargin: 27.8 },
];

/** Illustrative stacked mix by quarter for presentation slides. */
const BU_MIX_QUARTERS = [
  { quarter: 'Q1', retail: 22, corporate: 18, riskOps: 10, treasury: 8 },
  { quarter: 'Q2', retail: 24, corporate: 19, riskOps: 11, treasury: 9 },
  { quarter: 'Q3', retail: 23, corporate: 21, riskOps: 12, treasury: 9 },
  { quarter: 'Q4', retail: 26, corporate: 22, riskOps: 13, treasury: 10 },
];

const COPY: Record<Lang, AboutCopy> = {
  en: {
    pageTitle: 'Banking Chatbot',
    presentCta: 'Present',
    exitPresent: 'Exit presentation',
    deckHint: 'Press Enter for the next slide',
    deckHintKeys: '← → to move · Esc to close',
    slideLabel: (i, total) => `Slide ${i + 1} of ${total}`,
    openChat: 'Open chat workspace',
    openSpreadsheet: 'Open spreadsheet workspace',
    scrollIntroTitle: 'Built for bank business teams',
    scrollIntroLead:
      'Banking Chatbot is a focused workspace where relationship managers, operations, risk, and finance leaders get faster answers from the same documents and numbers they already trust—without changing core systems overnight.',
    pillars: [
      {
        title: 'Fewer handoffs',
        desc: 'Teams ask once, see structured outputs, and keep a clear thread from question to chart to narrative.',
      },
      {
        title: 'Consistent judgment',
        desc: 'Repeatable prompts and institutional wording help align front-office and control functions around the same facts.',
      },
      {
        title: 'Audience-ready visuals',
        desc: 'Charts and summaries are composed for committees, huddles, and client conversations—not just back-office logs.',
      },
    ],
    modulesTitle: 'Where the bank saves the most time',
    modules: [
      {
        title: 'Chat workspace',
        desc: 'Upload statements, ledgers, journals, spreadsheets, or exports. Ask in plain language, compare periods, request charts, and keep context in one conversation your teams can revisit.',
        icon: 'chat',
      },
      {
        title: 'Data analytics',
        desc: 'Move from static packs to guided exploration: trends, concentration, and simple scenario views that leadership can scan in minutes.',
        icon: 'analytics',
      },
      {
        title: 'Spreadsheet intelligence',
        desc: 'Treat large tables as a governed source: validate ranges, explain anomalies, and draft commentary that references the cells you care about.',
        icon: 'sheet',
      },
    ],
    automationTitle: 'Automation that feels executive-grade',
    automationLead:
      'Routine reading, reconciliation narratives, and first-pass quality checks become repeatable—so specialists spend time on exceptions, not formatting.',
    automationPoints: [
      'Standard first responses for credit packs, MIS commentary, and policy Q&A.',
      'Parallel workstreams for RM desks and operations without duplicating sensitive files.',
      'Clear outputs you can walk through live with stakeholders—especially in presentation mode.',
    ],
    deployTitle: 'Deployment your board will recognize',
    deployCards: [
      {
        title: 'In-house & on‑premises',
        desc: 'Designed to run inside your perimeter when required, with models and data paths you control—no dependency on public consumer chat services.',
      },
      {
        title: 'Hardened delivery',
        desc: 'Full-stack deployment patterns that match bank security expectations: segregation, monitoring, and change control friendly workflows.',
      },
      {
        title: 'Efficient footprint',
        desc: 'Optimized inference so you can scale usage without oversized GPU estates—right-sized for production banking workloads.',
      },
    ],
    closingTitle: 'Show it in a room. Ship it to a branch.',
    closingLead:
      'Use presentation mode for a clean, full-screen storyline, then invite colleagues into the chat workspace to stress-test real files.',
    slides: [
      {
        title: 'Banking Chatbot',
        subtitle: 'Executive briefing for bank business leaders',
        bullets: [
          'A single workspace where documents, numbers, and natural-language dialogue stay aligned with how relationship, operations, risk, and finance teams already collaborate.',
          'Outputs are composed for committees and client conversations—charts, tables, and narratives you can walk through live instead of stitching fragments by hand.',
          'Presentation mode delivers a calm full-screen storyline for boards and huddles; chat and spreadsheet areas stay available when colleagues stress-test real files.',
          'Named simply Banking Chatbot so internal rollout stays focused on workflow value rather than external vendor messaging.',
        ],
        chart: null,
      },
      {
        title: 'Why banks adopt it now',
        subtitle: 'Speed without sacrificing control',
        bullets: [
          'Compress weeks of first-pass reading into hours of guided review while humans retain approval rights on every material decision.',
          'Repeatable prompts and institutional phrasing reduce drift between front office, operations, and control functions.',
          'Lean inference footprint scales daily usage without oversized processing estates sized for consumer experiments.',
          'Clear trails from question to cited cells or passages make exceptions easier to defend with supervisors and internal audit.',
        ],
        chart: 'line',
      },
      {
        title: 'Operational truth RM and control teams share',
        subtitle: 'From reconciliations to committee packets',
        bullets: [
          'Relationship managers stay tethered to the same extracts, ledgers, and commentary drafts that operations and finance validate.',
          'Risk and compliance reviewers see structured summaries with pointers back to underlying rows or pages—less ambiguity about what changed.',
          'Period-over-period narratives explain drivers, not only deltas on a dashboard, so leadership can skim a storyline before the deep dive.',
          'Anomalies and concentration shifts surface with enough context to decide whether they warrant a policy exception or data cleansing.',
        ],
        chart: 'area',
      },
      {
        title: 'Chat workspace',
        subtitle: 'Upload, ask, and iterate in one thread',
        bullets: [
          'Carry PDFs, CSV exports, Excel extracts, journals, and policy PDFs side by side while the assistant answers in plain language.',
          'Request inline charts when you need a visual anchor for a morning huddle or steering committee without rebuilding a BI workbook.',
          'Threads preserve decision context so specialists can pick up a file mid-review without replaying verbal handoffs.',
          'Responses stay tied to the documents you supplied, reducing speculation beyond your approved material.',
        ],
        chart: 'combo',
      },
      {
        title: 'Data analytics',
        subtitle: 'Complement—not replace—your BI stack',
        bullets: [
          'Slice concentration, vintage behaviour, and simple scenario views in minutes when leadership asks an unplanned question.',
          'Summaries translate metrics into language executives recognize, closing the gap between what printed and what actually moved.',
          'Parallel exploration lets risk and RM desks iterate on the same export concurrently without duplicating sensitive paths.',
          'Outputs slot alongside existing scorecards so teams do not rip out governance models overnight.',
        ],
        chart: 'bar',
      },
      {
        title: 'Dedicated spreadsheet workspace',
        subtitle: 'Grids you govern, answers you can trace',
        bullets: [
          'Open large operational or finance tables in a purpose-built surface with filters, formatting, and familiar grid navigation.',
          'Ask the assistant to validate ranges, explain outliers, or draft variance commentary tied to the exact cells you highlight.',
          'Chart builder turns selected columns into board-ready visuals without round-tripping through desktop publishing.',
          'Exports and summaries stay inside your controlled workspace so sensitive numbers are less likely to leak through ad-hoc screenshots.',
        ],
        chart: 'stack',
      },
      {
        title: 'From rows to review-ready narratives',
        subtitle: 'Imports, charts, and packaged summaries',
        bullets: [
          'Bring month-end closings, limit schedules, or branch KPI packs; keep structure intact while you annotate and narrate.',
          'Cross-foot checks and plain-language explanations help controllers sign off faster when time is short before filing.',
          'Packaged narrative summaries carry bank wording conventions so committees receive coherent packets, not scattered highlights.',
          'Cell-level references in generated text give reviewers a fast path back to the evidence behind each sentence.',
        ],
        chart: 'combo',
      },
      {
        title: 'Analytics leadership can skim',
        subtitle: 'Board-friendly views on demand',
        bullets: [
          'Directional trends, expense discipline, and margin quality appear in visuals tuned for a single glance in large rooms.',
          'Colour and scale defaults follow accessible patterns so packs remain legible when projected for wide audiences.',
          'When questions arise mid-meeting, presenters pivot to supporting detail without reopening ten source files.',
          'Illustrative charts in this deck are labelled as storytelling—not live bank figures—mirroring in-product disclosure patterns.',
        ],
        chart: 'line',
      },
      {
        title: 'Automation map',
        subtitle: 'Where teams reclaim capacity',
        bullets: [
          'First-line document triage, MIS commentary drafts, and policy explainers replace repetitive reading cycles.',
          'Fewer swivel-chair moments between risk, operations, and relationship coverage because everyone references the same outputs.',
          'Exception queues shrink when routine checks run consistently before human reviewers see a file.',
          'Specialists spend judgment time on outliers while the assistant handles volume and formatting hygiene.',
        ],
        chart: 'bar',
      },
      {
        title: 'Secure, efficient deployment',
        subtitle: 'Designed for regulated environments',
        bullets: [
          'In-house and on‑premises options keep sensitive workloads inside your boundary when policy requires it.',
          'Segregated paths, monitoring hooks, and change-control-friendly delivery match bank security expectations.',
          'Lean footprint targets sustained production banking loads rather than one-off lab demonstrations.',
          'Operational playbooks cover rollback, key rotation, and model refresh without surprising the business.',
        ],
        chart: null,
      },
      {
        title: 'Bilingual and regional fit',
        subtitle: 'Same storyline in English and Arabic',
        bullets: [
          'Toggle language without rebuilding decks so regional hubs and head office stay aligned on terminology.',
          'Right-to-left layout preserves readability for Arabic audiences during walkthroughs and training.',
          'Committee-ready phrasing adapts to local regulatory vocabulary while keeping numeric references consistent.',
          'Presentation mode respects the active language so screen shares stay professional in either direction.',
        ],
        chart: 'stack',
      },
      {
        title: 'Next step',
        subtitle: 'Take colleagues through the experience',
        bullets: [
          'Open the chat workspace with a sample portfolio file or anonymized export and walk through one real question end to end.',
          'Load a spreadsheet extract in the dedicated grid workspace and ask for variance commentary tied to highlighted cells.',
          'Use presentation mode anytime you need a calm, full-screen storyline for leadership or branch champions.',
          'Capture feedback on missing controls so delivery teams can harden the rollout before broad production.',
        ],
        chart: null,
      },
    ],
  },
  ar: {
    pageTitle: 'المساعد المصرفي',
    presentCta: 'عرض تقديمي',
    exitPresent: 'إنهاء العرض',
    deckHint: 'اضغط Enter للانتقال إلى الشريحة التالية',
    deckHintKeys: '← → للتنقل · Esc للإغلاق',
    slideLabel: (i, total) => `الشريحة ${i + 1} من ${total}`,
    openChat: 'فتح مساحة المحادثة',
    openSpreadsheet: 'فتح مساحة الجداول',
    scrollIntroTitle: 'مصمم لفرق الأعمال في المصارف',
    scrollIntroLead:
      'المساعد المصرفي (Banking Chatbot) مساحة عمل موحّدة يستخدم فيها مدراء العلاقات والعمليات والمخاطر والمالية لغة طبيعية على نفس المستندات والأرقام المعتمدة—دون إعادة هيكلة أنظمة البنك دفعة واحدة.',
    pillars: [
      {
        title: 'تقليل التنقل بين الأقسام',
        desc: 'سؤال واحد، إجابة منظّمة، ومسار واضح من السؤال إلى الرسم البياني ثم الملخص.',
      },
      {
        title: 'اتساق في الصياغة',
        desc: 'قوالب مؤسسية تساعد الواجهات الأمامية ووظائف الرقابة على الاعتماد على نفس الوقائع.',
      },
      {
        title: 'جاهزية للعرض',
        desc: 'رسوم وملخصات تصلح للجان ولقاءات الإدارة وليس فقط سجلات خلفية.',
      },
    ],
    modulesTitle: 'أين يوفّر البنك أكبر وقت',
    modules: [
      {
        title: 'مساحة المحادثة',
        desc: 'حمّل القوائم المالية أو دفاتر الأستاذ أو اليوميات أو الجداول أو الملفات المستخرجة. اسأل بلغة يومية، قارن الفترات، اطلب رسومًا بيانية، واحتفظ بالسياق في محادثة واحدة.',
        icon: 'chat',
      },
      {
        title: 'تحليلات البيانات',
        desc: 'انتقال من تقارير ثابتة إلى استكشاف موجّه: اتجاهات، تركز، ومناظر بسيطة يلخصها المسؤولون بسرعة.',
        icon: 'analytics',
      },
      {
        title: 'ذكاء الجداول',
        desc: 'التعامل مع الجداول الكبيرة كمصدر محكوم: التحقق من النطاقات، تفسير الشذوذ، وصياغة تعليقات تشير إلى الخلايا المهمة.',
        icon: 'sheet',
      },
    ],
    automationTitle: 'أتمتة بمستوى تنفيذي',
    automationLead:
      'القراءة الروتينية ومسودات التعليق على التسويات والفحص الأولي يصبح متكررًا—ليعمل الخبراء على الاستثناءات لا على التنسيق.',
    automationPoints: [
      'استجابات أولية موحّدة لملفات الائتمان وتعليقات MIS وأسئلة السياسات.',
      'مسارات عمل متوازية لمديري العلاقات والعمليات دون تكرار الملفات الحساسة.',
      'مخرجات واضحة يمكن عرضها مباشرة مع أصحاب المصلحة—خصوصًا في وضع العرض.',
    ],
    deployTitle: 'نشر يفهمه مجلس الإدارة',
    deployCards: [
      {
        title: 'داخلي وعلى البنية الخاصة',
        desc: 'مصمم للعمل داخل نطاقكم عند الحاجة، مع مسارات بيانات ونماذج تتحكمون بها—دون الاعتماد على خدمات محادثة عامة للمستهلك.',
      },
      {
        title: 'تسليم مقوّى',
        desc: 'أنماط نشر متكاملة تناسب توقعات أمن المصارف: عزل، مراقبة، وسير عمل يتوافق مع ضبط التغيير.',
      },
      {
        title: 'بصمة فعّالة',
        desc: 'استدلال محسّن للتوسع دون مزارع معالجة مبالغ فيها—مناسب لأعباء الإنتاج المصرفي.',
      },
    ],
    closingTitle: 'اعرضه في القاعة. ثم انقله للفرع.',
    closingLead:
      'استخدم وضع العرض لسرد واضح بملء الشاشة، ثم ادعُ الزملاء إلى مساحة المحادثة لاختبار ملفات حقيقية أو مجهّلة.',
    slides: [
      {
        title: 'Banking Chatbot',
        subtitle: 'موجز تنفيذي لقادة الأعمال المصرفية',
        bullets: [
          'مساحة واحدة تجمع المستندات والأرقام والحوار بلغة طبيعية بما يتوافق مع تعاون علاقات العملاء والعمليات والمخاطر والمالية.',
          'مخرجات مؤلفة للجان ولقاءات العملاء—جداول ورسوم وملخصات يمكن سردها مباشرة دون تجميع شظايا يدويًا.',
          'وضع العرض يمنح سردًا هادئًا بملء الشاشة لمجالس الإدارة والاجتماعات السريعة، مع بقاء مساحتي المحادثة والجداول جاهزتين لاختبار ملفات حقيقية.',
          'تسمية موحّدة «Banking Chatbot» ليبقى التركيز على قيمة سير العمل لا على تسويق طرف خارجي.',
        ],
        chart: null,
      },
      {
        title: 'لماذا يعتمد البنك عليه الآن',
        subtitle: 'سرعة مع الحفاظ على الضوابط',
        bullets: [
          'ضغط أسابيع القراءة الأولية في ساعات مراجعة موجّهة مع بقاء قرارات المواد المهمة بيد الإنسان.',
          'قوالب متكررة وصياغة مؤسسية تقلل انحراف الرسائل بين الواجهة الأمامية والعمليات والرقابة.',
          'بصمة استدلال خفيفة تسمح بتوسيع الاستخدام اليومي دون بنية معالجة مبالغ فيها مخصصة للمستهلك.',
          'مسارات واضحة من السؤال إلى الخلايا أو الفقرات المستشهد بها تسهّل الدفاع عن الاستثناءات أمام المشرفين والتدقيق الداخلي.',
        ],
        chart: 'line',
      },
      {
        title: 'حقيقة تشغيلية يتقاسمها RM والرقابة',
        subtitle: 'من التسويات إلى حزم اللجان',
        bullets: [
          'مدراء العلاقات يبقون مرتبطين بنفس المستخرجات والدفاتر ومسودات التعليق التي تعتمدها العمليات والمالية.',
          'مراجعو المخاطر والالتزام يرون ملخصات منظمة مع إشارات إلى الصفوف أو الصفحات الأساسية—أقل غموضًا حول ما تغيّر.',
          'سرد فترة بفترة يشرح المحفزات لا الفروق فقط على لوحة المؤشرات ليلخص القيادة قبل الغوص العميق.',
          'الشذوذ وتحولات التركز تظهر بسياق يكفي لاتخاذ قرار الاستثناء السياسي أو تنقية البيانات.',
        ],
        chart: 'area',
      },
      {
        title: 'مساحة المحادثة',
        subtitle: 'حمّل، اسأل، كرّر في خيط واحد',
        bullets: [
          'تعامل مع PDF وCSV وExcel واليوميات وسياسات PDF جنبًا إلى جنب مع إجابات بلغة يومية.',
          'اطلب رسومًا داخل المحادثة عند الحاجة لتثبيت بصري في اجتماع صباحي أو لجنة دون إعادة بناء مصنف ذكاء أعمال.',
          'الخيوط تحفظ سياق القرار ليستأنف الخبراء المراجعة دون إعادة تلخيص شفهي.',
          'الإجابات مرتبطة بالمستندات التي زودتم بها لتقليل الاجتهاد خارج المواد المعتمدة.',
        ],
        chart: 'combo',
      },
      {
        title: 'تحليلات البيانات',
        subtitle: 'تكمّل منصات ذكاء الأعمال دون استبدالها',
        bullets: [
          'قطع تركز وسلوك أعمار وسيناريوهات بسيطة في دقائق عند أسئلة غير مخططة من القيادة.',
          'ملخصات تترجم المؤشرات إلى لغة تنفيذية تغلق الفجوة بين ما طُبع وما تحرك فعليًا.',
          'استكشاف متوازٍ لمكاتب المخاطر وعلاقات العملاء على نفس التصدير دون تكرار مسارات حساسة.',
          'مخرجات تنسجم مع لوحات القياس القائمة دون إزالة نماذج الحوكمة دفعة واحدة.',
        ],
        chart: 'bar',
      },
      {
        title: 'مساحة جداول مخصصة',
        subtitle: 'جداول تحكمون بها وإجابات قابلة للتتبع',
        bullets: [
          'افتح جداول عمليات أو مالية كبيرة في واجهة مخصصة مع تصفية وتنسيق وتنقل شبكي مألوف.',
          'اطلب من المساعد التحقق من النطاقات أو تفسير الشواذ أو صياغة تعليق تباين مرتبط بالخلايا التي تبرزونها.',
          'منشئ الرسوم يحوّل الأعمدة المختارة إلى مناظر جاهزة للمجلس دون التنقل بين أدوات نشر سطح المكتب.',
          'المخرجات والملخصات تبقى داخل المساحة المحكومة لتقليل تسرّب أرقام حساسة عبر لقطات عشوائية.',
        ],
        chart: 'stack',
      },
      {
        title: 'من الصفوف إلى سرد جاهز للمراجعة',
        subtitle: 'استيراد ورسوم وملخصات معبأة',
        bullets: [
          'أحضروا إغلاقات الشهر أو جداول الحدود أو حزم مؤشرات الفروع مع الحفاظ على البنية أثناء التعليق والسرد.',
          'فحوصات توازن وتفسيرات بلغة بسيطة تسرّع توقيع المراقب المالي عند ضيق الوقت قبل الإيداع.',
          'ملخصات سردية معبأة بصياغة بنكية لتصل اللجان بحزم متماسكة لا بشظايا متفرقة.',
          'إشارات على مستوى الخلية في النص المولّد تعطي المراجعين مسارًا سريعًا إلى الدليل وراء كل جملة.',
        ],
        chart: 'combo',
      },
      {
        title: 'تحليلات يلخصها القادة',
        subtitle: 'مناظر صديقة للمجلس عند الطلب',
        bullets: [
          'اتجاهات اتجاهية وانضباط مصاريف وجودة هوامش في رسوم مضبوطة لنظرة واحدة في قاعات كبيرة.',
          'اختيارات لون ومقياس تتبع أنماطًا سهلة القراءة عند العرض على شاشات واسعة.',
          'عند أسئلة أثناء الاجتماع ينتقل المقدّم إلى التفاصيل الداعمة دون فتح عشرة ملفات مصدر.',
          'الرسوم التوضيحية هنا مسمّاة كسرد قصصي—وليست أرقام بنك حية—بما يعكس أنماط الإفصاح داخل المنتج.',
        ],
        chart: 'line',
      },
      {
        title: 'خريطة الأتمتة',
        subtitle: 'أين تستعيد الفرق الطاقة',
        bullets: [
          'فرز أولي للمستندات ومسودات تعليق MIS وشرح السياسات يحل محل دورات قراءة متكررة.',
          'تقليل التنقل بين المخاطر والعمليات والتغطية لأن الجميع يشير إلى نفس المخرجات.',
          'طوابير الاستثناءات تنكمش عندما تمر الفحوصات الروتينية بانتظام قبل وصول الملف للمراجع البشري.',
          'يخصص الخبراء وقتهم للشواذ بينما المساعد يتولى الحجم ونظافة التنسيق.',
        ],
        chart: 'bar',
      },
      {
        title: 'نشر آمن وفعّال',
        subtitle: 'للبيئات الخاضعة للرقابة',
        bullets: [
          'خيارات داخلية وعلى البنية الخاصة تحافظ على الأحمال الحساسة داخل نطاقكم عندما تفرض السياسة ذلك.',
          'مسارات معزولة وخطافات مراقبة وتسليم يتوافق مع ضبط التغيير يلائم توقعات أمن المصارف.',
          'بصمة خفيفة تستهدف أعباء الإنتاج المصرفي المستدام لا عروض المختبر لمرة واحدة.',
          'أدلة تشغيل تغطي التراجع وتدوير المفاتيح وتحديث النماذج دون مفاجأة الأعمال.',
        ],
        chart: null,
      },
      {
        title: 'ثنائية اللغة والملاءمة الإقليمية',
        subtitle: 'نفس السرد بالعربية والإنجليزية',
        bullets: [
          'تبديل اللغة دون إعادة بناء الشرائح ليبقى الحوكام متسقًا بين المراكز الإقليمية والمركز.',
          'تخطيط من اليمين لليسار يحافظ على وضوح العربية أثناء العروض والتدريب.',
          'صياغة جاهزة للجان تتكيف مع المصطلحات التنظيمية المحلية مع ثبات المراجع الرقمية.',
          'وضع العرض يحترم اللغة النشطة لتبقى المشاركة الشاشة مهنية في الاتجاهين.',
        ],
        chart: 'stack',
      },
      {
        title: 'الخطوة التالية',
        subtitle: 'مرّر الزملاء على التجربة',
        bullets: [
          'افتح مساحة المحادثة بملف محفظة تجريبي أو تصدير مجهّل وامشِ سؤالًا حقيقيًا من البداية للنهاية.',
          'حمّل تصديرًا جدوليًا في مساحة الشبكة المخصصة واطلب تعليق تباين مرتبطًا بالخلايا المبرزة.',
          'استخدم وضع العرض متى احتجتم سردًا هادئًا بملء الشاشة للقيادة أو أبطال الفروع.',
          'دوّن ملاحظات على الضوابط الناقصة لتقوية الإطلاق قبل الإنتاج الواسع.',
        ],
        chart: null,
      },
    ],
  },
};

function DeckChart({ chart, dark }: { chart: Exclude<SlideChart, null>; dark: boolean }) {
  const axis = dark ? '#94a3b8' : 'hsl(var(--muted-foreground))';
  const grid = dark ? '#334155' : 'hsl(var(--border))';
  const tooltipBg = dark ? '#0f172a' : 'hsl(var(--card))';
  const tooltipFg = dark ? '#e2e8f0' : 'hsl(var(--foreground))';

  const tooltipStyle = {
    backgroundColor: tooltipBg,
    border: `1px solid ${dark ? '#1e293b' : 'hsl(var(--border))'}`,
    borderRadius: 8,
    color: tooltipFg,
    fontSize: 12,
  };

  const chartWrap = 'mt-8 h-60 w-full md:h-64';

  if (chart === 'line') {
    return (
      <div className={chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={QUARTERLY_KPIS} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} opacity={0.6} />
            <XAxis dataKey="quarter" tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} />
            <YAxis tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} width={36} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: axis }} />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={dark ? '#38bdf8' : 'hsl(var(--primary))'}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke={dark ? '#f472b6' : 'hsl(var(--chart-2))'}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart === 'area') {
    return (
      <div className={chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={QUARTERLY_KPIS} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="aboutAreaDeck" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={dark ? '#34d399' : 'hsl(var(--primary))'} stopOpacity={0.35} />
                <stop offset="100%" stopColor={dark ? '#34d399' : 'hsl(var(--primary))'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} opacity={0.6} />
            <XAxis dataKey="quarter" tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} />
            <YAxis tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} width={36} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: axis }} />
            <Area
              type="monotone"
              dataKey="netMargin"
              name="Net margin"
              stroke={dark ? '#34d399' : 'hsl(var(--primary))'}
              fill="url(#aboutAreaDeck)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart === 'combo') {
    return (
      <div className={chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={QUARTERLY_KPIS} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} opacity={0.6} />
            <XAxis dataKey="quarter" tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} />
            <YAxis yAxisId="left" tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} width={36} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} width={36} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: axis }} />
            <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill={dark ? '#38bdf8' : 'hsl(var(--primary))'} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar yAxisId="left" dataKey="expense" name="Expense" fill={dark ? '#475569' : 'hsl(var(--muted-foreground))'} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="netMargin"
              name="Net margin"
              stroke={dark ? '#fbbf24' : 'hsl(var(--chart-4))'}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart === 'stack') {
    return (
      <div className={chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={BU_MIX_QUARTERS} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} opacity={0.6} />
            <XAxis dataKey="quarter" tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} />
            <YAxis tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} width={36} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: axis }} />
            <Bar dataKey="retail" name="Retail" stackId="mix" fill={dark ? '#38bdf8' : 'hsl(var(--primary))'} />
            <Bar dataKey="corporate" name="Corporate" stackId="mix" fill={dark ? '#818cf8' : 'hsl(var(--chart-2))'} />
            <Bar dataKey="riskOps" name="Risk & ops" stackId="mix" fill={dark ? '#34d399' : 'hsl(var(--chart-3))'} />
            <Bar dataKey="treasury" name="Treasury" stackId="mix" fill={dark ? '#fbbf24' : 'hsl(var(--chart-4))'} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className={chartWrap}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={MIX_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} opacity={0.6} />
          <XAxis dataKey="name" tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} />
          <YAxis tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} width={32} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 10, color: axis }} />
          <Bar dataKey="value" name="Share" fill={dark ? '#a78bfa' : 'hsl(var(--primary))'} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ModuleIcon({ kind }: { kind: 'chat' | 'analytics' | 'sheet' }) {
  const cls = 'h-6 w-6';
  if (kind === 'chat') return <MessageSquare className={cls} />;
  if (kind === 'analytics') return <BarChart3 className={cls} />;
  return <Table2 className={cls} />;
}

function ScrollIllustration() {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-background to-muted/40 p-6 shadow-sm">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="relative h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={QUARTERLY_KPIS} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="quarter" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={32} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={32} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }} />
            <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="netMargin"
              name="Net margin"
              stroke="hsl(var(--chart-4))"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Illustrative KPIs — for storytelling, not live bank figures.</p>
    </div>
  );
}

export default function AboutPageClient() {
  const { language, dir } = useLanguage();
  const s = COPY[language];
  const [present, setPresent] = useState(false);
  const [slide, setSlide] = useState(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const totalSlides = s.slides.length;

  const exitPresent = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
    setPresent(false);
    setSlide(0);
  }, []);

  const enterPresent = useCallback(async () => {
    setSlide(0);
    setPresent(true);
    requestAnimationFrame(async () => {
      try {
        await shellRef.current?.requestFullscreen();
      } catch {
        /* fullscreen optional */
      }
    });
  }, []);

  const goNext = useCallback(() => {
    setSlide((i) => Math.min(i + 1, totalSlides - 1));
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setSlide((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        void exitPresent();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [present, goNext, goPrev, exitPresent]);

  useEffect(() => {
    if (!present) return;
    const onFs = () => {
      if (!document.fullscreenElement) {
        setPresent(false);
        setSlide(0);
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [present]);

  const progress = ((slide + 1) / totalSlides) * 100;
  const current = s.slides[slide]!;

  return (
    <div ref={shellRef} className="flex min-h-0 flex-1 flex-col bg-background text-foreground" dir={dir}>
      {!present && (
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="hidden h-6 w-px bg-border sm:block" />
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" aria-hidden />
                <span className="text-sm font-semibold tracking-tight md:text-base">{s.pageTitle}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="hidden gap-1.5 font-medium sm:inline-flex" onClick={() => void enterPresent()}>
                <Maximize2 className="h-4 w-4" aria-hidden />
                {s.presentCta}
              </Button>
              <LanguageToggle />
            </div>
          </div>
        </header>
      )}

      <main className={`min-h-0 flex-1 overflow-y-auto ${present ? 'hidden' : ''}`} aria-hidden={present}>
        <div className="mx-auto max-w-6xl space-y-20 px-4 pb-24 pt-10 md:px-8 md:pt-14">
          <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                Banking Chatbot
              </div>
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-[2.75rem] lg:leading-[1.15]">
                {s.scrollIntroTitle}
              </h1>
              <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">{s.scrollIntroLead}</p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-xl px-8 font-semibold shadow-md">
                  <Link href="/chat">{s.openChat}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl px-8 font-semibold">
                  <Link href="/spreadsheet">{s.openSpreadsheet}</Link>
                </Button>
                <Button variant="outline" size="lg" className="rounded-xl gap-2 font-semibold sm:hidden" onClick={() => void enterPresent()}>
                  <Maximize2 className="h-4 w-4" aria-hidden />
                  {s.presentCta}
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-6 lg:items-end">
              <ChatbotAvatar className="h-28 w-28 shadow-lg ring-4 ring-primary/10 md:h-32 md:w-32" />
              <ScrollIllustration />
            </div>
          </section>

          <section>
            <div className="grid gap-6 md:grid-cols-3">
              {s.pillars.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border bg-card/80 p-6 shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md dark:ring-white/[0.06]"
                >
                  <h2 className="text-lg font-semibold tracking-tight">{p.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-10">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{s.modulesTitle}</h2>
              <div className="h-1 w-16 rounded-full bg-primary" />
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {s.modules.map((m) => (
                <div
                  key={m.title}
                  className="group flex flex-col rounded-2xl border bg-gradient-to-b from-card to-muted/20 p-6 shadow-sm ring-1 ring-black/[0.03] transition-all hover:-translate-y-0.5 hover:shadow-lg dark:ring-white/[0.06]"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ModuleIcon kind={m.icon} />
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight">{m.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
                  <div className="mt-6 flex items-center gap-1 text-xs font-medium text-primary opacity-80 group-hover:opacity-100">
                    <LineChartIcon className="h-3.5 w-3.5" aria-hidden />
                    <span>{language === 'ar' ? 'جاهز للرسوم داخل المحادثة' : 'Charts inside chat when you need them'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-10 rounded-3xl border bg-muted/20 p-8 md:grid-cols-2 md:p-12 lg:gap-14">
            <div className="space-y-5">
              <h2 className="text-3xl font-semibold tracking-tight">{s.automationTitle}</h2>
              <p className="text-muted-foreground leading-relaxed">{s.automationLead}</p>
              <ul className="space-y-3 text-sm leading-relaxed text-foreground">
                {s.automationPoints.map((line) => (
                  <li key={line} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex min-h-[240px] flex-col justify-center rounded-2xl border bg-background p-4 shadow-inner">
              <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {language === 'ar' ? 'توزيع مثال للفريق' : 'Illustrative team mix'}
              </p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MIX_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={28} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="space-y-10">
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">{s.deployTitle}</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {s.deployCards.map((c) => (
                <div key={c.title} className="rounded-2xl border border-primary/15 bg-card p-6 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Shield className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold">{c.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background px-6 py-12 text-center md:px-16 md:py-16">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{s.closingTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground leading-relaxed">{s.closingLead}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary" className="rounded-xl px-8 font-semibold">
                <Link href="/chat">{s.openChat}</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="rounded-xl px-8 font-semibold">
                <Link href="/spreadsheet">{s.openSpreadsheet}</Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-xl gap-2 font-semibold" onClick={() => void enterPresent()}>
                <Maximize2 className="h-4 w-4" aria-hidden />
                {s.presentCta}
              </Button>
            </div>
          </section>
        </div>
      </main>

      {present && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50"
          dir={dir}
          role="dialog"
          aria-modal="true"
          aria-label={s.presentCta}
        >
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 md:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Banking Chatbot</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5 bg-white/10 text-white hover:bg-white/20"
                onClick={() => void goPrev()}
                disabled={slide === 0}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5 bg-white/10 text-white hover:bg-white/20"
                onClick={() => void goNext()}
                disabled={slide >= totalSlides - 1}
              >
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button type="button" variant="secondary" size="sm" className="gap-1.5 bg-white/10 text-white hover:bg-white/20" onClick={() => void exitPresent()}>
                <Minimize2 className="h-4 w-4" aria-hidden />
                {s.exitPresent}
              </Button>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center px-6 py-8 md:px-16 lg:px-24">
            <p className="mb-3 text-xs font-medium text-sky-300/90">{s.slideLabel(slide, totalSlides)}</p>
            <h2 className="max-w-4xl text-balance text-3xl font-semibold tracking-tight md:text-5xl lg:text-[3.25rem] lg:leading-tight">
              {current.title}
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-slate-300 md:text-xl">{current.subtitle}</p>
            <ul className="mt-8 max-w-3xl space-y-4 text-base leading-relaxed text-slate-200 md:text-lg">
              {current.bullets.map((b) => (
                <li key={b} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            {current.chart ? <DeckChart chart={current.chart} dark /> : null}
          </div>

          <div className="border-t border-white/10 bg-black/20 px-4 py-4 md:px-8">
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              <Progress value={progress} className="h-1.5 bg-white/10" />
              <div className="flex flex-col justify-between gap-2 text-xs text-slate-400 sm:flex-row sm:items-center">
                <span>{s.deckHint}</span>
                <span className="text-slate-500">{s.deckHintKeys}</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <Button asChild type="button" variant="secondary" size="sm" className="gap-1.5 bg-white/10 text-white hover:bg-white/20">
                  <Link href="/chat">{s.openChat}</Link>
                </Button>
                <Button asChild type="button" variant="secondary" size="sm" className="gap-1.5 bg-white/10 text-white hover:bg-white/20">
                  <Link href="/spreadsheet">{s.openSpreadsheet}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
