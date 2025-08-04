import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { apiRequest } from "@/lib/queryClient";
import type { Order } from "@shared/schema";
import { Clock, CheckCircle, CreditCard, DollarSign, Package, RotateCcw, X } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BarDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastResetCheck, setLastResetCheck] = useState<Date>(new Date());

  // Auto-reset at midnight IST check
  useEffect(() => {
    const checkMidnightReset = () => {
      const istNow = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
      const currentDate = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());
      const lastCheckDate = new Date(lastResetCheck.getFullYear(), lastResetCheck.getMonth(), lastResetCheck.getDate());
      
      // If it's a new day (after midnight IST) since last check
      if (currentDate > lastCheckDate) {
        resetOrdersMutation.mutate();
        setLastResetCheck(new Date());
      }
    };

    // Check every minute for midnight reset
    const resetInterval = setInterval(checkMidnightReset, 60000);
    
    return () => clearInterval(resetInterval);
  }, [lastResetCheck]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_order" || data.type === "order_updated" || data.type === "payment_updated" || data.type === "orders_reset") {
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        if (data.type === "orders_reset") {
          toast({
            title: "Orders Reset",
            description: "Completed orders have been reset",
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

  const { data: allOrders, isLoading } = useQuery({
    queryKey: ["/api/orders", "bar"],
    queryFn: async () => {
      const response = await fetch("/api/orders?serviceType=bar");
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Filter orders for today only (IST timezone)
  const getTodaysOrders = (orders: Order[]) => {
    // Get IST timezone dates
    const istNow = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)); // Add 5.5 hours for IST
    const today = new Date(istNow);
    today.setHours(0, 0, 0, 0); // Start of today IST
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow IST
    
    // Convert to UTC for comparison with database timestamps
    const todayUTC = new Date(today.getTime() - (5.5 * 60 * 60 * 1000));
    const tomorrowUTC = new Date(tomorrow.getTime() - (5.5 * 60 * 60 * 1000));
    
    return orders?.filter((order: Order) => {
      const orderDate = new Date(order.createdAt!);
      return orderDate >= todayUTC && orderDate < tomorrowUTC;
    }) || [];
  };

  const orders = getTodaysOrders(allOrders || []);

  const resetOrdersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/orders/reset");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Orders Reset",
        description: "All completed orders have been reset successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset orders",
        variant: "destructive",
      });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PUT", `/api/orders/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, paymentMethod, paymentStatus }: { id: number; paymentMethod: string; paymentStatus: string }) => {
      const response = await apiRequest("PUT", `/api/orders/${id}/payment`, { paymentMethod, paymentStatus });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Payment updated",
        description: "Payment information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await apiRequest("PUT", `/api/orders/${id}/cancel`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order cancelled",
        description: "Order has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMarkAsDone = (orderId: number) => {
    const order = orders?.find((o: Order) => o.id === orderId);
    if (!order) return;

    if (order.status === "pending") {
      // Step 1: Mark as delivered (ready)
      updateOrderMutation.mutate({ id: orderId, status: "ready" });
    } else if (order.status === "ready" && order.paymentStatus === "paid") {
      // Step 3: Mark as complete
      updateOrderMutation.mutate({ id: orderId, status: "completed" });
    } else {
      // Error case: trying to complete without payment
      toast({
        title: "Cannot complete order",
        description: "Please complete payment step before marking as complete.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentUpdate = (id: number, paymentMethod: string, paymentStatus: string) => {
    updatePaymentMutation.mutate({ id, paymentMethod, paymentStatus });
  };

  const handleCancelOrder = (orderId: number) => {
    if (confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
      cancelOrderMutation.mutate({ id: orderId, reason: "Cancelled by bar staff" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-purple-600";
      case "preparing": return "bg-blue-500";
      case "ready": return "bg-success";
      case "completed": return "bg-gray-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return "fas fa-glass-martini";
      case "preparing": return "fas fa-clock";
      case "ready": return "fas fa-check-circle";
      case "completed": return "fas fa-check";
      default: return "fas fa-question";
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const orderTime = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes === 1) return "1 minute ago";
    return `${diffInMinutes} minutes ago`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
      </div>
    );
  }

  const pendingOrders = orders?.filter((order: Order) => order.status === "pending" || order.status === "ready") || [];
  const completedOrders = orders?.filter((order: Order) => order.status === "completed") || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Bar Dashboard</h2>
            <p className="text-gray-600">Manage bar orders</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => resetOrdersMutation.mutate()}
              disabled={resetOrdersMutation.isPending}
              variant="outline" 
              size="sm"
              className="text-orange-600 border-orange-600 hover:bg-orange-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {resetOrdersMutation.isPending ? "Resetting..." : "Reset Completed"}
            </Button>
            <Button
              onClick={() => window.location.href = '/kitchen-dashboard'}
              className="bg-success text-white hover:bg-green-700"
            >
              <i className="fas fa-utensils mr-2"></i>Switch to Kitchen
            </Button>
            <div className="bg-white px-4 py-2 rounded-md border">
              <span className="text-sm text-gray-600">Last Updated: </span>
              <span className="text-sm font-medium text-gray-900">Just now</span>
            </div>
            <Badge className="bg-purple-600 text-white px-4 py-2">
              <i className="fas fa-glass-martini mr-2"></i>
              {pendingOrders.length} Active Orders
            </Badge>
          </div>
        </div>

        {/* Order Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pending Orders */}
          {pendingOrders.map((order: Order) => (
            <BarOrderCard
              key={order.id}
              order={order}
              onMarkAsDone={handleMarkAsDone}
              onPaymentUpdate={handlePaymentUpdate}
              onCancelOrder={handleCancelOrder}
              isUpdating={updateOrderMutation.isPending}
              isPaymentUpdating={updatePaymentMutation.isPending}
            />
          ))}

          {/* Completed Orders */}
          {completedOrders.slice(0, 3).map((order: Order) => (
            <BarOrderCard
              key={order.id}
              order={order}
              onMarkAsDone={handleMarkAsDone}
              onPaymentUpdate={handlePaymentUpdate}
              onCancelOrder={handleCancelOrder}
              isUpdating={updateOrderMutation.isPending}
              isPaymentUpdating={updatePaymentMutation.isPending}
            />
          ))}

          {orders?.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <i className="fas fa-glass-martini text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders</h3>
                <p className="text-gray-600">No bar orders at the moment.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface BarOrderCardProps {
  order: Order;
  onMarkAsDone: (id: number) => void;
  onPaymentUpdate: (id: number, paymentMethod: string, paymentStatus: string) => void;
  onCancelOrder?: (id: number) => void;
  isUpdating: boolean;
  isPaymentUpdating: boolean;
}

function BarOrderCard({ order, onMarkAsDone, onPaymentUpdate, onCancelOrder, isUpdating, isPaymentUpdating }: BarOrderCardProps) {
  const orderItems = JSON.parse(order.items);
  const isCompleted = order.status === "completed";

  const formatOrderTime = (date: string) => {
    const orderTime = new Date(date);
    return orderTime.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };
  const isPaymentReceived = order.paymentStatus === "paid";
  const isDelivered = order.status === "ready" || order.status === "completed";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-purple-600";
      case "preparing": return "bg-blue-500";
      case "ready": return "bg-success";
      case "completed": return "bg-gray-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return "fas fa-glass-martini";
      case "preparing": return "fas fa-clock";
      case "ready": return "fas fa-check-circle";
      case "completed": return "fas fa-check";
      default: return "fas fa-question";
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const orderTime = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes === 1) return "1 minute ago";
    return `${diffInMinutes} minutes ago`;
  };

  return (
    <Card>
      <CardHeader className={`${getStatusColor(order.status)} text-white rounded-t-lg`}>
        <CardTitle className="flex items-center text-lg">
          <i className={`${getStatusIcon(order.status)} mr-2`}></i>
          Order #{order.orderNumber || ""} - {order.tableNumber || ""}
        </CardTitle>
        <div className="flex justify-between items-center text-sm opacity-90">
          <span>Ordered: {formatOrderTime(order.createdAt!)}</span>
          <span>({formatTimeAgo(order.createdAt!.toString())})</span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-2 mb-4">
          {orderItems.map((item: any, index: number) => (
            <div key={index} className="flex justify-between items-center">
              <span>{item.quantity}x {item.name}</span>
              <span className="text-sm text-gray-600">
                {formatCurrency(parseFloat(item.price) * item.quantity)}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center border-t pt-2">
            <span className="font-semibold">Total:</span>
            <span className="font-semibold">{formatCurrency(parseFloat(order.totalAmount))}</span>
          </div>
        </div>

        {/* Order Completion Flow */}
        {isCompleted ? (
          <div className="bg-gray-100 text-gray-600 py-2 rounded-md text-center">
            <CheckCircle className="w-4 h-4 inline mr-2" />
            Order Completed
          </div>
        ) : (
          <div className="space-y-3">
            {/* Step 1: Mark as Delivered with Cancel Option */}
            {order.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  onClick={() => onMarkAsDone(order.id)}
                  disabled={isUpdating}
                  className="flex-1 bg-orange-600 text-white hover:bg-orange-700"
                >
                  {isUpdating ? (
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                  ) : (
                    <Package className="w-4 h-4 mr-2" />
                  )}
                  Step 1: Mark as Delivered
                </Button>
                <Button
                  onClick={() => onCancelOrder?.(order.id)}
                  disabled={isUpdating}
                  variant="destructive"
                  className="px-3"
                  title="Cancel Order"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Payment Method Selection - Only show after delivered */}
            {order.status === "ready" && (
              <>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <h4 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Step 2: Payment Method
                  </h4>
                  
                  {!order.paymentMethod ? (
                    <Select onValueChange={(value) => onPaymentUpdate(order.id, value, "pending")}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">💰 Cash</SelectItem>
                        <SelectItem value="upi">📱 UPI</SelectItem>
                        <SelectItem value="card">💳 Card</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-white p-2 rounded border">
                        <span className="text-sm">Payment Method:</span>
                        <span className="text-sm font-medium">
                          {order.paymentMethod === "cash" && "💰 Cash"}
                          {order.paymentMethod === "upi" && "📱 UPI"}
                          {order.paymentMethod === "card" && "💳 Card"}
                        </span>
                      </div>
                      {order.paymentStatus !== "paid" && (
                        <Button
                          onClick={() => onPaymentUpdate(order.id, order.paymentMethod!, "paid")}
                          disabled={isPaymentUpdating}
                          className="w-full bg-green-600 text-white hover:bg-green-700"
                        >
                          {isPaymentUpdating ? (
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                          ) : (
                            <DollarSign className="h-4 w-4 mr-2" />
                          )}
                          Mark Payment Received
                        </Button>
                      )}
                      {order.paymentStatus === "paid" && (
                        <div className="bg-green-100 text-green-800 p-2 rounded text-center text-sm">
                          ✓ Payment Received
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Step 3: Mark as Complete - Only show after payment received */}
            {order.status === "ready" && order.paymentStatus === "paid" && (
              <Button
                onClick={() => onMarkAsDone(order.id)}
                disabled={isUpdating}
                className="w-full bg-success text-white hover:bg-green-700"
              >
                {isUpdating ? (
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Step 3: Mark as Complete
              </Button>
            )}

            {/* Error state - trying to complete without proper flow */}
            {order.status === "ready" && (!order.paymentMethod || order.paymentStatus !== "paid") && (
              <div className="bg-yellow-100 text-yellow-800 p-3 rounded text-sm text-center">
                <CreditCard className="w-4 h-4 inline mr-2" />
                Please complete payment step before marking as complete
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
