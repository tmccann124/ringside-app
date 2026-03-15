import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import type { Show, Ring } from "@shared/schema";

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "showing"
      ? "status-dot-showing"
      : status === "schooling"
        ? "status-dot-schooling"
        : "status-dot-hold";
  return <span className={`status-dot ${cls}`} />;
}

function StatusLabel({ status, holdReason }: { status: string; holdReason: string | null }) {
  if (status === "hold" && holdReason) {
    return <span className="font-bold text-lg">Hold: {holdReason}</span>;
  }
  return (
    <span className="font-bold text-lg capitalize">{status === "showing" ? "Showing" : status === "schooling" ? "Schooling" : "Hold"}</span>
  );
}

function RingCard({ ring }: { ring: Ring }) {
  const progress =
    ring.totalTrips && ring.totalTrips > 0
      ? ((ring.tripsCompleted || 0) / ring.totalTrips) * 100
      : 0;

  return (
    <Link href={`/ring/${ring.id}`}>
      <div
        className="rounded-xl bg-muted/60 p-5 cursor-pointer hover:bg-muted transition-colors"
        data-testid={`ring-card-${ring.id}`}
      >
        <h3 className="text-xl font-bold mb-1">
          {ring.name} - {ring.discipline}
        </h3>
        <div className="flex items-center gap-2 mb-3">
          <StatusDot status={ring.status} />
          <StatusLabel status={ring.status} holdReason={ring.holdReason} />
        </div>

        {ring.status !== "hold" && (
          <>
            <p className="text-lg font-semibold">{ring.currentClassName}</p>
            <p className="text-lg">
              Class {ring.currentClassNumber} of {ring.totalClasses}
            </p>
            <p className="text-lg">
              {ring.tripsCompleted}/{ring.totalTrips} Trips
            </p>
            <div className="trip-progress mt-2">
              <div
                className="trip-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground mt-3">
          Updated {ring.updatedAt}
        </p>
      </div>
    </Link>
  );
}

export default function ShowOverview() {
  const params = useParams<{ showId: string }>();
  const showId = params.showId;

  const { data: show } = useQuery<Show>({
    queryKey: ["/api/shows", showId],
  });

  const { data: rings, isLoading } = useQuery<Ring[]>({
    queryKey: [`/api/shows/${showId}/rings`],
  });

  return (
    <div className="min-h-screen bg-background px-5 py-6 max-w-lg mx-auto" data-testid="show-overview-page">
      <Link href="/">
        <button className="flex items-center gap-1 text-sm text-primary mb-4 hover:underline" data-testid="back-to-shows">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-6" data-testid="show-name">
        {show?.name || "Loading..."}
      </h1>

      <div className="space-y-4">
        {isLoading &&
          [1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        {rings?.map((ring) => (
          <RingCard key={ring.id} ring={ring} />
        ))}
      </div>
    </div>
  );
}
