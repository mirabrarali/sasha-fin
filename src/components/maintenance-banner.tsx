'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/language-context';

export function MaintenanceBanner() {
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const getTargetTime = () => {
      try {
        const savedTarget = localStorage.getItem('maintenanceEndTime');
        if (savedTarget) {
          const target = parseInt(savedTarget, 10);
          if (target > new Date().getTime()) {
             return target;
          }
        }
      } catch (e) {
        console.error("Could not access localStorage", e);
      }
      const newTarget = new Date().getTime() + 14 * 60 * 60 * 1000;
      try {
        localStorage.setItem('maintenanceEndTime', newTarget.toString());
      } catch (e) {
        console.error("Could not access localStorage", e);
      }
      return newTarget;
    };

    const targetTime = getTargetTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetTime - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        try {
            if (new Date(parseInt(localStorage.getItem('maintenanceEndTime') || '0', 10)).getTime() < now) {
                localStorage.removeItem('maintenanceEndTime');
            }
        } catch (e) {
            console.error("Could not access localStorage", e);
        }
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (time: number) => time.toString().padStart(2, '0');
  const formattedTime = `${formatTime(timeLeft.hours)}:${formatTime(timeLeft.minutes)}:${formatTime(timeLeft.seconds)}`;
  
  let showBanner = false;
  try {
      const target = localStorage.getItem('maintenanceEndTime');
      if (target && parseInt(target, 10) > new Date().getTime()) {
          showBanner = true;
      }
  } catch (e) {
    // ls not available
  }

  if (!isClient || !showBanner) {
      return null;
  }
  
  return (
    <div className="flex items-center space-x-2 rtl:space-x-reverse">
      <div className="flex items-center space-x-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('maintenanceMessage', { time: formattedTime })}
      </p>
    </div>
  );
}
