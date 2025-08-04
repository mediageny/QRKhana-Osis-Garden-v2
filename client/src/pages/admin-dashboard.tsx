import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";
import { logout, getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { Pause, Play, Clock } from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        description: "Please log in to access the admin dashboard.",
        variant: "destructive",
      });
      setLocation("/admin/login");
    }
  }, [user, authLoading, setLocation, toast]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);
      
      if (data.type === "new_order" || data.type === "order_updated" || data.type === "payment_updated") {
        // Immediately invalidate all relevant queries for instant updates
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
        queryClient.invalidateQueries({ queryKey: ["/api/analytics/payments"] });
        
        // Show appropriate toast notifications
        if (data.type === "new_order") {
          toast({
            title: "New Order Received",
            description: `Order #${data.orderNumber} from ${data.serviceType} service`,
          });
        } else if (data.type === "order_updated") {
          toast({
            title: "Order Status Updated",
            description: `Order #${data.orderId} status changed to ${data.status}`,
          });
        } else if (data.type === "payment_updated") {
          toast({
            title: "Payment Updated",
            description: `Order #${data.orderId} payment: ${data.paymentMethod} - ${data.paymentStatus}`,
          });
        }
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      socket.close();
    };
  }, [queryClient, toast]);
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 5000, // Reduced to 5 seconds for backup polling
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of the admin dashboard.",
      });
      setLocation("/admin/login");
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "There was an error logging you out. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const { data: restaurantAnalytics } = useQuery({
    queryKey: ["/api/analytics", "restaurant"],
    queryFn: async () => {
      const response = await fetch("/api/analytics?period=today&serviceType=restaurant");
      return response.json();
    },
    refetchInterval: 5000, // Reduced to 5 seconds for backup polling
  });

  const { data: barAnalytics } = useQuery({
    queryKey: ["/api/analytics", "bar"],
    queryFn: async () => {
      const response = await fetch("/api/analytics?period=today&serviceType=bar");
      return response.json();
    },
    refetchInterval: 5000, // Reduced to 5 seconds for backup polling
  });

  // Payment analytics
  const { data: paymentAnalytics } = useQuery({
    queryKey: ["/api/analytics/payments"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/payments?period=today");
      return response.json();
    },
    refetchInterval: 5000, // Reduced to 5 seconds for backup polling
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-gray-600">Manage your restaurant operations</p>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? (
              <i className="fas fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className="fas fa-sign-out-alt mr-2"></i>
            )}
            Logout
          </Button>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today's Sales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats?.todaySales || 0)}
                  </p>
                </div>
                <div className="bg-success/10 p-3 rounded-full">
                  <i className="fas fa-rupee-sign text-success text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.activeOrders || 0}</p>
                </div>
                <div className="bg-warning/10 p-3 rounded-full">
                  <i className="fas fa-clock text-warning text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tables Active</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.activeTables || "0/0"}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <i className="fas fa-table text-primary text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Menu Items</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.menuItems || 0}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <i className="fas fa-utensils text-purple-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pause Orders Management */}
        <PauseOrdersSection />

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-utensils mr-2 text-primary"></i>
                Menu Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/menu/restaurant">
                <Button className="w-full bg-primary text-white hover:bg-blue-700 mb-3">
                  <i className="fas fa-plate-wheat mr-2"></i>Restaurant Menu
                </Button>
              </Link>
              <Link href="/admin/menu/bar">
                <Button className="w-full bg-purple-600 text-white hover:bg-purple-700">
                  <i className="fas fa-wine-glass mr-2"></i>Bar Menu
                </Button>
              </Link>
              <div className="text-sm text-gray-600 mt-4">
                <p>Restaurant Sales: {formatCurrency(restaurantAnalytics?.totalSales || 0)}</p>
                <p>Bar Sales: {formatCurrency(barAnalytics?.totalSales || 0)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Table Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-table mr-2 text-success"></i>
                Table & Room Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/tables">
                <Button className="w-full bg-green-600 text-white hover:bg-green-700 mb-3">
                  <i className="fas fa-table mr-2"></i>Manage Tables
                </Button>
              </Link>
              <Link href="/admin/rooms">
                <Button className="w-full bg-blue-600 text-white hover:bg-blue-700">
                  <i className="fas fa-door-open mr-2"></i>Manage Rooms
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Analytics - Consolidated */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-chart-line mr-2 text-warning"></i>
                Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/analytics">
                <Button className="w-full bg-warning text-white hover:bg-orange-700">
                  <i className="fas fa-chart-bar mr-2"></i>View Analytics
                </Button>
              </Link>
              <div className="text-sm text-gray-600 mt-4 space-y-1">
                <p>Restaurant Orders: {restaurantAnalytics?.orderCount || 0}</p>
                <p>Bar Orders: {barAnalytics?.orderCount || 0}</p>
                <div className="border-t pt-2 mt-2">
                  <p className="font-medium text-gray-800">Payment Methods (Today)</p>
                  <p>💰 Cash: {formatCurrency(paymentAnalytics?.cash || 0)}</p>
                  <p>📱 UPI: {formatCurrency(paymentAnalytics?.upi || 0)}</p>
                  <p>💳 Card: {formatCurrency(paymentAnalytics?.card || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Quick Access */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-tachometer-alt mr-2 text-blue-600"></i>
                Quick Access Dashboards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/kitchen-dashboard">
                  <Button className="w-full bg-success text-white hover:bg-green-700 py-3">
                    <i className="fas fa-utensils mr-2"></i>Kitchen Dashboard
                  </Button>
                </Link>
                <Link href="/bar-dashboard">
                  <Button className="w-full bg-purple-600 text-white hover:bg-purple-700 py-3">
                    <i className="fas fa-glass-martini mr-2"></i>Bar Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Pause Orders Management Component
function PauseOrdersSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pauseDuration, setPauseDuration] = useState(30);
  const [pauseReason, setPauseReason] = useState("Rush hours - Please wait");

  // Fetch pause status for both services
  const { data: restaurantPauseStatus, isLoading: restaurantLoading } = useQuery({
    queryKey: ["/api/order-pause/restaurant"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: barPauseStatus, isLoading: barLoading } = useQuery({
    queryKey: ["/api/order-pause/bar"],
    refetchInterval: 10000,
  });

  // Toggle pause mutation
  const togglePauseMutation = useMutation({
    mutationFn: async ({ serviceType, isPaused }: { serviceType: string; isPaused: boolean }) => {
      const response = await apiRequest("POST", "/api/order-pause", {
        serviceType,
        isPaused,
        pauseDurationMinutes: pauseDuration,
        pauseReason: pauseReason
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/order-pause/restaurant"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-pause/bar"] });
      
      toast({
        title: variables.isPaused ? "Orders Paused" : "Orders Resumed",
        description: `${variables.serviceType} orders have been ${variables.isPaused ? 'paused' : 'resumed'} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update pause status",
        variant: "destructive",
      });
    },
  });

  const handleTogglePause = (serviceType: string, currentlyPaused: boolean) => {
    togglePauseMutation.mutate({
      serviceType,
      isPaused: !currentlyPaused
    });
  };

  const formatRemainingTime = (pausedAt: string, durationMinutes: number) => {
    const pauseTime = new Date(pausedAt);
    const endTime = new Date(pauseTime.getTime() + durationMinutes * 60000);
    const now = new Date();
    const remaining = endTime.getTime() - now.getTime();

    if (remaining <= 0) return "Expired";

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    return `${minutes}m ${seconds}s remaining`;
  };

  const isServicePaused = (pauseStatus: any) => {
    if (!pauseStatus?.isPaused) return false;
    
    const pauseTime = new Date(pauseStatus.pausedAt);
    const endTime = new Date(pauseTime.getTime() + pauseStatus.pauseDurationMinutes * 60000);
    const now = new Date();
    
    return now < endTime;
  };

  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Pause className="mr-2 text-red-600" />
            Order Pause Management
          </CardTitle>
          <p className="text-sm text-gray-600">
            Control order acceptance during rush hours or maintenance periods
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pause Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pause Duration (minutes)
              </label>
              <Input
                type="number"
                value={pauseDuration}
                onChange={(e) => setPauseDuration(parseInt(e.target.value) || 30)}
                min="5"
                max="120"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pause Message
              </label>
              <Input
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Custom message for customers"
                className="w-full"
              />
            </div>
          </div>

          {/* Service Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Restaurant Orders */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center">
                  <i className="fas fa-utensils mr-2 text-primary"></i>
                  Restaurant Orders
                </h3>
                {restaurantLoading && (
                  <i className="fas fa-spinner fa-spin text-gray-400"></i>
                )}
              </div>
              
              {restaurantPauseStatus && (
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${isServicePaused(restaurantPauseStatus) ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isServicePaused(restaurantPauseStatus) ? 'text-red-800' : 'text-green-800'}`}>
                        {isServicePaused(restaurantPauseStatus) ? 'PAUSED' : 'ACTIVE'}
                      </span>
                      {isServicePaused(restaurantPauseStatus) && (
                        <span className="text-sm text-red-600 flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatRemainingTime(restaurantPauseStatus.pausedAt, restaurantPauseStatus.pauseDurationMinutes)}
                        </span>
                      )}
                    </div>
                    {isServicePaused(restaurantPauseStatus) && (
                      <p className="text-sm text-red-700 mt-1">
                        {restaurantPauseStatus.pauseReason}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => handleTogglePause('restaurant', isServicePaused(restaurantPauseStatus))}
                    disabled={togglePauseMutation.isPending}
                    className={`w-full ${isServicePaused(restaurantPauseStatus) ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {togglePauseMutation.isPending ? (
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                    ) : isServicePaused(restaurantPauseStatus) ? (
                      <Play className="h-4 w-4 mr-2" />
                    ) : (
                      <Pause className="h-4 w-4 mr-2" />
                    )}
                    {isServicePaused(restaurantPauseStatus) ? 'Resume Orders' : 'Pause Orders'}
                  </Button>
                </div>
              )}
            </div>

            {/* Bar Orders */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center">
                  <i className="fas fa-wine-glass mr-2 text-purple-600"></i>
                  Bar Orders
                </h3>
                {barLoading && (
                  <i className="fas fa-spinner fa-spin text-gray-400"></i>
                )}
              </div>
              
              {barPauseStatus && (
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${isServicePaused(barPauseStatus) ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isServicePaused(barPauseStatus) ? 'text-red-800' : 'text-green-800'}`}>
                        {isServicePaused(barPauseStatus) ? 'PAUSED' : 'ACTIVE'}
                      </span>
                      {isServicePaused(barPauseStatus) && (
                        <span className="text-sm text-red-600 flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatRemainingTime(barPauseStatus.pausedAt, barPauseStatus.pauseDurationMinutes)}
                        </span>
                      )}
                    </div>
                    {isServicePaused(barPauseStatus) && (
                      <p className="text-sm text-red-700 mt-1">
                        {barPauseStatus.pauseReason}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => handleTogglePause('bar', isServicePaused(barPauseStatus))}
                    disabled={togglePauseMutation.isPending}
                    className={`w-full ${isServicePaused(barPauseStatus) ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {togglePauseMutation.isPending ? (
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                    ) : isServicePaused(barPauseStatus) ? (
                      <Play className="h-4 w-4 mr-2" />
                    ) : (
                      <Pause className="h-4 w-4 mr-2" />
                    )}
                    {isServicePaused(barPauseStatus) ? 'Resume Orders' : 'Pause Orders'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={() => {
                  setPauseDuration(15);
                  setPauseReason("Quick break - Back in 15 minutes");
                }}
                variant="outline"
                size="sm"
              >
                15min Break
              </Button>
              <Button
                onClick={() => {
                  setPauseDuration(30);
                  setPauseReason("Rush hours - Please wait");
                }}
                variant="outline"
                size="sm"
              >
                30min Rush
              </Button>
              <Button
                onClick={() => {
                  setPauseDuration(60);
                  setPauseReason("Kitchen maintenance - Back in 1 hour");
                }}
                variant="outline"
                size="sm"
              >
                1hr Maintenance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
