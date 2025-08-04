import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { apiRequest } from "@/lib/queryClient";
import type { MenuItem, MenuCategory, Table } from "@shared/schema";


interface CartItem extends MenuItem {
  quantity: number;
}

export default function CustomerOrder() {
  const { tableNumber } = useParams<{ tableNumber: string }>();
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const { data: table } = useQuery({
    queryKey: ["/api/tables", tableNumber],
    enabled: !!tableNumber,
  }) as { data: any };

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ["/api/menu-items", serviceType],
    queryFn: async () => {
      const response = await fetch(`/api/menu-items?type=${serviceType}`);
      return response.json();
    },
    enabled: !!serviceType,
  });

  // Fetch categories
  const { data: menuCategories } = useQuery({
    queryKey: ["/api/menu-categories"],
  });

  // Check if orders are paused for the selected service type
  const { data: pauseStatus, isLoading: pauseLoading } = useQuery({
    queryKey: ["/api/order-pause", serviceType],
    queryFn: async () => {
      if (!serviceType) return null;
      const response = await fetch(`/api/order-pause/${serviceType}`);
      return response.json();
    },
    enabled: !!serviceType,
    refetchInterval: 10000, // Check every 10 seconds
  });

  // Get unique categories for the current service type
  const categories = (menuCategories as any[]) ? 
    (menuCategories as any[]).filter((cat: any) => cat.type === serviceType).map((cat: any) => cat.name) 
    : [];
  
  // Filter menu items by selected category and availability
  const filteredMenuItems = (menuItems as MenuItem[]) ? 
    (menuItems as MenuItem[])
      .filter((item: MenuItem) => item.available !== false) // Only show available items
      .filter((item: MenuItem) => {
        if (selectedCategory === "all") return true;
        const category = (menuCategories as any[])?.find((cat: any) => cat.id === item.categoryId);
        return category?.name === selectedCategory;
      })
    : [];

  // Check if service is currently paused
  const isServicePaused = () => {
    if (!pauseStatus?.isPaused) return false;
    
    const pauseTime = new Date(pauseStatus.pausedAt);
    const endTime = new Date(pauseTime.getTime() + pauseStatus.pauseDurationMinutes * 60000);
    const now = new Date();
    
    return now < endTime;
  };

  const formatRemainingTime = () => {
    if (!pauseStatus?.isPaused) return "";
    
    const pauseTime = new Date(pauseStatus.pausedAt);
    const endTime = new Date(pauseTime.getTime() + pauseStatus.pauseDurationMinutes * 60000);
    const now = new Date();
    const remaining = endTime.getTime() - now.getTime();

    if (remaining <= 0) return "Service resuming soon...";

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (minutes > 0) {
      return `Service resumes in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `Service resumes in ${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
  };

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      // Check if service is paused before placing order
      if (isServicePaused()) {
        throw new Error("Orders are currently paused. Please wait for service to resume.");
      }
      
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      setCart([]);
      setShowCart(false);
      setShowSuccess(true);
      toast({
        title: "Order placed successfully!",
        description: "Your order has been sent to the kitchen.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error placing order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addToCart = (item: MenuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(cartItem =>
          cartItem.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      } else {
        return prevCart.filter(cartItem => cartItem.id !== itemId);
      }
    });
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;

    const orderData = {
      tableId: table?.id || 0,
      tableNumber: tableNumber || "",
      serviceType: serviceType || "",
      totalAmount: getTotalAmount().toString(),
      items: JSON.stringify(cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))),
      status: "pending",
    };

    placeOrderMutation.mutate(orderData);
  };

  // Security: Prevent manual navigation to admin routes by clearing any admin session data
  useEffect(() => {
    // Clear any potential admin tokens if customer accessed this route directly
    if (typeof window !== 'undefined') {
      // Remove any admin-related data from localStorage that might exist
      const keysToRemove = ['admin-token', 'admin-session', 'auth-token'];
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    }
  }, []);

  if (!tableNumber) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <i className="fas fa-exclamation-triangle text-4xl text-warning mb-4"></i>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Table</h2>
              <p className="text-gray-600">Please scan a valid QR code to access the menu.</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Footer with MEDIAGENY link */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-2">visit us</p>
          <a 
            href="https://www.mediageny.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-primary transition-colors text-base font-medium"
          >
            MEDIAGENY TECH SOLUTIONS
          </a>
        </div>
      </div>
    );
  }

  if (!serviceType) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <div className="mx-auto mb-6">
                <div className="h-40 w-40 mx-auto bg-blue-600 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-white font-bold text-2xl">QR</span>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Welcome to Osie Garden</CardTitle>
              <p className="text-lg text-gray-700 font-medium">{table?.name || `Table ${tableNumber}`}</p>
              <p className="text-gray-600 mb-4">Choose your service type</p>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <Button
                onClick={() => setServiceType("restaurant")}
                className="w-full bg-primary text-white hover:bg-blue-700 h-16 text-lg"
              >
                <i className="fas fa-utensils mr-3"></i>Restaurant Menu
              </Button>
              <Button
                onClick={() => setServiceType("bar")}
                className="w-full bg-purple-600 text-white hover:bg-purple-700 h-16 text-lg"
              >
                <i className="fas fa-glass-martini mr-3"></i>Bar Menu
              </Button>
              
              {/* Footer with MEDIAGENY link - moved inside card */}
              <div className="text-center pt-6 border-t">
                <p className="text-sm text-gray-500 mb-2">visit us</p>
                <a 
                  href="https://www.mediageny.techsolutions.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary transition-colors text-base font-medium"
                >
                  MEDIAGENY TECH SOLUTIONS
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <i className="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
        </div>
        
        {/* Footer with MEDIAGENY link */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-2">visit us</p>
          <a 
            href="https://www.mediageny.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-primary transition-colors text-base font-medium"
          >
            MEDIAGENY TECH SOLUTIONS
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 max-w-lg mx-auto px-4 py-6 w-full">
        {/* Mobile Header */}
        <div className="sticky top-0 bg-slate-50 z-10 pb-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 capitalize">
                {serviceType} Menu
              </h2>
              <p className="text-sm text-gray-600">{table?.name || `Table ${tableNumber}`}</p>
            </div>
            <Button
              onClick={() => setServiceType(null)}
              variant="outline"
              size="sm"
            >
              <i className="fas fa-arrow-left mr-2"></i>Back
            </Button>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="mb-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category: string) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <i className="fas fa-shopping-cart text-primary mr-2"></i>
                  <span className="font-medium">{getTotalItems()} items</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {formatCurrency(getTotalAmount())}
                  </span>
                </div>
                <Button
                  onClick={() => setShowCart(true)}
                  size="sm"
                  className="bg-primary text-white hover:bg-blue-700"
                >
                  View Cart
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Pause Notification Banner */}
        {isServicePaused() && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <i className="fas fa-pause-circle text-red-600 text-2xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 mb-1">
                    Orders Temporarily Paused
                  </h3>
                  <p className="text-red-700 text-sm mb-2">
                    {pauseStatus?.pauseReason || "Service is temporarily unavailable"}
                  </p>
                  <p className="text-red-600 text-sm font-medium">
                    {formatRemainingTime()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu Items - Mobile Optimized */}
        <div className="space-y-3">
          {isServicePaused() ? (
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="p-6 text-center">
                <i className="fas fa-clock text-gray-400 text-3xl mb-3"></i>
                <h3 className="text-lg font-medium text-gray-600 mb-2">Menu Temporarily Unavailable</h3>
                <p className="text-gray-500 text-sm">
                  Please wait for service to resume to view and order items.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredMenuItems?.map((item: MenuItem) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex">
                  {/* Item Image */}
                  {item.image && (
                    <div className="w-20 h-20 flex-shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Item Details */}
                  <div className="flex-1 p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 mr-3">
                        <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                        <p className="text-base font-bold text-primary mt-1">
                          {formatCurrency(parseFloat(item.price))}
                        </p>
                      </div>
                      
                      {/* Add/Quantity Controls */}
                      <div className="flex items-center space-x-1">
                        {cart.find(cartItem => cartItem.id === item.id) ? (
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-8 h-8 p-0"
                              onClick={() => removeFromCart(item.id)}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {cart.find(cartItem => cartItem.id === item.id)?.quantity || 0}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-8 h-8 p-0"
                              onClick={() => addToCart(item)}
                            >
                              +
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => addToCart(item)}
                            disabled={isServicePaused()}
                            className={`h-8 px-3 ${
                              isServicePaused()
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                : 'bg-success text-white hover:bg-green-700'
                            }`}
                          >
                            {isServicePaused() ? 'Paused' : 'Add'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )))}
        </div>

        {/* Fixed Place Order Button */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
            <div className="max-w-lg mx-auto">
              <Button
                onClick={() => setShowCart(true)}
                disabled={isServicePaused()}
                className={`w-full h-12 text-lg font-semibold ${
                  isServicePaused() 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-success text-white hover:bg-green-700'
                }`}
              >
                {isServicePaused() ? (
                  <>
                    <i className="fas fa-pause mr-2"></i>
                    Orders Paused
                  </>
                ) : (
                  <>
                    <i className="fas fa-shopping-cart mr-2"></i>
                    Place Order • {formatCurrency(getTotalAmount())}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Bottom padding to prevent content overlap with fixed button */}
        {cart.length > 0 && <div className="h-20"></div>}

        {/* Cart Dialog - Mobile Optimized */}
        <Dialog open={showCart} onOpenChange={setShowCart}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">Your Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Your cart is empty</p>
              ) : (
                <>
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-start border-b pb-3">
                      <div className="flex-1">
                        <span className="font-medium text-sm">{item.quantity}x {item.name}</span>
                        <div className="text-xs text-gray-600">
                          {formatCurrency(parseFloat(item.price))} each
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <div className="font-semibold text-sm">
                          {formatCurrency(parseFloat(item.price) * item.quantity)}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-600 hover:text-red-800 text-xs h-6 px-2"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(getTotalAmount())}
                  </span>
                </div>
                <Button
                  onClick={handlePlaceOrder}
                  disabled={placeOrderMutation.isPending || isServicePaused()}
                  className={`w-full h-12 text-lg ${
                    isServicePaused() 
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                      : 'bg-success text-white hover:bg-green-700'
                  }`}
                >
                  {isServicePaused() ? (
                    <>
                      <i className="fas fa-pause mr-2"></i>
                      Service Paused
                    </>
                  ) : placeOrderMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check mr-2"></i>
                      Confirm Order
                    </>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-center">
                <div className="w-16 h-16 bg-success rounded-full mx-auto mb-4 flex items-center justify-center">
                  <i className="fas fa-check text-white text-2xl"></i>
                </div>
                Order Placed Successfully!
              </DialogTitle>
            </DialogHeader>
            <div className="text-center">
              <p className="text-gray-600 mb-6">
                Your order has been sent to the {serviceType}. You'll be notified when it's ready.
              </p>
              <Button
                onClick={() => {
                  setShowSuccess(false);
                  setServiceType(null);
                }}
                className="w-full"
              >
                Order More
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Footer with MEDIAGENY link */}
      <div className="text-center py-4">
        <p className="text-sm text-gray-500 mb-2">visit us</p>
        <a 
          href="https://www.mediageny.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-primary transition-colors text-base font-medium"
        >
          MEDIAGENY TECH SOLUTIONS
        </a>
      </div>
    </div>
  );
}
