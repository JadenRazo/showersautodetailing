import { useEffect, useRef } from 'react';

export default function BottomNavClient() {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    // Check if Visual Viewport API is available (iOS Safari, modern browsers)
    if (!window.visualViewport) return;

    const adjustNav = () => {
      if (!window.visualViewport) return;
      
      // Calculate offset: difference between layout viewport and visual viewport bottom
      const layoutHeight = window.innerHeight;
      const visualHeight = window.visualViewport.height;
      const visualOffsetTop = window.visualViewport.offsetTop;
      
      // When toolbar hides, visualHeight increases but we need to offset the nav
      const offsetBottom = layoutHeight - visualHeight - visualOffsetTop;
      
      // Apply the offset (negative to move nav down to actual screen bottom)
      nav.style.transform = `translateY(${-offsetBottom}px)`;
    };

    // Listen to visual viewport changes
    window.visualViewport.addEventListener('resize', adjustNav);
    window.visualViewport.addEventListener('scroll', adjustNav);
    
    // Also listen to window scroll for good measure
    window.addEventListener('scroll', adjustNav, { passive: true });

    // Initial adjustment
    adjustNav();

    return () => {
      window.visualViewport?.removeEventListener('resize', adjustNav);
      window.visualViewport?.removeEventListener('scroll', adjustNav);
      window.removeEventListener('scroll', adjustNav);
    };
  }, []);

  return (
    <>
      <nav
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-gray-200 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', willChange: 'transform' }}
      >
        <div className="grid grid-cols-2 h-16">
          <a
            href="/services"
            className="flex flex-col items-center justify-center gap-1 text-gray-700 hover:text-[#EB6C1D] active:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs font-medium">Services</span>
          </a>

          <a
            href="/#quote"
            className="flex flex-col items-center justify-center gap-1 bg-[#EB6C1D] text-white hover:bg-[#D35E14] active:bg-[#B84D0A] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">Get Quote</span>
          </a>
        </div>
        {/* White extension below nav to cover any remaining gap */}
        <div className="absolute left-0 right-0 top-full h-screen bg-white" />
      </nav>

      {/* Spacer for bottom nav on mobile */}
      <div className="h-16 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
    </>
  );
}
