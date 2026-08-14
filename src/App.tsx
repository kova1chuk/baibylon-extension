import { ThemeToggle } from "./components/ThemeToggle";

function App() {
  return (
    <div className="w-96 bg-background text-foreground p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold">Vocairo</h1>
        <ThemeToggle />
      </div>
      <p className="text-xs text-muted-foreground">Налаштування зʼявляться тут.</p>
    </div>
  );
}

export default App;
