import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";
import { getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Analytics() {
  const [period, setPeriod] = useState("today");
  const [serviceType, setServiceType] = useState("all");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
        description: "Please log in to access analytics.",
        variant: "destructive",
      });
      setLocation("/admin/login");
    }
  }, [user, authLoading, setLocation, toast]);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/analytics", period, serviceType],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (serviceType !== "all") {
        params.append("serviceType", serviceType);
      }
      const response = await fetch(`/api/analytics?${params}`);
      return response.json();
    },
  });

  const { data: restaurantAnalytics } = useQuery({
    queryKey: ["/api/analytics", period, "restaurant"],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?period=${period}&serviceType=restaurant`);
      return response.json();
    },
  });

  const { data: barAnalytics } = useQuery({
    queryKey: ["/api/analytics", period, "bar"],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?period=${period}&serviceType=bar`);
      return response.json();
    },
  });

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  if (authLoading || isLoading) {
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
            <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
            <p className="text-gray-600">Sales and performance metrics</p>
          </div>
          <div className="flex space-x-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
              </SelectContent>
            </Select>
            <Link href="/admin/dashboard">
              <Button variant="outline">
                <i className="fas fa-arrow-left mr-2"></i>Back
              </Button>
            </Link>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {serviceType === "all" ? "Total Sales" : 
                     serviceType === "restaurant" ? "Restaurant Sales" : "Bar Sales"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analytics?.totalSales || 0)}
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <i className="fas fa-rupee-sign text-primary text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics?.orderCount || 0}
                  </p>
                </div>
                <div className="bg-success/10 p-3 rounded-full">
                  <i className="fas fa-shopping-cart text-success text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Order</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analytics?.averageOrder || 0)}
                  </p>
                </div>
                <div className="bg-warning/10 p-3 rounded-full">
                  <i className="fas fa-chart-line text-warning text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Restaurant Sales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(restaurantAnalytics?.totalSales || 0)}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <i className="fas fa-utensils text-purple-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Service Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-primary rounded"></div>
                    <span>Restaurant</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(restaurantAnalytics?.totalSales || 0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {restaurantAnalytics?.orderCount || 0} orders
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-purple-600 rounded"></div>
                    <span>Bar</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(barAnalytics?.totalSales || 0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {barAnalytics?.orderCount || 0} orders
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.topItems?.slice(0, 5).map((item: any, index: number) => (
                  <div key={item.itemName} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <span>{item.itemName}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{item.quantity} sold</div>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(item.revenue)}
                      </div>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
