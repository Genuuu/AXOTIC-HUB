import React from "react";

export const ShimmerBlock = ({ className = "" }: { className?: string }) => (
  <div className={`bg-slate-200/80 dark:bg-slate-800/80 animate-pulse rounded-lg ${className}`} />
);

export const StatCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
    <div className="space-y-2.5">
      <ShimmerBlock className="h-3 w-24" />
      <ShimmerBlock className="h-7 w-16" />
      <ShimmerBlock className="h-2.5 w-32" />
    </div>
    <ShimmerBlock className="size-12 rounded-xl shrink-0" />
  </div>
);

export const ProjectCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <ShimmerBlock className="size-4.5 rounded" />
        <ShimmerBlock className="h-5 w-20 rounded-md" />
      </div>
      <ShimmerBlock className="size-6 rounded-md" />
    </div>
    <div className="space-y-2">
      <ShimmerBlock className="h-5 w-4/5" />
      <ShimmerBlock className="h-3.5 w-full" />
      <ShimmerBlock className="h-3.5 w-2/3" />
    </div>
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
      <ShimmerBlock className="h-4 w-28" />
      <ShimmerBlock className="h-4 w-24 rounded" />
    </div>
  </div>
);

export const ProjectGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, idx) => (
      <ProjectCardSkeleton key={`proj-skel-${idx}`} />
    ))}
  </>
);

export const HomeAssociatedBuildSkeleton = ({ count = 3 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, idx) => (
      <div 
        key={`home-bld-skel-${idx}`} 
        className="p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-[24px] flex flex-col h-full space-y-4 shadow-xs"
      >
        <div className="flex justify-between items-start mb-2">
          <ShimmerBlock className="h-5 w-20 rounded-lg" />
          <ShimmerBlock className="size-8 rounded-full" />
        </div>
        <div className="space-y-2 flex-1">
          <ShimmerBlock className="h-5.5 w-3/4 rounded-md" />
          <ShimmerBlock className="h-3.5 w-full rounded" />
          <ShimmerBlock className="h-3.5 w-2/3 rounded" />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/70 dark:border-slate-800">
          <div className="flex -space-x-2">
            <ShimmerBlock className="size-7 rounded-full border-2 border-white dark:border-slate-900" />
            <ShimmerBlock className="size-7 rounded-full border-2 border-white dark:border-slate-900" />
            <ShimmerBlock className="size-7 rounded-full border-2 border-white dark:border-slate-900" />
          </div>
          <ShimmerBlock className="h-3.5 w-20 rounded" />
        </div>
      </div>
    ))}
  </>
);

export const HomeActiveProjectSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map(i => (
      <div key={`h-proj-skel-${i}`} className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-2">
        <div className="flex items-center justify-between">
          <ShimmerBlock className="h-4 w-36" />
          <ShimmerBlock className="h-4 w-16 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <ShimmerBlock className="h-2 flex-1 rounded-full" />
          <ShimmerBlock className="h-3 w-10" />
        </div>
      </div>
    ))}
  </div>
);

export const HomeLogSkeleton = () => (
  <div className="space-y-2.5">
    {[1, 2, 3, 4].map(i => (
      <div key={`h-log-skel-${i}`} className="p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShimmerBlock className="size-5 rounded-full shrink-0" />
            <ShimmerBlock className="h-3 w-20" />
          </div>
          <ShimmerBlock className="h-2.5 w-14" />
        </div>
        <ShimmerBlock className="h-3 w-full" />
      </div>
    ))}
  </div>
);

export const HomeChartSkeleton = () => (
  <div className="flex flex-col items-center justify-center p-6 space-y-4 min-h-[220px]">
    <div className="relative size-36 rounded-full border-8 border-slate-200 dark:border-slate-800/80 animate-pulse flex items-center justify-center">
      <ShimmerBlock className="size-16 rounded-full" />
    </div>
    <div className="flex gap-2">
      <ShimmerBlock className="h-4 w-16 rounded-full" />
      <ShimmerBlock className="h-4 w-20 rounded-full" />
      <ShimmerBlock className="h-4 w-14 rounded-full" />
    </div>
  </div>
);

export const HomeCompetitionsSkeleton = () => (
  <div className="space-y-3">
    {[1, 2].map(i => (
      <div key={`comp-skel-${i}`} className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-2">
        <div className="flex items-center justify-between">
          <ShimmerBlock className="h-4 w-32" />
          <ShimmerBlock className="h-4 w-14 rounded-md" />
        </div>
        <ShimmerBlock className="h-3 w-48" />
        <div className="flex items-center gap-2 pt-1">
          <ShimmerBlock className="h-3 w-20" />
          <ShimmerBlock className="h-3 w-16 ml-auto" />
        </div>
      </div>
    ))}
  </div>
);

export const ProjectDetailSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3].map(i => (
      <div key={`detail-skel-${i}`} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex justify-between items-center">
          <ShimmerBlock className="h-3.5 w-32" />
          <ShimmerBlock className="h-3.5 w-16" />
        </div>
        <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <ShimmerBlock className="h-2.5 w-24" />
          <ShimmerBlock className="h-2.5 w-20" />
        </div>
      </div>
    ))}
  </div>
);
