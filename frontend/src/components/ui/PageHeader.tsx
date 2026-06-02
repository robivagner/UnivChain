type Props = {
  kicker?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function PageHeader({ kicker, title, description, align = "left" }: Props) {
  const alignClass = align === "center" ? "text-center items-center" : "text-left items-start";

  return (
    <header className={`flex flex-col gap-2 ${alignClass}`}>
      {kicker && <p className="portal-kicker">{kicker}</p>}
      <h1 className="portal-page-title">{title}</h1>
      {description && (
        <p className={`portal-body-text max-w-2xl ${align === "center" ? "mx-auto" : ""}`}>
          {description}
        </p>
      )}
    </header>
  );
}
