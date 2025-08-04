import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { logout, getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";


export default function Navigation() {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Hide navigation for customer ordering pages
  if (location?.startsWith('/order/')) {
    return null;
  }

  const { data: user, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getCurrentUser,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear(); // Clear all cached data on logout
      toast({
        title: "Logged out successfully",
        description: "You have been logged out.",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="h-8 w-8 mr-3 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">QR</span>
            </div>
            <Link href="/">
              <h1 className="text-xl font-semibold text-gray-900 cursor-pointer">
                QRKhana Software
              </h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {!authLoading && !user ? (
              <Link href="/admin/login">
                <Button className="bg-primary text-white hover:bg-blue-700">
                  <i className="fas fa-sign-in-alt mr-2"></i>Admin Login
                </Button>
              </Link>
            ) : !authLoading && user ? (
              <>
                {/* Hide Dashboard button on kitchen and bar dashboards for security */}
                {!location?.includes("/kitchen-dashboard") && !location?.includes("/bar-dashboard") && (
                  <Link href="/admin/dashboard">
                    <Button variant={location === "/admin/dashboard" ? "default" : "outline"}>
                      <i className="fas fa-tachometer-alt mr-2"></i>Dashboard
                    </Button>
                  </Link>
                )}
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">Welcome, {user.username}</span>
                  <Button 
                    variant="destructive" 
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>Logout
                  </Button>
                </div>
              </>
            ) : null}
            <Link href="/kitchen-dashboard">
              <Button 
                variant={location === "/kitchen-dashboard" ? "default" : "outline"}
                className={location === "/kitchen-dashboard" ? "" : "bg-warning text-white hover:bg-orange-700"}
              >
                <i className="fas fa-kitchen-set mr-2"></i>Kitchen
              </Button>
            </Link>
            <Link href="/bar-dashboard">
              <Button 
                variant={location === "/bar-dashboard" ? "default" : "outline"}
                className={location === "/bar-dashboard" ? "" : "bg-purple-600 text-white hover:bg-purple-700"}
              >
                <i className="fas fa-glass-martini mr-2"></i>Bar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
