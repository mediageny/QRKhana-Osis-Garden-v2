import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import QRCodeDisplay from "@/components/qr-code-display";
import { getCurrentUser } from "@/lib/auth";
import type { Table } from "@shared/schema";

export default function TableManagement() {
  const { type } = useParams<{ type: string }>();
  const tableType = type || "tables";
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Check authentication status
  const { data: user, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getCurrentUser,
    retry: false,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Access Denied",
        description: "Please log in to access table management.",
        variant: "destructive",
      });
      setLocation("/admin/login");
    }
  }, [user, authLoading, setLocation, toast]);

  const actualType = tableType === "tables" ? "table" : "room";

  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: ["/api/tables", actualType],
    queryFn: async () => {
      const response = await fetch(`/api/tables?type=${actualType}`);
      return response.json();
    },
  });

  const createTableMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/tables", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      setShowAddDialog(false);
      toast({ title: `${actualType === "table" ? "Table" : "Room"} added successfully` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/tables/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      setEditingTable(null);
      toast({ title: `${actualType === "table" ? "Table" : "Room"} updated successfully` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      toast({ title: `${actualType === "table" ? "Table" : "Room"} deleted successfully` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      number: formData.get("number") as string,
      name: formData.get("name") as string,
      type: actualType,
      status: formData.get("status") as string || "available",
    };

    if (editingTable) {
      updateTableMutation.mutate({ id: editingTable.id, data });
    } else {
      createTableMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm(`Are you sure you want to delete this ${actualType}?`)) {
      deleteTableMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-gray-400";
      case "occupied": return "bg-warning";
      case "reserved": return "bg-blue-500";
      default: return "bg-gray-400";
    }
  };

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  if (authLoading || tablesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 capitalize">
              {actualType} Management
            </h2>
            <p className="text-gray-600">
              Manage {actualType}s and generate QR codes
            </p>
          </div>
          <div className="flex space-x-4">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className={`${actualType === "table" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}>
                  <i className="fas fa-plus mr-2"></i>Add {actualType === "table" ? "Table" : "Room"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add {actualType === "table" ? "Table" : "Room"}</DialogTitle>
                </DialogHeader>
                <TableForm
                  onSubmit={handleSubmit}
                  type={actualType}
                  isLoading={createTableMutation.isPending}
                />
              </DialogContent>
            </Dialog>
            <Link href="/admin/dashboard">
              <Button variant="outline">
                <i className="fas fa-arrow-left mr-2"></i>Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tables?.map((table: Table) => (
            <Card key={table.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  {table.name}
                  <Badge className={`${getStatusColor(table.status)} text-white`}>
                    {table.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QRCodeDisplay tableId={table.id} tableName={table.name} />
                <div className="flex space-x-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingTable(table)}
                  >
                    <i className="fas fa-edit mr-1"></i>Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(table.id)}
                    disabled={deleteTableMutation.isPending}
                  >
                    <i className="fas fa-trash mr-1"></i>Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingTable} onOpenChange={() => setEditingTable(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {actualType === "table" ? "Table" : "Room"}</DialogTitle>
            </DialogHeader>
            <TableForm
              onSubmit={handleSubmit}
              type={actualType}
              defaultValues={editingTable || undefined}
              isLoading={updateTableMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface TableFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  type: string;
  defaultValues?: Table;
  isLoading: boolean;
}

function TableForm({ onSubmit, type, defaultValues, isLoading }: TableFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="number">Number</Label>
        <Input
          id="number"
          name="number"
          defaultValue={defaultValues?.number}
          placeholder={type === "table" ? "1" : "R1"}
          required
        />
      </div>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name}
          placeholder={type === "table" ? "Table 1" : "Room 1"}
          required
        />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues?.status || "available"}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
        </select>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <i className="fas fa-spinner fa-spin mr-2"></i>
        ) : (
          <i className="fas fa-save mr-2"></i>
        )}
        {defaultValues ? "Update" : "Add"} {type === "table" ? "Table" : "Room"}
      </Button>
    </form>
  );
}
