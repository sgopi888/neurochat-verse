import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export const useMobileManager = () => {
  const isMobile = useIsMobile();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    console.log('Toggling mobile sidebar. Current state:', isMobileSidebarOpen);
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  return {
    isMobile,
    isMobileSidebarOpen,
    toggleMobileSidebar,
    closeMobileSidebar,
    setIsMobileSidebarOpen
  };
};