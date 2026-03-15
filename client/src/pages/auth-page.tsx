import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"viewer" | "organizer" | "staff">("viewer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name, role);
      }
      navigate("/");
    } catch (err: any) {
      toast({
        title: mode === "login" ? "Login failed" : "Registration failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5" data-testid="auth-page">
      <div className="w-full max-w-sm">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="Ringside logo">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" className="text-primary" />
              <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="2" className="text-primary" />
              <circle cx="16" cy="16" r="2.5" fill="currentColor" className="text-primary" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" data-testid="auth-title">Ringside</h1>
          <p className="text-sm text-muted-foreground mt-1">Horse show ring tracking</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1 mb-6">
          <button
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              mode === "login" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => setMode("login")}
            data-testid="tab-login"
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              mode === "register" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => setMode("register")}
            data-testid="tab-register"
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                required
                className="mt-1.5 h-11 rounded-xl"
                data-testid="input-name"
              />
            </div>
          )}

          <div>
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mt-1.5 h-11 rounded-xl"
              data-testid="input-email"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
              minLength={6}
              className="mt-1.5 h-11 rounded-xl"
              data-testid="input-password"
            />
          </div>

          {mode === "register" && (
            <div>
              <Label className="text-sm font-medium">I am a...</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {([
                  { value: "viewer" as const, label: "Viewer", desc: "Watch shows" },
                  { value: "organizer" as const, label: "Organizer", desc: "Run shows" },
                  { value: "staff" as const, label: "Staff", desc: "Ring crew" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`p-3 rounded-xl border-2 text-center transition-colors ${
                      role === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                    data-testid={`role-${opt.value}`}
                  >
                    <span className="block text-sm font-semibold">{opt.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-semibold"
            disabled={isSubmitting}
            data-testid="submit-auth"
          >
            {isSubmitting
              ? "Please wait..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </Button>
        </form>

        {mode === "login" && (
          <div className="mt-6 p-4 bg-muted/50 rounded-xl">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Demo Accounts</p>
            <div className="space-y-1.5">
              <button
                onClick={() => { setEmail("organizer@ringside.app"); setPassword("demo123"); }}
                className="text-xs text-primary hover:underline block"
                data-testid="demo-organizer"
              >
                Organizer: organizer@ringside.app / demo123
              </button>
              <button
                onClick={() => { setEmail("staff@ringside.app"); setPassword("staff123"); }}
                className="text-xs text-primary hover:underline block"
                data-testid="demo-staff"
              >
                Staff: staff@ringside.app / staff123
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
