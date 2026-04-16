import { clsx } from "clsx"

interface SkeletonProps {
  className?: string
  variant?: "text" | "circular" | "rectangular"
  width?: string | number
  height?: string | number
}

export function Skeleton({ className, variant = "rectangular", width, height }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "skeleton",
        variant === "circular" && "rounded-full",
        variant === "text" && "rounded h-4",
        className,
      )}
      style={{ width, height }}
    />
  )
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" className={i === lines - 1 ? "w-3/4" : "w-full"} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="glass-strong rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl glass">
          <Skeleton variant="circular" width={32} height={32} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="50%" height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}
