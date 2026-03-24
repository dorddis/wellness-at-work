'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  title: string;
}

export function CategoryNav({ categories }: { categories: Category[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <div className="relative flex items-center gap-1">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        className={`flex-shrink-0 w-7 h-7 rounded-full border border-border flex items-center justify-center transition-all ${
          canScrollLeft
            ? 'text-foreground hover:bg-muted cursor-pointer'
            : 'text-muted-foreground/30 cursor-default'
        }`}
        aria-label="Scroll left"
        tabIndex={canScrollLeft ? 0 : -1}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Scrollable pills */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {categories.map((cat) => (
          <a
            key={cat.id}
            href={`#${cat.id}`}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all whitespace-nowrap flex-shrink-0"
          >
            {cat.title}
          </a>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        className={`flex-shrink-0 w-7 h-7 rounded-full border border-border flex items-center justify-center transition-all ${
          canScrollRight
            ? 'text-foreground hover:bg-muted cursor-pointer'
            : 'text-muted-foreground/30 cursor-default'
        }`}
        aria-label="Scroll right"
        tabIndex={canScrollRight ? 0 : -1}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
