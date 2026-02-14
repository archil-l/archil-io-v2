interface WelcomeHeaderProps {
  isLoaded: boolean;
}

export function WelcomeHeader({ isLoaded }: WelcomeHeaderProps) {
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return null;
}
