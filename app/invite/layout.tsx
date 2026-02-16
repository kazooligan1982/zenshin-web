export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zenshin-cream px-4 py-8">
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
        <img
          src="/zenshin-icon.svg"
          alt="ZENSHIN CHART"
          className="w-12 h-12 mx-auto mb-2"
        />
        <div className="flex items-start justify-center gap-1.5">
          <h1 className="text-xl font-bold text-zenshin-navy">ZENSHIN CHART</h1>
          <span className="text-[10px] font-light tracking-wider uppercase text-amber-400/70 pt-1">
            beta
          </span>
        </div>
      </div>
      <div className="w-full max-w-md mt-24">{children}</div>
    </div>
  );
}
