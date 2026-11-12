'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, BadgeCheck, Clapperboard, Play, Radio, Scissors, Sparkles } from 'lucide-react';
import { type LinkLike } from './views';
import { buttonClass } from './ui/button';

export function LandingMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('atlas-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.08 });
    root.querySelectorAll('main > section:not(:first-child)').forEach(section => {
      section.classList.add('atlas-scroll-section');
      observer.observe(section);
    });
    return () => { observer.disconnect(); root.querySelectorAll('.atlas-scroll-section').forEach(s => s.classList.remove('atlas-scroll-section')); };
  }, []);
  return <div ref={ref}>{children}</div>;
}

export function AtlasLandingHero({ link: Link = 'a', startHref, clipperHref }: { link?: LinkLike; startHref: string; clipperHref: string }) {
  const [business, setBusiness] = useState(true);
  return (
    <section className="atlas-integrated-hero">
      <div className="atlas-hero-copy">
        <p className="atlas-kicker"><Sparkles size={15} aria-hidden /> The clipping marketplace</p>
        <h1>Content in.<br /><span className="text-brand">Momentum out.</span></h1>
        <p className="atlas-hero-description">{business
          ? 'Turn streams, music, and videos into short-form clips people want to watch. Launch a campaign and pay for verified views.'
          : 'Join a campaign, turn content into short-form clips, and earn for real views across TikTok, Shorts, and Reels.'}</p>
        <div className="atlas-paths" role="group" aria-label="Choose your path">
          <button type="button" aria-pressed={business} onClick={() => setBusiness(true)}>For businesses</button>
          <button type="button" aria-pressed={!business} onClick={() => setBusiness(false)}>For clippers</button>
        </div>
        <div className="mt-6"><Link href={business ? startHref : clipperHref} className={buttonClass('primary', 'md', 'h-12 gap-2 px-6')}>{business ? 'Launch a campaign' : 'Browse campaigns'} <ArrowUpRight size={17} aria-hidden /></Link></div>
        <p className="atlas-hero-proof"><BadgeCheck size={16} aria-hidden />{business ? 'Approve every clip. Pay for verified views.' : 'See rates and clip caps before you join.'}</p>
      </div>
      <div className="atlas-scene" role="img" aria-label="Abstract 3D clip frames spreading from one source to social feeds">
        <div className="atlas-orbit" /><div className="atlas-orbit atlas-orbit-two" />
        <div className="atlas-video atlas-video-source"><div className="atlas-video-art" /><span>THE MOMENT <Play size={12} /></span></div>
        <div className="atlas-video atlas-video-left"><div className="atlas-video-art" /><span>TIKTOK / CLIP</span></div>
        <div className="atlas-video atlas-video-right"><div className="atlas-video-art" /><span>SHORTS / REELS</span></div>
        <span className="atlas-source-label"><Clapperboard size={15} /> ONE SOURCE</span>
        <span className="atlas-views-label"><BadgeCheck size={15} /> REAL VIEWS</span>
        <span className="atlas-scene-caption">SOURCE → CLIPS → REACH</span>
      </div>
      <div className="atlas-flow-caption"><Radio size={15} aria-hidden /><span>{business ? 'One source. Made for every feed.' : 'Find a source worth clipping.'}</span><span className="atlas-caption-detail">Share the source. <Scissors size={14} aria-hidden /> Make the cut. <BadgeCheck size={14} aria-hidden /> Count real views.</span></div>
    </section>
  );
}
