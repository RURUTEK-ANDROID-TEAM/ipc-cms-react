// components/ui/Spinner.tsx
function Spinner({ size = 12 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={`w-${size} h-${size} border-4 border-primary border-t-transparent rounded-full animate-spin`}
      />
      <p className="text-muted-foreground font-medium">Loading...</p>
    </div>
  );
}

export default Spinner;
