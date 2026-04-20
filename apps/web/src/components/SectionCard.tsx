import { ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  badge?: string;
  children: ReactNode;
};

export function SectionCard({ title, badge, children }: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-card__header">
        <h2>{title}</h2>
        {badge ? <span className="section-card__badge">{badge}</span> : null}
      </div>
      <div className="section-card__body">{children}</div>
    </section>
  );
}

