const AmbientBackground = () => (
  <>
    <div
      className="fixed top-[-50px] left-[-50px] w-[300px] h-[300px] rounded-full pointer-events-none z-0"
      style={{ background: "radial-gradient(circle, hsla(224, 90%, 55%, 0.15) 0%, transparent 70%)" }}
    />
    <div
      className="fixed bottom-[20%] right-[-50px] w-[300px] h-[300px] rounded-full pointer-events-none z-0 opacity-60"
      style={{ background: "radial-gradient(circle, hsla(224, 90%, 55%, 0.15) 0%, transparent 70%)" }}
    />
  </>
);

export default AmbientBackground;
