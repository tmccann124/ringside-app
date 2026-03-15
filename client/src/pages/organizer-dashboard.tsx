import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Trash2, Users, CircleDot, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { Show, Ring } from "@shared/schema";

function CreateShowDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();

  const createShow = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/organizer/shows", { name, location, startDate, endDate });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizer/shows"] });
      toast({ title: "Show created" });
      setName(""); setLocation(""); setStartDate(""); setEndDate("");
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create show", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Show</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); createShow.mutate(); }} className="space-y-4">
          <div>
            <Label htmlFor="show-name">Show Name</Label>
            <Input id="show-name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 rounded-xl" placeholder="Devon Horse Show" data-testid="input-show-name" />
          </div>
          <div>
            <Label htmlFor="show-loc">Location</Label>
            <Input id="show-loc" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 rounded-xl" placeholder="Devon, PA" data-testid="input-show-location" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="show-start">Start Date</Label>
              <Input id="show-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 rounded-xl" data-testid="input-show-start" />
            </div>
            <div>
              <Label htmlFor="show-end">End Date</Label>
              <Input id="show-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 rounded-xl" data-testid="input-show-end" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="rounded-xl" disabled={createShow.isPending} data-testid="btn-create-show">
              {createShow.isPending ? "Creating..." : "Create Show"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateRingDialog({ open, onClose, showId }: { open: boolean; onClose: () => void; showId: string }) {
  const [name, setName] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [totalClasses, setTotalClasses] = useState("5");
  const { toast } = useToast();

  const createRing = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/organizer/shows/${showId}/rings`, {
        name, discipline, totalClasses: parseInt(totalClasses) || 5, totalTrips: 12,
        currentClassName: `${discipline} Class 1`, currentClassNumber: 1,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows", showId, "rings"] });
      toast({ title: "Ring created" });
      setName(""); setDiscipline(""); setTotalClasses("5");
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create ring", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Ring</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); createRing.mutate(); }} className="space-y-4">
          <div>
            <Label htmlFor="ring-name">Ring Name</Label>
            <Input id="ring-name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 rounded-xl" placeholder="Ring 1" data-testid="input-ring-name" />
          </div>
          <div>
            <Label htmlFor="ring-disc">Discipline</Label>
            <Input id="ring-disc" value={discipline} onChange={(e) => setDiscipline(e.target.value)} required className="mt-1 rounded-xl" placeholder="Hunters" data-testid="input-ring-discipline" />
          </div>
          <div>
            <Label htmlFor="ring-classes">Total Classes</Label>
            <Input id="ring-classes" type="number" min="1" value={totalClasses} onChange={(e) => setTotalClasses(e.target.value)} className="mt-1 rounded-xl" data-testid="input-ring-classes" />
          </div>
          <DialogFooter>
            <Button type="submit" className="rounded-xl" disabled={createRing.isPending} data-testid="btn-create-ring">
              {createRing.isPending ? "Creating..." : "Add Ring"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ShowCard({ show }: { show: Show }) {
  const [expanded, setExpanded] = useState(false);
  const [ringDialogOpen, setRingDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();

  const { data: rings = [] } = useQuery<Ring[]>({
    queryKey: ["/api/shows", show.id, "rings"],
    enabled: expanded,
  });

  const deleteShow = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/organizer/shows/${show.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizer/shows"] });
      toast({ title: "Show deleted" });
    },
  });

  const deleteRing = useMutation({
    mutationFn: async (ringId: string) => {
      await apiRequest("DELETE", `/api/organizer/rings/${ringId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows", show.id, "rings"] });
      toast({ title: "Ring deleted" });
    },
  });

  const statusDot = (status: string) => {
    const cls = status === "showing" ? "bg-green-500" : status === "schooling" ? "bg-yellow-500" : "bg-red-500";
    return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} />;
  };

  return (
    <div className="border rounded-2xl overflow-hidden" data-testid={`show-card-${show.id}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
        data-testid={`show-toggle-${show.id}`}
      >
        <div>
          <h3 className="font-semibold text-base">{show.name}</h3>
          <p className="text-sm text-muted-foreground">{show.location} &middot; {show.startDate}</p>
        </div>
        <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t bg-muted/10">
          <div className="flex items-center justify-between mt-3 mb-2">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Rings</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => setRingDialogOpen(true)} data-testid={`add-ring-${show.id}`}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Ring
              </Button>
              <Button size="sm" variant="ghost" className="rounded-lg text-xs text-destructive" onClick={() => setDeleteOpen(true)} data-testid={`delete-show-${show.id}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {rings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No rings yet. Add one to get started.</p>
          ) : (
            <div className="space-y-2">
              {rings.map((ring) => (
                <div key={ring.id} className="flex items-center justify-between p-3 bg-background rounded-xl border" data-testid={`ring-row-${ring.id}`}>
                  <div className="flex items-center gap-3">
                    {statusDot(ring.status)}
                    <div>
                      <p className="font-medium text-sm">{ring.name}</p>
                      <p className="text-xs text-muted-foreground">{ring.discipline} &middot; {ring.currentClassName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/ring/${ring.id}/control`}>
                      <Button size="sm" variant="secondary" className="rounded-lg text-xs" data-testid={`control-ring-${ring.id}`}>
                        <CircleDot className="h-3.5 w-3.5 mr-1" /> Control
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" className="rounded-lg text-xs text-destructive" onClick={() => deleteRing.mutate(ring.id)} data-testid={`delete-ring-${ring.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <CreateRingDialog open={ringDialogOpen} onClose={() => setRingDialogOpen(false)} showId={show.id} />

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Show</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{show.name}"? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteShow.mutate()} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

export default function OrganizerDashboard() {
  const { user, logout } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: shows = [], isLoading } = useQuery<Show[]>({
    queryKey: ["/api/organizer/shows"],
  });

  return (
    <div className="min-h-screen bg-background px-5 py-6 max-w-lg mx-auto pb-10" data-testid="organizer-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">My Shows</h1>
          <p className="text-sm text-muted-foreground">{user?.name} &middot; Organizer</p>
        </div>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-lg text-xs" data-testid="btn-viewer-mode">
              <Users className="h-3.5 w-3.5 mr-1" /> Viewer
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={logout} data-testid="btn-logout">
            <LogOut className="h-3.5 w-3.5 mr-1" /> Sign Out
          </Button>
        </div>
      </div>

      {/* Create Show */}
      <Button className="w-full h-12 rounded-xl text-base font-semibold mb-6" onClick={() => setCreateOpen(true)} data-testid="btn-new-show">
        <Plus className="h-5 w-5 mr-2" /> Create New Show
      </Button>

      {/* Shows */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-muted/50 rounded-2xl animate-pulse" />)}
        </div>
      ) : shows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">No shows yet. Create your first show to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shows.map((show) => <ShowCard key={show.id} show={show} />)}
        </div>
      )}

      <CreateShowDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
