import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { ArrowLeft, ArrowRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Ring } from "@shared/schema";

function StatusButton({
  label,
  status,
  currentStatus,
  onSelect,
}: {
  label: string;
  status: string;
  currentStatus: string;
  onSelect: (s: string) => void;
}) {
  const isActive = currentStatus === status;
  const dotClass =
    status === "showing"
      ? "status-dot-showing"
      : status === "schooling"
        ? "status-dot-schooling"
        : "status-dot-hold";

  return (
    <button
      onClick={() => onSelect(status)}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left text-lg font-semibold transition-colors ${
        isActive ? "bg-muted" : "bg-muted/40 hover:bg-muted/60"
      }`}
      data-testid={`status-btn-${status}`}
    >
      <span className={`status-dot ${dotClass}`} />
      {label}
    </button>
  );
}

export default function RingControl() {
  const params = useParams<{ ringId: string }>();
  const ringId = params.ringId;
  const { toast } = useToast();
  const [incidentOpen, setIncidentOpen] = useState(false);

  const { data: ring } = useQuery<Ring>({
    queryKey: ["/api/rings", ringId],
    refetchInterval: 3000,
  });

  const updateRing = useMutation({
    mutationFn: async (updates: Partial<Ring>) => {
      const res = await apiRequest("PATCH", `/api/rings/${ringId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rings", ringId] });
    },
  });

  const tripMutation = useMutation({
    mutationFn: async (direction: string) => {
      const res = await apiRequest("POST", `/api/rings/${ringId}/trip`, { direction });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rings", ringId] });
    },
  });

  const navClass = useMutation({
    mutationFn: async (direction: string) => {
      const res = await apiRequest("POST", `/api/rings/${ringId}/navigate-class`, { direction });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rings", ringId] });
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: async (message: string) => {
      const now = new Date();
      const time = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
      });
      await apiRequest("POST", `/api/rings/${ringId}/activities`, { message, time });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rings", ringId, "activities"] });
    },
  });

  const handleStatusChange = (status: string) => {
    updateRing.mutate({ status, holdReason: null });
    const label = status === "showing" ? "Showing" : status === "schooling" ? "Schooling" : "Hold";
    addActivityMutation.mutate(`Status changed to ${label}`);
  };

  const handleIncident = () => {
    setIncidentOpen(false);
    updateRing.mutate({ status: "hold", holdReason: "Rider Down/Incident" });
    addActivityMutation.mutate("INCIDENT: Rider Down - Ring on Hold");
    toast({
      title: "Incident reported",
      description: "Ring is now on hold. Viewers have been notified.",
      variant: "destructive",
    });
  };

  const handleNote = (note: string) => {
    addActivityMutation.mutate(note);
    if (note === "Drag") {
      updateRing.mutate({ status: "hold", holdReason: "Drag" });
    } else if (note === "Course Change") {
      updateRing.mutate({ status: "hold", holdReason: "Course Change" });
    }
    toast({ title: "Note added", description: note });
  };

  if (!ring) {
    return (
      <div className="min-h-screen bg-background px-5 py-6 max-w-lg mx-auto">
        <div className="h-96 bg-muted/50 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 py-6 max-w-lg mx-auto pb-10" data-testid="ring-control-page">
      {/* Exit */}
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1 text-sm text-primary mb-4 hover:underline"
        data-testid="exit-ring-control"
      >
        <ArrowLeft className="h-4 w-4" />
        Exit Ring Control
      </button>

      {/* Header */}
      <h1 className="text-2xl font-bold" data-testid="control-ring-name">
        {ring.name}- {ring.discipline}
      </h1>
      <p className="text-base font-semibold text-muted-foreground mb-4">
        Official Control
      </p>

      {/* STATUS */}
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2">
          Status
        </h2>
        <div className="space-y-2">
          <StatusButton
            label="Showing"
            status="showing"
            currentStatus={ring.status}
            onSelect={handleStatusChange}
          />
          <p className="text-xs text-muted-foreground ml-1">
            Sets Public Ring Status
          </p>
          <StatusButton
            label="Schooling"
            status="schooling"
            currentStatus={ring.status}
            onSelect={handleStatusChange}
          />
          <StatusButton
            label="Hold"
            status="hold"
            currentStatus={ring.status}
            onSelect={handleStatusChange}
          />
        </div>
      </div>

      {/* Incident */}
      <div className="mb-6">
        <p className="text-sm font-semibold mb-2">Incident</p>
        <Button
          variant="destructive"
          className="rounded-xl px-6 py-3 text-base font-semibold"
          onClick={() => setIncidentOpen(true)}
          data-testid="incident-button"
        >
          Rider Down/Incident
        </Button>
        <p className="text-xs text-muted-foreground mt-1.5">
          *Auto places ring on hold and notifies viewers*
        </p>
        <p className="text-xs text-muted-foreground">*Requires Confirmation*</p>
      </div>

      {/* Incident Confirmation Dialog */}
      <AlertDialog open={incidentOpen} onOpenChange={setIncidentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Incident</AlertDialogTitle>
            <AlertDialogDescription>
              This will place the ring on hold and notify all viewers. Are you
              sure you want to report an incident?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="incident-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleIncident}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="incident-confirm"
            >
              Confirm Incident
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Current Class */}
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2">
          Current Class
        </h2>
        <p className="text-lg font-semibold mb-3" data-testid="current-class-label">
          {ring.currentClassName}- Class {ring.currentClassNumber} of{" "}
          {ring.totalClasses}
        </p>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1 h-12 rounded-xl text-base font-semibold"
            onClick={() => navClass.mutate("previous")}
            disabled={ring.currentClassNumber === 1}
            data-testid="prev-class-button"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Previous Class
          </Button>
          <Button
            variant="secondary"
            className="flex-1 h-12 rounded-xl text-base font-semibold"
            onClick={() => navClass.mutate("next")}
            disabled={ring.currentClassNumber === ring.totalClasses}
            data-testid="next-class-button"
          >
            Next Class
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Trips */}
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2">
          Trips
        </h2>
        <div className="flex items-center justify-center gap-6">
          <Button
            variant="outline"
            size="icon"
            className="h-16 w-16 rounded-xl text-2xl"
            onClick={() => tripMutation.mutate("decrement")}
            data-testid="trip-minus"
          >
            <Minus className="h-7 w-7" />
          </Button>
          <span className="text-4xl font-bold tabular-nums" data-testid="trip-count">
            {ring.tripsCompleted}/{ring.totalTrips}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-16 w-16 rounded-xl text-2xl"
            onClick={() => tripMutation.mutate("increment")}
            data-testid="trip-plus"
          >
            <Plus className="h-7 w-7" />
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-1">
          Tap after each trip
        </p>
      </div>

      {/* Notes */}
      <div>
        <p className="text-sm font-semibold mb-2">Note</p>
        <div className="flex flex-wrap gap-2">
          {["Drag", "Vet Check", "Course Change"].map((note) => (
            <Button
              key={note}
              variant="secondary"
              className="rounded-xl text-sm font-medium"
              onClick={() => handleNote(note)}
              data-testid={`note-btn-${note.toLowerCase().replace(/\s/g, "-")}`}
            >
              {note}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
