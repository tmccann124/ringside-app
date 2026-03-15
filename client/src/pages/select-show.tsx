import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, LogIn, LayoutDashboard, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { Show } from "@shared/schema";

export default function SelectShow() {
  const [search, setSearch] = useState("");
  const { user, logout, isOrganizer } = useAuth();

  const { data: shows, isLoading } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const filtered = shows?.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background px-5 py-8 max-w-lg mx-auto" data-testid="select-show-page">
      {/* Header with auth */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="app-title">
          Ringside
        </h1>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isOrganizer && (
                <Link href="/dashboard">
                  <Button variant="outline" size="sm" className="rounded-lg text-xs" data-testid="btn-dashboard">
                    <LayoutDashboard className="h-3.5 w-3.5 mr-1" /> Dashboard
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={logout} data-testid="btn-logout">
                <LogOut className="h-3.5 w-3.5 mr-1" /> {user.name.split(" ")[0]}
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <Button variant="outline" size="sm" className="rounded-lg text-xs" data-testid="btn-sign-in">
                <LogIn className="h-3.5 w-3.5 mr-1" /> Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Input
          type="search"
          placeholder="Search shows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12 pl-4 pr-12 rounded-xl bg-muted/60 border-0 text-base"
          data-testid="search-shows-input"
        />
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      </div>

      {/* Show list */}
      <div className="space-y-4">
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        )}
        {filtered?.map((show) => (
          <Link key={show.id} href={`/show/${show.id}`}>
            <div
              className="flex items-center justify-center h-24 rounded-xl bg-muted/70 hover:bg-muted transition-colors cursor-pointer"
              data-testid={`show-card-${show.id}`}
            >
              <span className="text-lg font-semibold text-foreground/80">
                {show.name}
              </span>
            </div>
          </Link>
        ))}
        {filtered?.length === 0 && !isLoading && (
          <p className="text-center text-muted-foreground py-8">
            No shows found
          </p>
        )}
      </div>

      {/* Remember checkbox */}
      <div className="flex items-center gap-3 mt-8">
        <Checkbox id="remember" data-testid="remember-checkbox" />
        <label
          htmlFor="remember"
          className="text-sm text-foreground cursor-pointer"
        >
          Remember last show
        </label>
      </div>
    </div>
  );
}
