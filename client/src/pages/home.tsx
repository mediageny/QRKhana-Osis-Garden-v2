import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Restaurant Management System
          </h1>
          <p className="text-xl text-gray-600">
            QR Ordering system by MEDIAGENY SOFTWARE SOLUTIONS
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-primary">
                <i className="fas fa-shield-alt mr-3 text-2xl"></i>
                Admin Portal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Manage menus, tables, orders, and view analytics
              </p>
              <Link href="/admin/login">
                <Button className="w-full">
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Access Admin Panel
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-warning">
                <i className="fas fa-kitchen-set mr-3 text-2xl"></i>
                Kitchen Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                View and manage restaurant orders in real-time
              </p>
              <Link href="/admin/login?redirect=/kitchen-dashboard">
                <Button className="w-full bg-warning text-white hover:bg-orange-700">
                  <i className="fas fa-eye mr-2"></i>
                  View Kitchen Orders
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-600">
                <i className="fas fa-glass-martini mr-3 text-2xl"></i>
                Bar Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Manage bar orders and beverage preparation
              </p>
              <Link href="/admin/login?redirect=/bar-dashboard">
                <Button className="w-full bg-purple-600 text-white hover:bg-purple-700">
                  <i className="fas fa-eye mr-2"></i>
                  View Bar Orders
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-primary to-blue-600 text-white">
            <CardContent className="py-8">
              <div className="flex flex-col items-center mb-4">
                <div className="h-16 w-24 mb-4 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">MEDIAGENY</span>
                </div>
                <i className="fas fa-qrcode text-4xl"></i>
              </div>
              <h2 className="text-2xl font-bold mb-2">QR Code Ordering</h2>
              <p className="text-sm text-blue-200">
                Scan a table QR code or visit /order/[table-number] to try the customer experience
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
