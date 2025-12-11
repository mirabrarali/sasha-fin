import { cn } from "@/lib/utils";

export function SashaAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full",
        className
      )}
    >
      <svg
        className="absolute w-full h-full"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sasha-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "hsl(var(--primary))" }} />
            <stop offset="100%" style={{ stopColor: "hsl(var(--accent))" }} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#sasha-gradient)" />
      </svg>
    </div>
  );
}
