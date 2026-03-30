type AuthCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function AuthCard({ children, className = "" }: AuthCardProps) {
  return (
    <div
      className={`ec-enter rounded-2xl border border-ec-border bg-ec-card p-6 shadow-md transition-shadow duration-300 ease-out hover:shadow-lg motion-reduce:animate-none ${className}`}
    >
      {children}
    </div>
  );
}
