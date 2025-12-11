
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, BookOpen, BrainCircuit } from 'lucide-react';
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

    