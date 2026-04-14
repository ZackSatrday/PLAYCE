import { cn } from "@/lib/utils";

type AvatarProps = {
  src?: string | null;
  alt: string;
  fallback: string;
  className?: string;
};

export function Avatar({ src, alt, fallback, className }: AvatarProps) {
  const initials = fallback.slice(0, 2).toUpperCase();

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn(
          "inline-block size-9 rounded-full object-cover ring-2 ring-[var(--border)]",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full bg-[var(--progress-track)] text-xs font-semibold text-[var(--foreground)] ring-2 ring-[var(--border)]",
        className,
      )}
      aria-label={alt}
    >
      {initials}
    </span>
  );
}
