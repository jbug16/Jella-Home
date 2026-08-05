type PageHeaderProps = {
  title: string;
  description?: string;
};

/** Consistent page title block used by every route. Hidden on mobile — the sticky app header shows the title instead. */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="hidden flex-col gap-1 sidebar:flex">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h1>
      {description ? (
        <p className="max-w-prose text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
