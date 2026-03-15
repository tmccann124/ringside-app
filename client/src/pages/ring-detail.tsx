import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Ring, Activity } from "@shared/schema";

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "showing"
      ? "status-dot-showing"
      : status === "schooling"
        ? "status-dot-schooling"
        : "status-dot-hold";
  return <span className={`status-dot ${cls}`} />;
}

export default function RingDetail() {
  const params = useParams<{ ringId: string }>();
  const ringId = params.ringId;
  const [, navigate] = useLocation();
  const [following, setFollowing] = useState(false);

  const { data: ring } = useQuery<Ring>({
    queryKey: ["/api/rings", ringId],
    refetchInterval: 5000,
  });

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/rings", ringId, "activities"],
    refetchInterval: 5000,
  });

  if (!ring) {
    return (
      <div className="min-h-screen bg-background px-5 py-6 max-w-lg mx-auto">
        <div className="h-96 bg-muted/50 animate-pulse rounded-xl" />
      </div>
    );
  }

  const progress =
    ring.totalTrips && ring.totalTrips > 0
      ? ((ring.tripsCompleted || 0) / ring.totalTrips) * 100
      : 0;

  const statusLabel =
    ring.status === "showing"
      ? "Showing"
      : ring.status === "schooling"
        ? "Schooling"
        : "Hold";

  return (
    <div className="min-h-screen bg-background px-5 py-6 max-w-lg mx-auto" data-testid="ring-detail-page">
      {/* Back */}
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1 text-sm text-primary mb-4 hover:underline"
        data-testid="back-button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Ring header */}
      <h1 className="text-2xl font-bold mb-2" data-testid="ring-name">
        {ring.name}- {ring.discipline}
      </h1>
      <div className="flex items-center gap-2 mb-6">
        <StatusDot status={ring.status} />
        <span className="text-lg font-semibold">{statusLabel}</span>
      </div>

      {/* Now Showing */}
      <div className="mb-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">Now Showing</p>
        <div className="rounded-xl bg-muted/60 p-4" data-testid="now-showing-card">
          <p className="text-xl font-bold">{ring.currentClassName}</p>
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
        </div>
      </div>

      {/* Up Next */}
      {ring.nextClassName && (
        <div className="mb-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">Up Next</p>
          <div className="rounded-xl bg-muted/60 p-4" data-testid="up-next-card">
            <p className="text-lg font-semibold">{ring.nextClassName}</p>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="mb-8">
        <p className="text-sm font-medium text-muted-foreground mb-2">Recent Activity</p>
        <div className="rounded-xl bg-muted/60 p-4" data-testid="activity-list">
          {activities && activities.length > 0 ? (
            <ul className="space-y-2">
              {activities.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 flex-shrink-0" />
                  <span className="text-base">
                    {a.message} - {a.time}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No recent activity</p>
          )}
        </div>
      </div>

      {/* Follow + Alerts */}
      <div className="space-y-3">
        <Button
          variant={following ? "default" : "secondary"}
          className="w-full h-14 text-lg font-semibold rounded-xl"
          onClick={() => setFollowing(!following)}
          data-testid="follow-ring-button"
        >
          <Star className={`h-5 w-5 mr-2 ${following ? "fill-current" : ""}`} />
          {following ? "Following This Ring" : "Follow This Ring"}
        </Button>

        <Link href={`/ring/${ringId}/alerts`}>
          <Button
            variant="outline"
            className="w-full h-12 text-base rounded-xl"
            data-testid="ring-alerts-button"
          >
            Ring Alerts
          </Button>
        </Link>
      </div>
    </div>
  );
}
