export default function NotFound() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-destructive">404</h1>
        <p className="mt-4 text-muted-foreground">The page you are looking for does not exist.</p>
      </div>
    </div>
  );
}
