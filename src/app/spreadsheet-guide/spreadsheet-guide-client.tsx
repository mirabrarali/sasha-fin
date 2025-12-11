'use client';

import { Calculator, LayoutTemplate, MessageSquare, Mic, Sigma, Table2, Wand2 } from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/context/language-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AbdullahAvatar } from "@/components/abdullah-avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CodeBlock } from "@/components/code-block";

const FeatureCard = ({ icon, title, description }: { icon: React.ElementType, title: string, description: string }) => {
    const Icon = icon;
    return (
        <Card className="flex-1 min-w-[300px] shadow-sm hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <div className="p-2 bg-muted rounded-md">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-sm">{description}</p>
            </CardContent>
        </Card>
    )
}

const FunctionCategory = ({ title, functions }: { title: string, functions: string[] }) => (
    <div>
        <h4 className="font-semibold text-md mb-2">{title}</h4>
        <div className="flex flex-wrap gap-2">
            {functions.map(func => (
                <span key={func} className="text-xs font-mono bg-muted text-muted-foreground px-2 py-1 rounded-md">{func}</span>
            ))}
        </div>
    </div>
)


export default function SpreadsheetGuideClient() {
  const { t, dir } = useLanguage();

  return (
    <div className="flex flex-col h-screen bg-muted/40 text-foreground" dir={dir}>
        <header className="grid grid-cols-3 items-center p-4 border-b shrink-0 bg-background">
            <div className="justify-self-start">
                <SidebarTrigger />
            </div>
            <h1 className="text-xl font-semibold tracking-tight justify-self-center">{t('sgTitle')}</h1>
            <div className="justify-self-end">
                <LanguageToggle />
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in-50 duration-500">
                
                <section className="text-center">
                    <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                      <Sheet className="w-12 h-12 text-primary" />
                    </div>
                    <h2 className="text-4xl font-bold tracking-tight">{t('sgHeader')}</h2>
                    <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-4">
                        {t('sgSubHeader')}
                    </p>
                </section>
                
                <section>
                    <h3 className="text-2xl font-semibold mb-6 text-center">{t('sgCoreCapabilitiesTitle')}</h3>
                    <div className="flex flex-wrap gap-6 justify-center">
                       <FeatureCard icon={Wand2} title={t('sgFeatureAIAssistantTitle')} description={t('sgFeatureAIAssistantDesc')} />
                       <FeatureCard icon={LayoutTemplate} title={t('sgFeatureTemplatesTitle')} description={t('sgFeatureTemplatesDesc')} />
                       <FeatureCard icon={Sigma} title={t('sgFeatureFormulasTitle')} description={t('sgFeatureFormulasDesc')} />
                       <FeatureCard icon={Table2} title={t('sgFeatureDataToolsTitle')} description={t('sgFeatureDataToolsDesc')} />
                    </div>
                </section>

                <section>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('sgGettingStartedTitle')}</CardTitle>
                            <CardDescription>{t('sgGettingStartedDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold">{t('sgStep1Title')}</h3>
                                    <p className="text-muted-foreground">{t('sgStep1Desc')}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold">{t('sgStep2Title')}</h3>
                                    <p className="text-muted-foreground">{t('sgStep2Desc')}</p>
                                    <CodeBlock text={t('sgStep2Example')} />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold">{t('sgStep3Title')}</h3>
                                    <p className="text-muted-foreground">{t('sgStep3Desc')}</p>
                                    <CodeBlock text={t('sgStep3Example')} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>
                
                <section>
                    <h3 className="text-2xl font-semibold mb-4 text-center">{t('sgAbdullahCommandsTitle')}</h3>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>{t('sgCmdDataEntryTitle')}</AccordionTrigger>
                            <AccordionContent>
                                {t('sgCmdDataEntryDesc')}
                                <CodeBlock text={t('sgCmdDataEntryExample')} />
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>{t('sgCmdFinancialAnalysisTitle')}</AccordionTrigger>
                            <AccordionContent>
                                {t('sgCmdFinancialAnalysisDesc')}
                                <CodeBlock text={t('sgCmdFinancialAnalysisExample')} />
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>{t('sgCmdFormattingTitle')}</AccordionTrigger>
                            <AccordionContent>
                                {t('sgCmdFormattingDesc')}
                                 <CodeBlock text={t('sgCmdFormattingExample')} />
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="item-4">
                            <AccordionTrigger>{t('sgCmdChartsTitle')}</AccordionTrigger>
                            <AccordionContent>
                                {t('sgCmdChartsDesc')}
                                 <CodeBlock text={t('sgCmdChartsExample')} />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </section>

                <section>
                     <Card>
                        <CardHeader>
                            <CardTitle>{t('sgFunctionLibraryTitle')}</CardTitle>
                            <CardDescription>{t('sgFunctionLibraryDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FunctionCategory title={t('sgFuncMathLogicTitle')} functions={['IF', 'IFS', 'AND', 'OR', 'NOT', 'SUM', 'SUMIF', 'SUMIFS', 'AVERAGE', 'AVERAGEIF', 'AVERAGEIFS', 'COUNT', 'COUNTA', 'COUNTIF', 'COUNTIFS', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'ABS', 'MIN', 'MAX']} />
                            <FunctionCategory title={t('sgFuncLookupTitle')} functions={['VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH', 'XLOOKUP', 'CHOOSE', 'OFFSET', 'INDIRECT', 'TRANSPOSE']} />
                            <FunctionCategory title={t('sgFuncFinancialTitle')} functions={['NPV', 'XNPV', 'IRR', 'XIRR', 'PMT', 'IPMT', 'PPMT', 'FV', 'PV', 'RATE', 'NPER', 'CUMIPMT', 'CUMPRINC']} />
                            <FunctionCategory title={t('sgFuncTextTitle')} functions={['CONCATENATE', 'CONCAT', 'TEXT', 'LEFT', 'RIGHT', 'MID', 'LEN', 'FIND', 'SEARCH', 'REPLACE', 'SUBSTITUTE', 'TRIM', 'UPPER', 'LOWER', 'PROPER']} />
                            <FunctionCategory title={t('sgFuncDateTimeTitle')} functions={['TODAY', 'NOW', 'DATE', 'DATEDIF', 'EOMONTH', 'EDATE', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND', 'WEEKDAY', 'WORKDAY', 'NETWORKDAYS']} />
                            <FunctionCategory title={t('sgFuncStatisticalTitle')} functions={['CORREL', 'STDEV.S', 'STDEV.P', 'VAR.S', 'VAR.P', 'FORECAST', 'TREND', 'GROWTH']} />
                        </CardContent>
                    </Card>
                </section>

            </div>
        </main>
    </div>
  );
}

// A new component since it's used only here.
const Sheet = ({className}: {className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
        <path d="M9 3v18"></path>
        <path d="M15 3v18"></path>
        <path d="M4 9h16"></path>
        <path d="M4 15h16"></path>
    </svg>
);
