
'use client';

import Link from 'next/link';
import { MessageCircle, Sheet, BookOpen, Rocket, Wand, ListChecks, BrainCircuit, Bot, ShieldCheck, LineChart, FileCheck as FileCheckIcon, Briefcase, BarChart3, Clock } from 'lucide-react';
import { LanguageToggle } from '@/components/language-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AbdullahAvatar } from '@/components/abdullah-avatar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function AboutPageClient() {
  const { t, dir } = useLanguage();

  const capabilities = [
    {
      icon: MessageCircle,
      title: t('learnChatTitle'),
      description: t('learnChatDesc'),
      availability: t('chatAvailability')
    },
    {
      icon: Sheet,
      title: t('learnSpreadsheetTitle'),
      description: t('learnSpreadsheetDesc'),
      availability: t('spreadsheetAvailability')
    },
    {
      icon: BarChart3,
      title: t('learnDATitle'),
      description: t('learnDADesc'),
      availability: t('daAvailability')
    },
    {
      icon: Wand,
      title: t('learnAITitle'),
      description: t('learnAIDesc'),
    },
    {
      icon: ShieldCheck,
      title: t('learnSecurityTitle'),
      description: t('learnSecurityDesc'),
    }
  ];

  const gettingStartedSteps = [
    {
      title: t('gsChatStepTitle'),
      description: t('gsChatStepDesc'),
    },
    {
      title: t('gsSpreadsheetStepTitle'),
      description: t('gsSpreadsheetStepDesc'),
    },
    {
      title: t('gsDAStepTitle'),
      description: t('gsDAStepDesc'),
    },
  ];
  
  const abdullahFeatures = Array.from({ length: 15 }, (_, i) => t(`csAbdullahFeature${i + 1}`));
  const spreadsheetFeatures = Array.from({ length: 15 }, (_, i) => t(`csSpreadsheetFeature${i + 1}`));
  const dataAnalyticsFeatures = Array.from({ length: 10 }, (_, i) => t(`csDAFeature${i + 1}`));

  const whoBenefits = [
    {
      icon: LineChart,
      title: t('learnRoleAnalystTitle'),
      description: t('learnRoleAnalystDesc'),
    },
    {
      icon: FileCheckIcon,
      title: t('learnRoleOfficerTitle'),
      description: t('learnRoleOfficerDesc'),
    },
    {
      icon: Briefcase,
      title: t('learnRoleExecutiveTitle'),
      description: t('learnRoleExecutiveDesc'),
    },
  ];


  return (
    <div className="flex flex-col h-screen bg-background text-foreground" dir={dir}>
      <header className="grid grid-cols-3 items-center p-4 border-b shrink-0 bg-background/80 backdrop-blur-sm">
        <div className="justify-self-start">
          <SidebarTrigger />
        </div>
        <h1 className="text-xl font-semibold tracking-tight justify-self-center">{t('learnPageTitle')}</h1>
        <div className="justify-self-end">
          <LanguageToggle />
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-500">
          <div className="flex flex-col items-center text-center space-y-4">
            <AbdullahAvatar className="w-20 h-20" />
            <h2 className="text-3xl font-bold tracking-tight">{t('learnPageTitle')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              {t('learnIntro')}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('learnCapabilitiesTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {capabilities.map((item, index) => (
                    <AccordionItem value={`item-${index + 1}`} key={index}>
                        <AccordionTrigger>
                            <div className="flex items-center gap-3">
                            <item.icon className="h-5 w-5 text-primary" />
                            <span className="font-semibold">{item.title}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pl-11 space-y-3">
                            <p>{item.description}</p>
                            {item.availability && (
                                <div className="text-xs font-medium text-muted-foreground/80 flex items-center gap-2">
                                    <Clock className="w-3 h-3"/>
                                    <span className="font-semibold">{t('capabilityHours')}</span>
                                    <span>{item.availability}</span>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
          
           <Card>
            <CardHeader>
              <CardTitle>{t('learnWhoBenefitsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {whoBenefits.map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted text-primary flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

           <Card>
            <CardHeader>
              <CardTitle>{t('gettingStartedTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {gettingStartedSteps.map((step, index) => (
                    <div key={index} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{index + 1}</div>
                        <div className="space-y-1">
                            <h3 className="font-semibold">{step.title}</h3>
                            <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: step.description }} />
                        </div>
                    </div>
                ))}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <BrainCircuit className="w-7 h-7 text-primary" />
                <CardTitle>{t('comingSoonAbdullahTitle')}</CardTitle>
              </div>
              <CardDescription>{t('comingSoonAbdullahDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  {abdullahFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                          <Rocket className="w-5 h-5 mt-0.5 text-primary/70 shrink-0"/>
                          <span className="text-muted-foreground">{feature}</span>
                      </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bot className="w-7 h-7 text-primary" />
                <CardTitle>{t('comingSoonSpreadsheetTitle')}</CardTitle>
              </div>
              <CardDescription>{t('comingSoonSpreadsheetDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  {spreadsheetFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                          <Rocket className="w-5 h-5 mt-0.5 text-primary/70 shrink-0"/>
                          <span className="text-muted-foreground">{feature}</span>
                      </li>
                  ))}
              </ul>
            </CardContent>
          </Card>

           <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <BarChart3 className="w-7 h-7 text-primary" />
                <CardTitle>{t('comingSoonDATitle')}</CardTitle>
              </div>
              <CardDescription>{t('comingSoonDADesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  {dataAnalyticsFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                          <Rocket className="w-5 h-5 mt-0.5 text-primary/70 shrink-0"/>
                          <span className="text-muted-foreground">{feature}</span>
                      </li>
                  ))}
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center gap-4 mt-12 mb-8">
            <Button asChild size="lg" className="font-semibold text-base px-8 py-6 bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <Link href="/chat">{t('getStartedAbdullah')}</Link>
            </Button>
            <Button asChild variant="link" className="text-muted-foreground">
              <Link href="/spreadsheet">{t('getStartedSpreadsheet')}</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

    
