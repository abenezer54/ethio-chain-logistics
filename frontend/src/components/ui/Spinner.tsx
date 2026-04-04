type SpinnerProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
};

const sizeClass = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-10 w-10 border-[3px]",
};

export function Spinner({
  className = "",
  size = "md",
  label = "Loading",
}: SpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-ec-border border-t-ec-accent motion-reduce:animate-none ${sizeClass[size]} ${className}`}
      role="status"
      aria-label={label}
    />
  );
}
