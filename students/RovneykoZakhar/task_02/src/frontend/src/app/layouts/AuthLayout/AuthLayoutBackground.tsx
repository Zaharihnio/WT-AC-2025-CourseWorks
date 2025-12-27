export const AuthLayoutBackground = () => {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-40 bg-fuchsia-500/30" />
      <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-40 bg-cyan-500/30" />
    </div>
  )
}
