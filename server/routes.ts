import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, insertMenuItemSchema, insertTableSchema, insertOrderSchema,
  insertMenuCategorySchema, insertOrderItemSchema
} from "@shared/schema";
import QRCode from "qrcode";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import crypto from "crypto";
import connectPg from "connect-pg-simple";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    username?: string;
  }
}

// WebSocket connections storage
let wsConnections: Set<WebSocket> = new Set();

// Broadcast function for real-time updates
function broadcastToClients(data: any) {
  const message = JSON.stringify(data);
  wsConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration with database storage
  const pgStore = connectPg(session);
  app.use(session({
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: 'sessions'
    }),
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      
      res.json({ 
        id: user.id, 
        username: user.username, 
        role: user.role 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role
    });
  });

  // Menu Categories
  app.get("/api/menu-categories", async (req, res) => {
    try {
      const type = req.query.type as string;
      const categories = await storage.getMenuCategories(type);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/menu-categories", requireAuth, async (req, res) => {
    try {
      const categoryData = insertMenuCategorySchema.parse(req.body);
      const category = await storage.createMenuCategory(categoryData);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/menu-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const category = await storage.updateMenuCategory(id, updates);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/menu-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMenuCategory(id);
      if (!deleted) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json({ message: "Category deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Menu Items
  app.get("/api/menu-items", async (req, res) => {
    try {
      const type = req.query.type as string;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const items = await storage.getMenuItems(type, categoryId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/menu-items", requireAuth, async (req, res) => {
    try {
      const itemData = insertMenuItemSchema.parse(req.body);
      const item = await storage.createMenuItem(itemData);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/menu-items/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const item = await storage.updateMenuItem(id, updates);
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/menu-items/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMenuItem(id);
      if (!deleted) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json({ message: "Menu item deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Tables and Rooms
  app.get("/api/tables", async (req, res) => {
    try {
      const type = req.query.type as string;
      const tables = await storage.getTables(type);
      res.json(tables);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tables/:number", async (req, res) => {
    try {
      const number = req.params.number;
      const table = await storage.getTableByNumber(number);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.json(table);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tables", requireAuth, async (req, res) => {
    try {
      const tableData = insertTableSchema.parse(req.body);
      const table = await storage.createTable(tableData);
      res.status(201).json(table);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/tables/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const table = await storage.updateTable(id, updates);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.json(table);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/tables/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTable(id);
      if (!deleted) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.json({ message: "Table deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // QR Code generation
  app.get("/api/tables/:id/qr", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const table = await storage.getTable(id);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      // Use environment variable for domain or fallback to localhost
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const protocol = domain.includes('localhost') ? 'http' : 'https';
      const qrUrl = `${protocol}://${domain}/order/${table.number}`;
      
      const qrCode = await QRCode.toDataURL(qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.json({ qrCode, url: qrUrl });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const status = req.query.status as string;
      const serviceType = req.query.serviceType as string;
      const orders = await storage.getOrders(status, serviceType);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      
      // Create order items
      const items = JSON.parse(orderData.items);
      for (const item of items) {
        await storage.createOrderItem({
          orderId: order.id,
          menuItemId: item.id,
          quantity: item.quantity,
          price: item.price.toString(),
          itemName: item.name
        });
      }

      // Broadcast new order to all connected clients
      broadcastToClients({
        type: "new_order",
        order: order,
        serviceType: order.serviceType
      });

      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const order = await storage.updateOrder(id, updates);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Broadcast order status update to all connected clients
      broadcastToClients({
        type: "order_updated",
        orderId: id,
        status: updates.status,
        order: order
      });

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/orders/:id/items", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const items = await storage.getOrderItems(id);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payment update endpoint
  app.put("/api/orders/:id/payment", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { paymentMethod, paymentStatus } = req.body;
      const order = await storage.updateOrder(id, { paymentMethod, paymentStatus });
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Broadcast payment update to all connected clients
      broadcastToClients({
        type: "payment_updated",
        orderId: id,
        paymentMethod,
        paymentStatus,
        order: order
      });

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Analytics
  app.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const period = req.query.period as string || 'today';
      const serviceType = req.query.serviceType as string;
      
      // Get IST timezone dates
      const istNow = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)); // Add 5.5 hours for IST
      
      let startDate: Date;
      let endDate = new Date(istNow);
      endDate.setHours(23, 59, 59, 999);

      switch (period) {
        case 'today':
          startDate = new Date(istNow);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(istNow);
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate = new Date(istNow);
          startDate.setMonth(startDate.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        default:
          startDate = new Date(istNow);
          startDate.setHours(0, 0, 0, 0);
      }
      
      // Convert to UTC for database comparison
      const startDateUTC = new Date(startDate.getTime() - (5.5 * 60 * 60 * 1000));
      const endDateUTC = new Date(endDate.getTime() - (5.5 * 60 * 60 * 1000));

      const analytics = await storage.getSalesAnalytics(startDateUTC, endDateUTC, serviceType);
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payment Analytics
  app.get("/api/analytics/payments", requireAuth, async (req, res) => {
    try {
      const { period = "today" } = req.query;
      
      // Get IST timezone dates
      const istNow = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)); // Add 5.5 hours for IST
      
      let startDate: Date;
      const endDate = new Date(istNow);
      endDate.setHours(23, 59, 59, 999);
      
      switch (period) {
        case "today":
          startDate = new Date(istNow);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate = new Date(istNow);
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "month":
          startDate = new Date(istNow);
          startDate.setMonth(startDate.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        default:
          startDate = new Date(istNow);
          startDate.setHours(0, 0, 0, 0);
      }
      
      // Convert to UTC for database comparison
      const startDateUTC = new Date(startDate.getTime() - (5.5 * 60 * 60 * 1000));
      const endDateUTC = new Date(endDate.getTime() - (5.5 * 60 * 60 * 1000));
      
      const paymentAnalytics = await storage.getPaymentAnalytics(startDateUTC, endDateUTC);
      res.json(paymentAnalytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reset completed orders
  app.post("/api/orders/reset", requireAuth, async (req, res) => {
    try {
      await storage.resetCompletedOrders();
      
      // Broadcast reset to all connected clients
      broadcastToClients({
        type: "orders_reset",
        message: "Completed orders have been reset"
      });

      res.json({ message: "Completed orders reset successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      // Get IST timezone dates
      const istNow = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)); // Add 5.5 hours for IST
      const today = new Date(istNow);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Convert back to UTC for database comparison
      const todayUTC = new Date(today.getTime() - (5.5 * 60 * 60 * 1000));
      const tomorrowUTC = new Date(tomorrow.getTime() - (5.5 * 60 * 60 * 1000));

      const [
        todayOrders,
        activeOrders,
        tables,
        menuItems,
        todayAnalytics
      ] = await Promise.all([
        storage.getOrders(undefined, undefined),
        storage.getOrders('pending', undefined),
        storage.getTables('table'),
        storage.getMenuItems(),
        storage.getSalesAnalytics(todayUTC, tomorrowUTC)
      ]);

      const todayOrdersFiltered = todayOrders.filter(order => 
        new Date(order.createdAt!) >= todayUTC
      );

      const activeTables = tables.filter(table => table.status === 'occupied').length;

      res.json({
        todaySales: todayAnalytics.totalSales,
        activeOrders: activeOrders.length,
        activeTables: `${activeTables}/${tables.length}`,
        menuItems: menuItems.length
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add payment status route
  app.put("/api/orders/:id/payment", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { paymentMethod, paymentStatus } = req.body;
      
      const order = await storage.updateOrder(id, { 
        paymentMethod, 
        paymentStatus,
        ...(paymentStatus === "completed" && { completedAt: new Date() })
      });
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Broadcast payment update to all connected clients
      broadcastToClients({
        type: "payment_updated",
        orderId: id,
        paymentMethod,
        paymentStatus
      });

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Cancel order
  app.put("/api/orders/:id/cancel", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      
      const order = await storage.cancelOrder(id, reason || "Cancelled by customer request");
      
      if (!order) {
        return res.status(404).json({ message: "Order not found or cannot be cancelled" });
      }

      // Broadcast order cancellation to all connected clients
      broadcastToClients({
        type: "order_cancelled",
        orderId: id,
        order: order
      });

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Order pause settings
  app.get("/api/order-pause/:serviceType", async (req, res) => {
    try {
      const serviceType = req.params.serviceType;
      const pauseStatus = await storage.checkIfOrdersPaused(serviceType);
      res.json(pauseStatus);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/order-pause", requireAuth, async (req, res) => {
    try {
      const { serviceType, isPaused, pauseDurationMinutes, pauseReason } = req.body;
      
      const settings = await storage.createOrUpdateOrderPauseSettings({
        serviceType,
        isPaused,
        pauseDurationMinutes: pauseDurationMinutes || 30,
        pauseReason: pauseReason || "Rush hours",
        ...(isPaused && { pausedAt: new Date() })
      });

      // Broadcast pause status update to all connected clients
      broadcastToClients({
        type: "orders_pause_updated",
        serviceType,
        isPaused,
        pauseDurationMinutes,
        pauseReason
      });

      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    wsConnections.add(ws);
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      wsConnections.delete(ws);
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsConnections.delete(ws);
    });
  });

  return httpServer;
}
