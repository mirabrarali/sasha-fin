
'use client';

import Link from 'next/link';
import { LanguageToggle } from '@/components/language-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AbdullahAvatar } from '@/components/abdullah-avatar';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Server, Database, BrainCircuit, Users, Globe, LineChart, TrendingUp, Filter, FileText, Landmark, Puzzle, ShieldAlert, Workflow } from 'lucide-react';

const EnterpriseFeatureCard = ({ icon, title, description }: { icon: React.ElementType, title: string, description: string }) => {
    const Icon = icon;
    return (
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
            </div>
        </div>
    );
};

const MockChart = () => (
    <div className="p-4 bg-muted/50 rounded-lg">
        <div className="h-40 w-full">
            <svg width="100%" height="100%" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet" className="text-primary">
                <path d="M 20 140 C 80 100, 120 40, 200 80 S 280 120, 380 60" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 20 140 C 80 120, 120 80, 200 100 S 280 140, 380 100" stroke="currentColor" strokeWidth="2" fill="none" strokeOpacity="0.4" strokeDasharray="4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="200" cy="80" r="3" fill="currentColor" />
                <circle cx="380" cy="60" r="3" fill="currentColor" />
                <line x1="20" y1="140" x2="380" y2="140" stroke="hsl(var(--border))" strokeWidth="1" />
                <line x1="20" y1="20" x2="20" y2="140" stroke="hsl(var(--border))" strokeWidth="1" />
            </svg>
        </div>
    </div>
);

export default function AboutPageClient() {
  const { t, dir } = useLanguage();

  return (
    <div className="flex flex-col h-screen bg-background text-foreground" dir={dir}>
      <header className="grid grid-cols-3 items-center p-4 border-b shrink-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="justify-self-start">
          <SidebarTrigger />
        </div>
        <h1 className="text-xl font-semibold tracking-tight justify-self-center">{t('enterprisePageTitle')}</h1>
        <div className="justify-self-end">
          <LanguageToggle />
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-16 p-4 md:p-8 animate-in fade-in-50 duration-500">
          
          <section className="text-center pt-8">
            <AbdullahAvatar className="w-24 h-24 mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-primary to-slate-500">
              {t('enterpriseHeader')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-6">
              {t('enterpriseSubHeader')}
            </p>
          </section>

          <section>
             <Card className="shadow-2xl bg-gradient-to-br from-background via-card to-background">
                <CardHeader>
                    <CardTitle>{t('enterpriseCorePitchTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4 text-muted-foreground">
                        <p>{t('enterpriseCorePitchP1')}</p>
                        <p>{t('enterpriseCorePitchP2')}</p>
                        <p>{t('enterpriseCorePitchP3')}</p>
                    </div>
                    <MockChart />
                </CardContent>
             </Card>
          </section>
          
          <section>
            <h3 className="text-3xl font-bold text-center mb-10">{t('enterpriseCapabilitiesTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="flex flex-col gap-2 p-6 rounded-lg border bg-card">
                    <BrainCircuit className="w-8 h-8 text-primary mb-3" />
                    <h4 className="font-semibold text-xl">{t('capabilityAnalysisTitle')}</h4>
                    <p className="text-muted-foreground">{t('capabilityAnalysisDesc')}</p>
                </div>
                <div className="flex flex-col gap-2 p-6 rounded-lg border bg-card">
                    <FileText className="w-8 h-8 text-primary mb-3" />
                    <h4 className="font-semibold text-xl">{t('capabilityDocIntelTitle')}</h4>
                    <p className="text-muted-foreground">{t('capabilityDocIntelDesc')}</p>
                </div>
                <div className="flex flex-col gap-2 p-6 rounded-lg border bg-card">
                    <TrendingUp className="w-8 h-8 text-primary mb-3" />
                    <h4 className="font-semibold text-xl">{t('capabilityRiskTitle')}</h4>
                    <p className="text-muted-foreground">{t('capabilityRiskDesc')}</p>
                </div>
                <div className="flex flex-col gap-2 p-6 rounded-lg border bg-card">
                    <Filter className="w-8 h-8 text-primary mb-3" />
                    <h4 className="font-semibold text-xl">{t('capabilityDataTitle')}</h4>
                    <p className="text-muted-foreground">{t('capabilityDataDesc')}</p>
                </div>
                 <div className="flex flex-col gap-2 p-6 rounded-lg border bg-card">
                    <Globe className="w-8 h-8 text-primary mb-3" />
                    <h4 className="font-semibold text-xl">{t('capabilityBilingualTitle')}</h4>
                    <p className="text-muted-foreground">{t('capabilityBilingualDesc')}</p>
                </div>
                 <div className="flex flex-col gap-2 p-6 rounded-lg border bg-card">
                    <Users className="w-8 h-8 text-primary mb-3" />
                    <h4 className="font-semibold text-xl">{t('capabilityKnowledgeTitle')}</h4>
                    <p className="text-muted-foreground">{t('capabilityKnowledgeDesc')}</p>
                </div>
            </div>
          </section>

          <section>
            <h3 className="text-3xl font-bold text-center mb-10">{t('highSkillsTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <EnterpriseFeatureCard 
                    icon={Workflow}
                    title={t('skillAgenticTitle')}
                    description={t('skillAgenticDesc')}
                />
                <EnterpriseFeatureCard 
                    icon={ShieldAlert}
                    title={t('skillAnomalyTitle')}
                    description={t('skillAnomalyDesc')}
                />
                <EnterpriseFeatureCard 
                    icon={LineChart}
                    title={t('skillScenarioTitle')}
                    description={t('skillScenarioDesc')}
                />
                <EnterpriseFeatureCard 
                    icon={Puzzle}
                    title={t('skillIntegrationTitle')}
                    description={t('skillIntegrationDesc')}
                />
            </div>
          </section>

          <section>
            <h3 className="text-3xl font-bold text-center mb-10">{t('enterpriseDeploymentTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <EnterpriseFeatureCard 
                    icon={ShieldCheck}
                    title={t('deploymentSecurityTitle')}
                    description={t('deploymentSecurityDesc')}
                />
                <EnterpriseFeatureCard 
                    icon={Server}
                    title={t('deploymentOnPremTitle')}
                    description={t('deploymentOnPremDesc')}
                />
                <EnterpriseFeatureCard 
                    icon={Database}
                    title={t('deploymentDataTitle')}
                    description={t('deploymentDataDesc')}
                />
            </div>
          </section>

          <section>
            <h3 className="text-3xl font-bold text-center mb-10">{t('complianceTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <EnterpriseFeatureCard 
                    icon={Landmark}
                    title={t('complianceSAMATitle')}
                    description={t('complianceSAMADesc')}
                />
                <EnterpriseFeatureCard 
                    icon={ShieldCheck}
                    title={t('complianceISOTitle')}
                    description={t('complianceISODesc')}
                />
            </div>
          </section>

          <section className="text-center py-12">
            <h3 className="text-3xl font-bold">{t('enterpriseCtaTitle')}</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-4 mb-8">
              {t('enterpriseCtaDesc')}
            </p>
            <Button asChild size="lg" className="font-semibold text-base px-8 py-6 bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <Link href="/chat">{t('enterpriseCtaButton')}</Link>
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}

    