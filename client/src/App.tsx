import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Navigation from "@/components/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "@/pages/home";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import MenuManagement from "@/pages/menu-management";
import TableManagement from "@/pages/table-management";
import Analytics from "@/pages/analytics";
import CustomerOrder from "@/pages/customer-order";
import KitchenDashboard from "@/pages/kitchen-dashboard";
import BarDashboard from "@/pages/bar-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard">
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/menu/:type">
        <ProtectedRoute>
          <MenuManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/kitchen-dashboard">
        <ProtectedRoute>
          <KitchenDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/bar-dashboard">
        <ProtectedRoute>
          <BarDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      </Route>
      <Route path="/order/:tableNumber" component={CustomerOrder} />
      <Route path="/admin/:type">
        <ProtectedRoute>
          <TableManagement />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-slate-50">
          <Navigation />
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
