
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Sheet as SheetIcon, BookOpen, BarChart3, GraduationCap, BrainCircuit } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { useLanguage } from '@/context/language-context';

export function MainNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith('/chat')}>
          <Link href="/chat" onClick={handleLinkClick}>
            <MessageCircle />
            <span>{t('chatTitle')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith('/spreadsheet')}>
          <Link href="/spreadsheet" onClick={handleLinkClick}>
            <SheetIcon />
            <span>{t('spreadsheetTitle')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith('/spreadsheet-guide')}>
          <Link href="/spreadsheet-guide" onClick={handleLinkClick}>
            <GraduationCap />
            <span>{t('spreadsheetGuideTitle')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith('/data-analytics')}>
          <Link href="/data-analytics" onClick={handleLinkClick}>
            <BarChart3 />
            <span>{t('dataAnalyticsTitle')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith('/knowledge-base')}>
          <Link href="/knowledge-base" onClick={handleLinkClick}>
            <BrainCircuit />
            <span>{t('knowledgeBaseTitle')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith('/about')}>
          <Link href="/about" onClick={handleLinkClick}>
            <BookOpen />
            <span>{t('aboutTitle')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
