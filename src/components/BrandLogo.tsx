import Link from "next/link";
import type { CSSProperties } from "react";

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  labelClassName?: string;
  style?: CSSProperties;
};

export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 40 40" fill="none">
      <rect x="3" y="3" width="15" height="15" rx="4.5" fill="#FF6B4A" />
      <rect x="22" y="3" width="15" height="15" rx="4.5" fill="#F5EFE0" />
      <rect x="3" y="22" width="15" height="15" rx="4.5" fill="#F4B942" />
      <path d="M22 22h15v15H22z" fill="#243B55" />
      <path d="M26 26h7v7h-7z" fill="#FF6B4A" />
    </svg>
  );
}

export default function BrandLogo({
  className = "",
  markClassName,
  labelClassName = "font-display text-base font-bold tracking-wide text-[#F5EFE0]",
  style,
}: BrandLogoProps) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`} style={style}>
      <BrandMark className={markClassName} />
      <span className={labelClassName}>Piece Together</span>
    </Link>
  );
}
