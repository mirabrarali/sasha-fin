'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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

type SlideChart = 'line' | 'bar' | 'area' | null;

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

const TREND_DATA = [
  { label: 'Q1', value: 38 },
  { label: 'Q2', value: 52 },
  { label: 'Q3', value: 47 },
  { label: 'Q4', value: 64 },
];

const MIX_DATA = [
  { name: 'Ops', value: 28 },
  { name: 'Risk', value: 22 },
  { name: 'RM', value: 18 },
  { name: 'Finance', value: 32 },
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
          'One assistant for documents, data, and dialogue—aligned to how banks already work.',
          'Branded simply as Banking Chatbot; ready for internal rollout narratives.',
        ],
        chart: null,
      },
      {
        title: 'Why banks adopt it now',
        subtitle: 'Speed without sacrificing control',
        bullets: [
          'Compress weeks of reading into hours of guided review.',
          'Keep humans in charge while the assistant handles volume and repetition.',
        ],
        chart: 'line',
      },
      {
        title: 'Chat that carries the file with it',
        subtitle: 'Purpose-built for banking conversations',
        bullets: [
          'Natural-language Q&A across PDFs, CSV, Excel, journals, and text extracts.',
          'Inline charts when teams ask for a view—ideal for huddles and committees.',
        ],
        chart: 'area',
      },
      {
        title: 'Analytics leadership can skim',
        subtitle: 'From metrics to meaning',
        bullets: [
          'Trend views and concentration stories that complement existing BI stacks.',
          'Narratives that explain what moved—not just what printed on a page.',
        ],
        chart: 'bar',
      },
      {
        title: 'Spreadsheet-heavy operations',
        subtitle: 'Accuracy at branch and HQ scale',
        bullets: [
          'Ground answers in the rows you provide—ideal for operations and finance control.',
          'Reduce copy‑paste errors between Excel and email by answering inside the workspace.',
        ],
        chart: 'bar',
      },
      {
        title: 'Automation map',
        subtitle: 'Where teams reclaim capacity',
        bullets: [
          'First-line document triage, MIS commentary drafts, and policy explainers.',
          'Fewer swivel-chair moments between risk, ops, and relationship coverage.',
        ],
        chart: 'line',
      },
      {
        title: 'Secure, efficient deployment',
        subtitle: 'Designed for regulated environments',
        bullets: [
          'In-house and on‑premises options keep sensitive workloads inside your boundary.',
          'Lean infrastructure footprint—built for sustained production, not lab demos.',
        ],
        chart: null,
      },
      {
        title: 'Next step',
        subtitle: 'Take colleagues through the experience',
        bullets: [
          'Open the chat workspace with a sample portfolio file or anonymized export.',
          'Use presentation mode anytime you need a calm, full-screen storyline.',
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
          'مساعد واحد للمستندات والبيانات والحوار—قريب من أسلوب عمل المصارف اليوم.',
          'علامة موحّدة «Banking Chatbot»؛ جاهز لسرد داخلي منظم.',
        ],
        chart: null,
      },
      {
        title: 'لماذا يعتمد البنك عليه الآن',
        subtitle: 'سرعة مع الحفاظ على الضوابط',
        bullets: [
          'ضغط أسابيع القراءة في ساعات مراجعة موجّهة.',
          'البشر يقررون بينما المساعد يتولى الحجم والتكرار.',
        ],
        chart: 'line',
      },
      {
        title: 'محادثة تحمل الملف معها',
        subtitle: 'مصمم لمحادثات مصرفية',
        bullets: [
          'أسئلة بلغة طبيعية على PDF وCSV وExcel واليوميات والنصوص المستخرجة.',
          'رسوم داخل المحادثة عند الطلب—مناسبة للجان والاجتماعات السريعة.',
        ],
        chart: 'area',
      },
      {
        title: 'تحليلات يلخصها القادة',
        subtitle: 'من المؤشرات إلى المعنى',
        bullets: [
          'مناظر اتجاه وتركز تكمّل منصات ذكاء الأعمال القائمة.',
          'سرد يشرح ما تغيّر—لا يقتصر على ما طُبع في الصفحة.',
        ],
        chart: 'bar',
      },
      {
        title: 'عمليات تعتمد على الجداول',
        subtitle: 'دقة على مستوى الفرع والمركز',
        bullets: [
          'إجابات مبنية على الصفوف التي تزودون بها—مناسبة للعمليات والرقابة المالية.',
          'تقليل أخطاء النسخ بين Excel والبريد عبر الإجابة داخل المساحة.',
        ],
        chart: 'bar',
      },
      {
        title: 'خريطة الأتمتة',
        subtitle: 'أين تستعيد الفرق الطاقة',
        bullets: [
          'فرز أولي للمستندات ومسودات تعليق MIS وشرح السياسات.',
          'تقليل التنقل بين المخاطر والعمليات وتغطية العملاء.',
        ],
        chart: 'line',
      },
      {
        title: 'نشر آمن وفعّال',
        subtitle: 'للبيئات الخاضعة للرقابة',
        bullets: [
          'خيارات داخلية وعلى البنية الخاصة تحافظ على الأحمال الحساسة داخل نطاقكم.',
          'بنية خفيفة—مصممة للإنتاج المستدام لا للتجارب المخبرية.',
        ],
        chart: null,
      },
      {
        title: 'الخطوة التالية',
        subtitle: 'مرّر الزملاء على التجربة',
        bullets: [
          'افتح مساحة المحادثة بملف محفظة تجريبي أو تصدير مجهّل.',
          'استخدم وضع العرض متى احتجتم سردًا هادئًا بملء الشاشة.',
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

  if (chart === 'line') {
    return (
      <div className="mt-8 h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={TREND_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} opacity={0.6} />
            <XAxis dataKey="label" tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} />
            <YAxis tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke={dark ? '#38bdf8' : 'hsl(var(--primary))'} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart === 'area') {
    return (
      <div className="mt-8 h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={TREND_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="aboutArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={dark ? '#34d399' : 'hsl(var(--primary))'} stopOpacity={0.35} />
                <stop offset="100%" stopColor={dark ? '#34d399' : 'hsl(var(--primary))'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} opacity={0.6} />
            <XAxis dataKey="label" tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} />
            <YAxis tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="value" stroke={dark ? '#34d399' : 'hsl(var(--primary))'} fill="url(#aboutArea)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="mt-8 h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={MIX_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} opacity={0.6} />
          <XAxis dataKey="name" tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} />
          <YAxis tick={{ fill: axis, fontSize: 11 }} axisLine={{ stroke: grid }} width={32} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill={dark ? '#a78bfa' : 'hsl(var(--primary))'} radius={[6, 6, 0, 0]} />
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
      <div className="relative h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={TREND_DATA} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="scrollArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={28} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#scrollArea)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Illustrative trend — for storytelling, not live bank figures.</p>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
