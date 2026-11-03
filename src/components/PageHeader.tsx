import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

type PageHeaderProps = {
  actionHref: string;
  actionLabel: string;
  status?: string;
  connected?: boolean;
};

export default function PageHeader({ actionHref, actionLabel, status, connected }: PageHeaderProps) {
  return (
    <header className="subpage-header">
      <BrandLogo
        className="subpage-brand"
        markClassName="h-9 w-9"
        labelClassName="font-display text-base font-bold tracking-wide text-[#17283A]"
      />
      <nav aria-label="Main navigation" className="subpage-nav">
        {status && <span className="subpage-status" data-connected={connected}><i />{status}</span>}
        <Link href={actionHref}>{actionLabel}<span aria-hidden="true"> ↗</span></Link>
      </nav>
    </header>
  );
}
