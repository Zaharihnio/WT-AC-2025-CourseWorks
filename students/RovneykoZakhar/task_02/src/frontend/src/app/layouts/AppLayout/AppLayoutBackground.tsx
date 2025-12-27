export const AppLayoutBackground = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -top-32 left-1/3 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(120,119,198,0.45),rgba(120,119,198,0)_60%)] blur-2xl" />
      <div className="absolute top-24 -left-24 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.35),rgba(56,189,248,0)_60%)] blur-2xl" />
      <div className="absolute -bottom-40 right-0 h-[640px] w-[640px] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.22),rgba(34,197,94,0)_60%)] blur-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.06),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.04),transparent_30%)]" />
    </div>
  )
}
