import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Ring } from "@shared/schema";

export default function RingAlerts() {
  const params = useParams<{ ringId: string }>();
  const ringId = params.ringId;
  const { toast } = useToast();

  const { data: ring } = useQuery<Ring>({
    queryKey: ["/api/rings", ringId],
  });

  const [alerts, setAlerts] = useState({
    classNearby: false,
    schoolingStarts: false,
    ringResumes: false,
  });

  const handleSave = () => {
    toast({
      title: "Alerts saved",
      description: "You'll be notified based on your preferences.",
    });
  };

  return (
    <div className="min-h-screen bg-background px-5 py-6 max-w-lg mx-auto flex flex-col" data-testid="ring-alerts-page">
      {/* Back */}
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1 text-sm text-primary mb-4 hover:underline"
        data-testid="back-button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold mb-1" data-testid="alerts-title">Ring Alerts</h1>
      <h2 className="text-lg font-semibold mb-8 text-muted-foreground">
        {ring ? `${ring.name}- ${ring.discipline}` : "Loading..."}
      </h2>

      <div className="space-y-6 flex-1">
        <label className="flex items-start gap-4 cursor-pointer">
          <Checkbox
            checked={alerts.classNearby}
            onCheckedChange={(checked) =>
              setAlerts((a) => ({ ...a, classNearby: !!checked }))
            }
            className="mt-0.5"
            data-testid="alert-class-nearby"
          />
          <span className="text-base leading-snug">
            Notify me when my class is 2 classes away
          </span>
        </label>

        <label className="flex items-start gap-4 cursor-pointer">
          <Checkbox
            checked={alerts.schoolingStarts}
            onCheckedChange={(checked) =>
              setAlerts((a) => ({ ...a, schoolingStarts: !!checked }))
            }
            className="mt-0.5"
            data-testid="alert-schooling-starts"
          />
          <span className="text-base leading-snug">
            Notify me when schooling starts
          </span>
        </label>

        <label className="flex items-start gap-4 cursor-pointer">
          <Checkbox
            checked={alerts.ringResumes}
            onCheckedChange={(checked) =>
              setAlerts((a) => ({ ...a, ringResumes: !!checked }))
            }
            className="mt-0.5"
            data-testid="alert-ring-resumes"
          />
          <span className="text-base leading-snug">
            Notify me when the ring resumes after a hold
          </span>
        </label>
      </div>

      <Button
        onClick={handleSave}
        className="w-full h-14 text-lg font-semibold rounded-xl mt-auto mb-4"
        variant="secondary"
        data-testid="save-alerts-button"
      >
        Save Alerts
      </Button>
    </div>
  );
}
