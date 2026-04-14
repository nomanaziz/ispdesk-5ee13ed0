import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarIcon, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { cn } from "@/lib/utils";

type EventHoliday = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  type: string;
  status: string;
  created_at: string;
};

const typeLabels: Record<string, string> = {
  holiday: "ছুটি",
  event: "ইভেন্ট",
  meeting: "মিটিং",
};

const typeBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  holiday: "destructive",
  event: "default",
  meeting: "secondary",
};

export default function Events() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventHoliday | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [type, setType] = useState("holiday");
  const [status, setStatus] = useState(true);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events_holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events_holidays")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as EventHoliday[];
    },
  });

  const filteredEvents = filter === "all" ? events : events.filter((e) => e.type === filter);

  const upcomingEvents = events
    .filter((e) => e.status === "active" && new Date(e.event_date) >= new Date(new Date().toDateString()))
    .slice(0, 5);

  const eventDates = events
    .filter((e) => e.status === "active")
    .map((e) => new Date(e.event_date));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title || !eventDate) throw new Error("Title and date required");
      const payload = {
        title,
        description: description || null,
        event_date: format(eventDate, "yyyy-MM-dd"),
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
        type,
        status: status ? "active" : "inactive",
      };
      if (editing) {
        const { error } = await supabase.from("events_holidays").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events_holidays").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "আপডেট সফল হয়েছে" : "সফলভাবে যোগ করা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["events_holidays"] });
      closeDialog();
    },
    onError: () => toast.error("একটি ত্রুটি হয়েছে"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events_holidays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("সফলভাবে মুছে ফেলা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["events_holidays"] });
    },
  });

  const openAdd = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setEventDate(undefined);
    setEndDate(undefined);
    setType("holiday");
    setStatus(true);
    setDialogOpen(true);
  };

  const openEdit = (e: EventHoliday) => {
    setEditing(e);
    setTitle(e.title);
    setDescription(e.description || "");
    setEventDate(new Date(e.event_date));
    setEndDate(e.end_date ? new Date(e.end_date) : undefined);
    setType(e.type);
    setStatus(e.status === "active");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ইভেন্ট ও ছুটি</h1>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> নতুন ইভেন্ট
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini Calendar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> ক্যালেন্ডার
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="multiple"
              selected={eventDates}
              className="rounded-md border pointer-events-auto"
              modifiersClassNames={{ selected: "bg-primary text-primary-foreground" }}
            />
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">আসন্ন ইভেন্ট</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">কোনো আসন্ন ইভেন্ট নেই</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((e) => (
                  <div key={e.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(e.event_date), "dd MMM yyyy", { locale: bn })}
                        {e.end_date && ` — ${format(new Date(e.end_date), "dd MMM yyyy", { locale: bn })}`}
                      </p>
                    </div>
                    <Badge variant={typeBadgeVariant[e.type] || "outline"}>{typeLabels[e.type] || e.type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs + Table */}
      <Card>
        <CardHeader className="pb-2">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">সকল</TabsTrigger>
              <TabsTrigger value="holiday">ছুটি</TabsTrigger>
              <TabsTrigger value="event">ইভেন্ট</TabsTrigger>
              <TabsTrigger value="meeting">মিটিং</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>শিরোনাম</TableHead>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>শেষ তারিখ</TableHead>
                  <TableHead>ধরন</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead className="text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</TableCell>
                  </TableRow>
                ) : filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো ডেটা নেই</TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((e, i) => (
                    <TableRow key={e.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell>{format(new Date(e.event_date), "dd MMM yyyy", { locale: bn })}</TableCell>
                      <TableCell>{e.end_date ? format(new Date(e.end_date), "dd MMM yyyy", { locale: bn }) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={typeBadgeVariant[e.type] || "outline"}>{typeLabels[e.type] || e.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.status === "active" ? "default" : "outline"}>
                          {e.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(e.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "ইভেন্ট সম্পাদনা" : "নতুন ইভেন্ট যোগ করুন"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">শিরোনাম *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ইভেন্টের নাম" />
            </div>
            <div>
              <label className="text-sm font-medium">বিবরণ</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="বিবরণ লিখুন" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">তারিখ *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !eventDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {eventDate ? format(eventDate, "dd MMM yyyy", { locale: bn }) : "তারিখ নির্বাচন"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={eventDate} onSelect={setEventDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium">শেষ তারিখ</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd MMM yyyy", { locale: bn }) : "তারিখ নির্বাচন"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">ধরন</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">ছুটি</SelectItem>
                  <SelectItem value="event">ইভেন্ট</SelectItem>
                  <SelectItem value="meeting">মিটিং</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={status} onCheckedChange={setStatus} />
              <label className="text-sm">{status ? "সক্রিয়" : "নিষ্ক্রিয়"}</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
