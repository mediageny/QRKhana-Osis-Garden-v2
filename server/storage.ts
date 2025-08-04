import {
  users,
  menuCategories,
  menuItems,
  tables,
  orders,
  orderItems,
  orderPauseSettings,
  type User,
  type InsertUser,
  type MenuItem,
  type InsertMenuItem,
  type MenuCategory,
  type InsertMenuCategory,
  type Table,
  type InsertTable,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type OrderPauseSettings,
  type InsertOrderPauseSettings,
} from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Menu categories
  getMenuCategories(type?: string): Promise<MenuCategory[]>;
  createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  updateMenuCategory(
    id: number,
    category: Partial<MenuCategory>,
  ): Promise<MenuCategory | undefined>;
  deleteMenuCategory(id: number): Promise<boolean>;

  // Menu items
  getMenuItems(type?: string, categoryId?: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(
    id: number,
    item: Partial<MenuItem>,
  ): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;

  // Tables
  getTables(type?: string): Promise<Table[]>;
  getTable(id: number): Promise<Table | undefined>;
  getTableByNumber(number: string): Promise<Table | undefined>;
  createTable(table: InsertTable): Promise<Table>;
  updateTable(id: number, table: Partial<Table>): Promise<Table | undefined>;
  deleteTable(id: number): Promise<boolean>;

  // Orders
  getOrders(status?: string, serviceType?: string): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<Order>): Promise<Order | undefined>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;

  // Analytics
  getSalesAnalytics(
    startDate: Date,
    endDate: Date,
    serviceType?: string,
  ): Promise<{
    totalSales: number;
    orderCount: number;
    averageOrder: number;
    topItems: Array<{ itemName: string; quantity: number; revenue: number }>;
  }>;

  // Payment Analytics
  getPaymentAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    cash: number;
    upi: number;
    card: number;
    total: number;
  }>;

  // Order Reset
  resetCompletedOrders(): Promise<void>;

  // Order Cancel
  cancelOrder(id: number, reason: string): Promise<Order | undefined>;

  // Order Pause Settings
  getOrderPauseSettings(serviceType: string): Promise<OrderPauseSettings | undefined>;
  createOrUpdateOrderPauseSettings(settings: InsertOrderPauseSettings): Promise<OrderPauseSettings>;
  checkIfOrdersPaused(serviceType: string): Promise<{
    isPaused: boolean;
    pausedAt?: Date;
    pauseDurationMinutes?: number;
    pauseReason?: string;
    remainingTimeMinutes?: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private menuCategories: Map<number, MenuCategory> = new Map();
  private menuItems: Map<number, MenuItem> = new Map();
  private tables: Map<number, Table> = new Map();
  private orders: Map<number, Order> = new Map();
  private orderItems: Map<number, OrderItem> = new Map();
  private orderPauseSettings: Map<number, OrderPauseSettings> = new Map();

  private currentUserId = 1;
  private currentCategoryId = 1;
  private currentMenuItemId = 1;
  private currentTableId = 1;
  private currentOrderId = 1;
  private currentOrderItemId = 1;
  private currentPauseSettingsId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create admin user
    const adminUser: User = {
      id: this.currentUserId++,
      username: "admin@osis#lkb",
      password: "osis#admin@gomar", // In production, this should be hashed
      role: "admin",
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Create restaurant menu categories
    const restaurantCategories = [
      { name: "VEG STARTER", type: "restaurant" },
      { name: "NON VEG STARTER", type: "restaurant" },
      { name: "CHINESE MAIN COURSE", type: "restaurant" },
      { name: "NON VEG INDIAN MAIN COURSE", type: "restaurant" },
      { name: "VEG INDIAN MAIN COURSE", type: "restaurant" },
      { name: "SALAD", type: "restaurant" },
      { name: "RICE", type: "restaurant" },
      { name: "BEVERAGE", type: "restaurant" }
    ];

    restaurantCategories.forEach(catData => {
      const category: MenuCategory = {
        id: this.currentCategoryId++,
        name: catData.name,
        type: catData.type,
      };
      this.menuCategories.set(category.id, category);
    });

    // Create bar menu categories
    const barCategories = [
      { name: "BEER", type: "bar" },
      { name: "WHISKEY", type: "bar" },
      { name: "WINE", type: "bar" },
      { name: "RUM AND VODKA", type: "bar" },
      { name: "GIN", type: "bar" },
      { name: "SHOTS", type: "bar" },
      { name: "COCKTAILS", type: "bar" },
      { name: "MOCKTAILS", type: "bar" }
    ];

    barCategories.forEach(catData => {
      const category: MenuCategory = {
        id: this.currentCategoryId++,
        name: catData.name,
        type: catData.type,
      };
      this.menuCategories.set(category.id, category);
    });

    // Get category IDs for menu item creation
    const getCategoryByName = (name: string) => {
      return Array.from(this.menuCategories.values()).find(cat => cat.name === name);
    };

    // Add WHISKEY items
    const whiskeyCategory = getCategoryByName("WHISKEY");
    if (whiskeyCategory) {
      const whiskeyItems = [
        { name: "BLINDER'S PRIDE", price: "150.00", description: "Premium Indian whiskey with smooth finish" },
        { name: "BLACK AND WHITE", price: "250.00", description: "Classic Scotch whiskey blend" },
        { name: "DEWAR'S", price: "250.00", description: "Finest Scotch whiskey, double aged" },
        { name: "VAT 69", price: "300.00", description: "Premium blended Scotch whiskey" },
        { name: "TEACHER'S", price: "300.00", description: "Highland cream Scotch whiskey" },
        { name: "JUSTERINI & BROOKS", price: "300.00", description: "Rare old Scotch whiskey blend" },
        { name: "JIM BEAM", price: "350.00", description: "Kentucky straight bourbon whiskey" },
        { name: "100 PIPERS 12 YEARS", price: "350.00", description: "Aged 12 years premium Scotch" },
        { name: "RED LABEL", price: "350.00", description: "Johnnie Walker Red Label Scotch" },
        { name: "JAMESON", price: "400.00", description: "Irish whiskey, triple distilled" },
        { name: "JACK DANIELS", price: "550.00", description: "Tennessee whiskey, charcoal mellowed" },
        { name: "BLACK LABEL", price: "550.00", description: "Johnnie Walker Black Label 12 years" },
        { name: "INDRI", price: "550.00", description: "Single malt Indian whiskey" },
        { name: "CHIVAS REGAL", price: "600.00", description: "Premium blended Scotch whiskey" },
        { name: "GLENFIDDICH 12 YEARS", price: "750.00", description: "Single malt Scotch whiskey, aged 12 years" }
      ];

      whiskeyItems.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "bar",
          categoryId: whiskeyCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add RUM AND VODKA items
    const rumVodkaCategory = getCategoryByName("RUM AND VODKA");
    if (rumVodkaCategory) {
      const rumVodkaItems = [
        { name: "SMIRNOFF VODKA", price: "150.00", description: "Premium triple distilled vodka" },
        { name: "BACARDI LEMON", price: "150.00", description: "White rum with natural lemon flavor" },
        { name: "WHITE RUM", price: "150.00", description: "Light Caribbean white rum" },
        { name: "OLD MONK", price: "200.00", description: "Dark Indian rum, aged in oak" },
        { name: "OLD MONK RESERVE", price: "200.00", description: "Premium aged Indian dark rum" },
        { name: "ABSOLUTE VODKA", price: "300.00", description: "Swedish premium vodka, pure and smooth" }
      ];

      rumVodkaItems.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "bar",
          categoryId: rumVodkaCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add GIN items
    const ginCategory = getCategoryByName("GIN");
    if (ginCategory) {
      const ginItems = [
        { name: "BOMBAY SAPPHIRE", price: "350.00", description: "Premium London dry gin with botanicals" },
        { name: "LONDON DRY", price: "350.00", description: "Classic London dry gin" }
      ];

      ginItems.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "bar",
          categoryId: ginCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add BEER items
    const beerCategory = getCategoryByName("BEER");
    if (beerCategory) {
      const beerItems = [
        { name: "TUBORG", price: "120.00", description: "Danish premium lager beer" },
        { name: "KINGFISHER STRONG", price: "120.00", description: "Strong Indian lager beer" },
        { name: "BREEZER", price: "150.00", description: "Flavored alcoholic beverage" },
        { name: "BUDWEISER PREMIUM", price: "200.00", description: "American premium lager beer" },
        { name: "BUDWEISER MAGNUM", price: "200.00", description: "Strong premium lager beer" },
        { name: "CORONA", price: "200.00", description: "Mexican light beer with lime" }
      ];

      beerItems.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "bar",
          categoryId: beerCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add WINE items
    const wineCategory = getCategoryByName("WINE");
    if (wineCategory) {
      const wineItems = [
        { name: "BROCODE", price: "200.00", description: "Light and refreshing wine" },
        { name: "ZUMZIN", price: "500.00", description: "Premium Indian red wine" },
        { name: "DIA", price: "1000.00", description: "Fine quality wine selection" },
        { name: "LINDEMAN", price: "2500.00", description: "Australian premium wine" },
        { name: "CARLO ROSSI", price: "2500.00", description: "California red wine blend" },
        { name: "JACOB'S CREEK", price: "2500.00", description: "Australian premium wine collection" }
      ];

      wineItems.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "bar",
          categoryId: wineCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add COCKTAILS items
    const cocktailsCategory = getCategoryByName("COCKTAILS");
    if (cocktailsCategory) {
      const cocktailsItems = [
        { name: "BLUE MARGARITA", price: "400.00", description: "Tequila, Triple Sec, Lime Juice, Blue Curacao" },
        { name: "MARGARITA", price: "350.00", description: "Tequila, Triple Sec, Lime Juice" },
        { name: "COSMOPOLITAN", price: "350.00", description: "Vodka, Triple Sec, Lime Juice, Cranberry Juice" },
        { name: "PINK LADY", price: "450.00", description: "Gin, Triple Sec, Lime Juice, Egg Albumen, Grenadine" },
        { name: "WHISKEY SOUR", price: "450.00", description: "Bourbon Whiskey, Triple Sec, Lime Juice, Egg Albumen" },
        { name: "MOJITO", price: "350.00", description: "Mint Leaf, Lime Juice, Bacardi, Black Salt, Sugar Syrup" },
        { name: "SCREWDRIVER", price: "350.00", description: "Vodka, Orange Juice" },
        { name: "L.I.I.T", price: "450.00", description: "Vodka, Gin, White Rum, Tequila, Lime Juice, Triple Sec, Coke" },
        { name: "TEQUILA SUNRISE", price: "400.00", description: "Tequila, Orange Juice, Grenadine" },
        { name: "PAINKILLER", price: "400.00", description: "Old Monk, Coconut Cream, Pineapple Juice, Orange Juice" },
        { name: "RED SANGRIA", price: "800.00", description: "Apple, Orange, Pineapple, Watermelon, Orange Juice, Triple Sec, Lindeman" },
        { name: "MINT JULEP", price: "400.00", description: "Mint leaf, Sugar, Simple Syrup, Bourbon Whiskey" },
        { name: "OSIE MELLOW", price: "400.00", description: "House special cocktail blend" }
      ];

      cocktailsItems.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "bar",
          categoryId: cocktailsCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add SHOTS items
    const shotsCategory = getCategoryByName("SHOTS");
    if (shotsCategory) {
      const shotsItems = [
        { name: "TEQUILA SHOTS", price: "250.00", description: "Pure tequila shot with lime and salt" },
        { name: "VODKA SHOTS", price: "250.00", description: "Premium vodka shot served chilled" },
        { name: "FIRE SHOTS", price: "300.00", description: "Spicy flaming shot experience" },
        { name: "KAMIKAZE SHOTS", price: "300.00", description: "Vodka, Triple Sec, Lime Juice shot" }
      ];

      shotsItems.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "bar",
          categoryId: shotsCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add MOCKTAILS items
    const mocktailsCategory = getCategoryByName("MOCKTAILS");
    if (mocktailsCategory) {
      const mocktailsItems = [
        { name: "BLUE LAGOON", price: "200.00", description: "Blue Curacao, Lime Juice, Triple Sec, Sprite/Soda" },
        { name: "MINT BLUE LAGOON", price: "200.00", description: "Mint leaf, Blue Curacao, Lime Juice, Triple Sec, Sprite" },
        { name: "SCREWDRIVER", price: "200.00", description: "Orange Juice, Orange Crush, Lime Juice, Sprite" },
        { name: "VIRGIN MOJITO", price: "200.00", description: "Mint Leaf, Lime Juice, Sugar, Black Salt, Sprite" },
        { name: "VIRGIN MOJITO ORANGE", price: "200.00", description: "Mint Leaf, Lime Juice, Sugar, Black Salt, Sprite, Orange Juice" },
        { name: "FRUIT PUNCH", price: "300.00", description: "Mango, Apple, Pineapple, Orange Juice, Fresh Cream, Kiwi Crush" },
        { name: "PINA COLADA", price: "300.00", description: "Pina Colada syrup, Pineapple Juice, Fresh Cream, Coconut Cream" }
      ];

      mocktailsItems.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "bar",
          categoryId: mocktailsCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add VEG STARTER items
    const vegStarterCategory = getCategoryByName("VEG STARTER");
    if (vegStarterCategory) {
      const vegStarters = [
        { name: "PANEER CHILLI DRY", price: "350.00", description: "Crispy paneer tossed in spicy chilli sauce" },
        { name: "PANEER PAKORA", price: "300.00", description: "Golden fried paneer fritters with spices" },
        { name: "CRISPY CHILLI BABY CORN", price: "300.00", description: "Crunchy baby corn in spicy chilli coating" },
        { name: "HONEY CHILLI BABY CORN", price: "350.00", description: "Sweet and spicy honey glazed baby corn" },
        { name: "KAJU FRY", price: "300.00", description: "Roasted cashews with aromatic spices" },
        { name: "FRENCH FRIES", price: "160.00", description: "Crispy golden potato fries" },
        { name: "PEANUT MASALA", price: "150.00", description: "Spiced roasted peanuts with herbs" },
        { name: "CHILLI POTATO", price: "200.00", description: "Crispy potato cubes in tangy chilli sauce" },
        { name: "HONEY CHILLI POTATO", price: "220.00", description: "Sweet and spicy honey glazed potato" },
        { name: "PAPAD FRY", price: "20.00", description: "Deep fried crispy papad" },
        { name: "PAPAD ROASTED", price: "20.00", description: "Flame roasted traditional papad" }
      ];

      vegStarters.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "restaurant",
          categoryId: vegStarterCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add NON VEG STARTER items
    const nonVegStarterCategory = getCategoryByName("NON VEG STARTER");
    if (nonVegStarterCategory) {
      const nonVegStarters = [
        { name: "CHICKEN CHILLI", price: "350.00", description: "Spicy chicken pieces in Indo-Chinese chilli sauce" },
        { name: "CHICKEN DRY FRY", price: "320.00", description: "Dry roasted chicken with aromatic spices" },
        { name: "CHICKEN LOLLIPOP", price: "350.00", description: "Drumstick chicken shaped as lollipops" },
        { name: "DRUMS OF HEAVEN", price: "380.00", description: "Spicy chicken drumsticks with heavenly taste" },
        { name: "GARLIC CHICKEN", price: "320.00", description: "Tender chicken cooked with garlic and herbs" },
        { name: "PRAWN CHILLI", price: "480.00", description: "Fresh prawns in spicy chilli garlic sauce" },
        { name: "PRAWN DRY FRY", price: "450.00", description: "Dry roasted prawns with coastal spices" }
      ];

      nonVegStarters.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "restaurant",
          categoryId: nonVegStarterCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add CHINESE MAIN COURSE items
    const chineseMainCategory = getCategoryByName("CHINESE MAIN COURSE");
    if (chineseMainCategory) {
      const chineseMain = [
        { name: "CHICKEN FRIED RICE", price: "220.00", description: "Wok-tossed rice with tender chicken pieces" },
        { name: "EGG FRIED RICE", price: "180.00", description: "Aromatic fried rice with scrambled eggs" },
        { name: "MIXED FRIED RICE", price: "250.00", description: "Rice with chicken, egg and vegetables" },
        { name: "VEG FRIED RICE", price: "160.00", description: "Stir-fried rice with fresh vegetables" },
        { name: "VEG FRIED NOODLES", price: "180.00", description: "Hakka noodles with mixed vegetables" },
        { name: "EGG FRIED NOODLES", price: "200.00", description: "Noodles tossed with scrambled eggs" },
        { name: "MIXED FRIED NOODLES", price: "250.00", description: "Noodles with chicken, egg and vegetables" }
      ];

      chineseMain.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "restaurant",
          categoryId: chineseMainCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add RICE items
    const riceCategory = getCategoryByName("RICE");
    if (riceCategory) {
      const riceItems = [
        { name: "PLAIN RICE", price: "100.00", description: "Steamed basmati rice" },
        { name: "ZEERA RICE", price: "120.00", description: "Fragrant cumin flavored rice" },
        { name: "CHICKEN BIRYANI", price: "350.00", description: "Aromatic basmati rice layered with spiced chicken" },
        { name: "GHEE RICE", price: "150.00", description: "Rich basmati rice cooked in pure ghee" }
      ];

      riceItems.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "restaurant",
          categoryId: riceCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add VEG INDIAN MAIN COURSE items
    const vegMainCategory = getCategoryByName("VEG INDIAN MAIN COURSE");
    if (vegMainCategory) {
      const vegMainItems = [
        { name: "PANEER BUTTER MASALA", price: "400.00", description: "Cottage cheese in rich tomato butter gravy" },
        { name: "KADAI PANEER", price: "350.00", description: "Paneer cooked with bell peppers in kadai" },
        { name: "MATTAR PANEER", price: "250.00", description: "Paneer and green peas in spiced curry" },
        { name: "MIXED VEGETABLES", price: "200.00", description: "Assorted seasonal vegetables in curry" },
        { name: "DAL FRY", price: "120.00", description: "Tempered yellow lentils with spices" },
        { name: "DAL BUTTER FRY", price: "150.00", description: "Rich creamy dal with butter and spices" },
        { name: "KABULI CHANA", price: "220.00", description: "Spiced chickpeas in thick gravy" }
      ];

      vegMainItems.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "restaurant",
          categoryId: vegMainCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add NON VEG INDIAN MAIN COURSE items
    const nonVegMainCategory = getCategoryByName("NON VEG INDIAN MAIN COURSE");
    if (nonVegMainCategory) {
      const nonVegMainItems = [
        { name: "CHICKEN BUTTER MASALA", price: "450.00", description: "Tender chicken in rich tomato butter gravy" },
        { name: "KADAI CHICKEN", price: "450.00", description: "Chicken cooked with bell peppers in kadai" },
        { name: "CHICKEN CURRY", price: "350.00", description: "Traditional chicken curry with aromatic spices" },
        { name: "CHICKEN MASALA", price: "350.00", description: "Spiced chicken in thick onion tomato gravy" },
        { name: "CHICKEN KOSHA", price: "380.00", description: "Bengali style slow-cooked chicken curry" }
      ];

      nonVegMainItems.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "restaurant",
          categoryId: nonVegMainCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add SALAD items
    const saladCategory = getCategoryByName("SALAD");
    if (saladCategory) {
      const saladItems = [
        { name: "ONION SALAD", price: "60.00", description: "Fresh sliced onions with lemon and spices" },
        { name: "GREEN SALAD", price: "60.00", description: "Mixed fresh greens and vegetables" },
        { name: "CUCUMBER SALAD", price: "80.00", description: "Crisp cucumber slices with seasoning" },
        { name: "FRUIT SALAD", price: "250.00", description: "Seasonal fresh fruits with cream" }
      ];

      saladItems.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "restaurant",
          categoryId: saladCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Add BEVERAGE items
    const beverageCategory = getCategoryByName("BEVERAGE");
    if (beverageCategory) {
      const beverages = [
        { name: "MILK TEA", price: "30.00", description: "Traditional Indian tea with milk" },
        { name: "BLACK TEA", price: "20.00", description: "Pure black tea without milk" },
        { name: "LEMON TEA", price: "30.00", description: "Refreshing tea with fresh lemon" },
        { name: "RED BULL", price: "200.00", description: "Energy drink for instant boost" },
        { name: "MONSTER", price: "200.00", description: "Premium energy drink" },
        { name: "CAPPUCCINO", price: "60.00", description: "Italian coffee with steamed milk foam" },
        { name: "ESPRESSO", price: "50.00", description: "Strong Italian coffee shot" },
        { name: "DOUBLE ESPRESSO", price: "80.00", description: "Double shot of espresso for coffee lovers" }
      ];

      beverages.forEach(item => {
        const menuItem: MenuItem = {
          id: this.currentMenuItemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          type: "restaurant",
          categoryId: beverageCategory.id,
          image: null,
          available: true,
          createdAt: new Date(),
        };
        this.menuItems.set(menuItem.id, menuItem);
      });
    }

    // Create tables based on production configuration
    const tables = [
      { number: "1", name: "Table No. 1" },
      { number: "2", name: "Table No. 2" },
      { number: "3", name: "Table No. 3" },
      { number: "4", name: "Table No. 4" },
      { number: "5", name: "Table No. 5" },
      { number: "6", name: "Table No. 6" },
      { number: "7", name: "Lower Table 1" },
      { number: "8", name: "Lower Table 2" },
      { number: "9", name: "Lower Table 3" },
      { number: "10", name: "Lower Table 4" },
      { number: "11", name: "Upper Table 1" },
      { number: "12", name: "Upper Table 2" },
      { number: "13", name: "Upper Table 3" },
      { number: "14", name: "Upper Table 4" }
    ];

    tables.forEach(tableData => {
      const table: Table = {
        id: this.currentTableId++,
        number: tableData.number,
        name: tableData.name,
        type: "table",
        qrCode: `table-${tableData.number}-qr`,
        status: "available",
        createdAt: new Date(),
      };
      this.tables.set(table.id, table);
    });

    // Create rooms based on production configuration
    const rooms = [
      { number: "LIKA", name: "LIKA COTTAGE" },
      { number: "BALI", name: "BALI COTTAGE" }
    ];

    rooms.forEach(roomData => {
      const room: Table = {
        id: this.currentTableId++,
        number: roomData.number,
        name: roomData.name,
        type: "room",
        qrCode: `room-${roomData.number.toLowerCase()}-qr`,
        status: "available",
        createdAt: new Date(),
      };
      this.tables.set(room.id, room);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      role: insertUser.role || "admin",
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async getMenuCategories(type?: string): Promise<MenuCategory[]> {
    const categories = Array.from(this.menuCategories.values());
    return type ? categories.filter((cat) => cat.type === type) : categories;
  }

  async createMenuCategory(
    insertCategory: InsertMenuCategory,
  ): Promise<MenuCategory> {
    const category: MenuCategory = {
      ...insertCategory,
      id: this.currentCategoryId++,
    };
    this.menuCategories.set(category.id, category);
    return category;
  }

  async updateMenuCategory(
    id: number,
    updates: Partial<MenuCategory>,
  ): Promise<MenuCategory | undefined> {
    const category = this.menuCategories.get(id);
    if (!category) return undefined;

    const updated = { ...category, ...updates };
    this.menuCategories.set(id, updated);
    return updated;
  }

  async deleteMenuCategory(id: number): Promise<boolean> {
    return this.menuCategories.delete(id);
  }

  async getMenuItems(type?: string, categoryId?: number): Promise<MenuItem[]> {
    let items = Array.from(this.menuItems.values());
    if (type) items = items.filter((item) => item.type === type);
    if (categoryId)
      items = items.filter((item) => item.categoryId === categoryId);
    return items;
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async createMenuItem(insertItem: InsertMenuItem): Promise<MenuItem> {
    const item: MenuItem = {
      ...insertItem,
      id: this.currentMenuItemId++,
      image: insertItem.image || null,
      categoryId: insertItem.categoryId || null,
      available: insertItem.available ?? true,
      createdAt: new Date(),
    };
    this.menuItems.set(item.id, item);
    return item;
  }

  async updateMenuItem(
    id: number,
    updates: Partial<MenuItem>,
  ): Promise<MenuItem | undefined> {
    const item = this.menuItems.get(id);
    if (!item) return undefined;

    const updated = { ...item, ...updates };
    this.menuItems.set(id, updated);
    return updated;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    return this.menuItems.delete(id);
  }

  async getTables(type?: string): Promise<Table[]> {
    const tables = Array.from(this.tables.values());
    return type ? tables.filter((table) => table.type === type) : tables;
  }

  async getTable(id: number): Promise<Table | undefined> {
    return this.tables.get(id);
  }

  async getTableByNumber(number: string): Promise<Table | undefined> {
    return Array.from(this.tables.values()).find(
      (table) => table.number === number,
    );
  }

  async createTable(insertTable: InsertTable): Promise<Table> {
    const table: Table = {
      ...insertTable,
      id: this.currentTableId++,
      status: insertTable.status || "available",
      qrCode: `${insertTable.type}-${insertTable.number}-qr`,
      createdAt: new Date(),
    };
    this.tables.set(table.id, table);
    return table;
  }

  async updateTable(
    id: number,
    updates: Partial<Table>,
  ): Promise<Table | undefined> {
    const table = this.tables.get(id);
    if (!table) return undefined;

    const updated = { ...table, ...updates };
    this.tables.set(id, updated);
    return updated;
  }

  async deleteTable(id: number): Promise<boolean> {
    return this.tables.delete(id);
  }

  async getOrders(status?: string, serviceType?: string): Promise<Order[]> {
    let orders = Array.from(this.orders.values());
    if (status) orders = orders.filter((order) => order.status === status);
    if (serviceType)
      orders = orders.filter((order) => order.serviceType === serviceType);
    return orders.sort(
      (a, b) =>
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
    );
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(
      (order) => order.orderNumber === orderNumber,
    );
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const orderNumber = `${insertOrder.serviceType.toUpperCase()}${Date.now()}`;
    const order: Order = {
      ...insertOrder,
      id: this.currentOrderId++,
      orderNumber,
      tableId: insertOrder.tableId || null,
      status: insertOrder.status || "pending",
      paymentMethod: insertOrder.paymentMethod || null,
      paymentStatus: insertOrder.paymentStatus || "pending",
      createdAt: new Date(),
      completedAt: null,
    };
    this.orders.set(order.id, order);
    return order;
  }

  async updateOrder(
    id: number,
    updates: Partial<Order>,
  ): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updated = { ...order, ...updates };
    if (updates.status === "completed" && !updated.completedAt) {
      updated.completedAt = new Date();
    }
    this.orders.set(id, updated);
    return updated;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(
      (item) => item.orderId === orderId,
    );
  }

  async createOrderItem(insertItem: InsertOrderItem): Promise<OrderItem> {
    const item: OrderItem = {
      ...insertItem,
      id: this.currentOrderItemId++,
      orderId: insertItem.orderId || 0,
      menuItemId: insertItem.menuItemId || 0,
    };
    this.orderItems.set(item.id, item);
    return item;
  }

  // Clean up orders older than 30 days for monthly data retention
  private cleanupOldData() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const [orderId, order] of Array.from(this.orders)) {
      const orderDate = new Date(order.createdAt!);
      if (orderDate < thirtyDaysAgo) {
        this.orders.delete(orderId);
        // Also cleanup related order items
        for (const [itemId, item] of Array.from(this.orderItems)) {
          if (item.orderId === orderId) {
            this.orderItems.delete(itemId);
          }
        }
      }
    }
  }

  async getSalesAnalytics(
    startDate: Date,
    endDate: Date,
    serviceType?: string,
  ): Promise<{
    totalSales: number;
    orderCount: number;
    averageOrder: number;
    topItems: Array<{ itemName: string; quantity: number; revenue: number }>;
  }> {
    // Auto-cleanup old data to maintain monthly retention
    this.cleanupOldData();

    let orders = Array.from(this.orders.values()).filter((order) => {
      const orderDate = new Date(order.createdAt!);
      return (
        orderDate >= startDate &&
        orderDate <= endDate &&
        order.status === "completed"
      );
    });

    if (serviceType) {
      orders = orders.filter((order) => order.serviceType === serviceType);
    }

    const totalSales = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount),
      0,
    );
    const orderCount = orders.length;
    const averageOrder = orderCount > 0 ? totalSales / orderCount : 0;

    // Calculate top items
    const itemStats = new Map<string, { quantity: number; revenue: number }>();

    for (const order of orders) {
      const orderItems = await this.getOrderItems(order.id);
      for (const item of orderItems) {
        const existing = itemStats.get(item.itemName) || {
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += parseFloat(item.price) * item.quantity;
        itemStats.set(item.itemName, existing);
      }
    }

    const topItems = Array.from(itemStats.entries())
      .map(([itemName, stats]) => ({ itemName, ...stats }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return { totalSales, orderCount, averageOrder, topItems };
  }

  async getPaymentAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    cash: number;
    upi: number;
    card: number;
    total: number;
  }> {
    // Auto-cleanup old data to maintain monthly retention
    this.cleanupOldData();

    const filteredOrders = Array.from(this.orders.values()).filter((order) => {
      const orderDate = new Date(order.createdAt!);
      return (
        orderDate >= startDate &&
        orderDate <= endDate &&
        order.paymentStatus === "paid"
      );
    });

    let cash = 0;
    let upi = 0;
    let card = 0;

    filteredOrders.forEach((order) => {
      const amount = parseFloat(order.totalAmount);
      switch (order.paymentMethod) {
        case "cash":
          cash += amount;
          break;
        case "upi":
          upi += amount;
          break;
        case "card":
          card += amount;
          break;
      }
    });

    const total = cash + upi + card;

    return {
      cash,
      upi,
      card,
      total,
    };
  }

  // Reset completed orders
  async resetCompletedOrders(): Promise<void> {
    const orderEntries = Array.from(this.orders.entries());
    for (const [id, order] of orderEntries) {
      if (order.status === "completed") {
        this.orders.delete(id);
        // Also delete associated order items
        const orderItemEntries = Array.from(this.orderItems.entries());
        for (const [itemId, orderItem] of orderItemEntries) {
          if (orderItem.orderId === id) {
            this.orderItems.delete(itemId);
          }
        }
      }
    }
  }

  // Cancel order
  async cancelOrder(id: number, reason: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) {
      return undefined;
    }

    // Only allow cancelling orders that are pending or preparing
    if (order.status !== "pending" && order.status !== "preparing") {
      return undefined;
    }

    const updatedOrder: Order = {
      ...order,
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: reason,
    };

    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Get order pause settings
  async getOrderPauseSettings(serviceType: string): Promise<OrderPauseSettings | undefined> {
    return Array.from(this.orderPauseSettings.values()).find(
      (settings) => settings.serviceType === serviceType
    );
  }

  // Create or update order pause settings
  async createOrUpdateOrderPauseSettings(settings: InsertOrderPauseSettings): Promise<OrderPauseSettings> {
    const existing = await this.getOrderPauseSettings(settings.serviceType);
    
    if (existing) {
      const updated: OrderPauseSettings = {
        ...existing,
        ...settings,
        updatedAt: new Date(),
      };
      this.orderPauseSettings.set(existing.id, updated);
      return updated;
    } else {
      const newSettings: OrderPauseSettings = {
        id: this.currentPauseSettingsId++,
        ...settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.orderPauseSettings.set(newSettings.id, newSettings);
      return newSettings;
    }
  }

  // Check if orders are paused
  async checkIfOrdersPaused(serviceType: string): Promise<{
    isPaused: boolean;
    pausedAt?: Date;
    pauseDurationMinutes?: number;
    pauseReason?: string;
    remainingTimeMinutes?: number;
  }> {
    const settings = await this.getOrderPauseSettings(serviceType);
    
    if (!settings || !settings.isPaused || !settings.pausedAt) {
      return { isPaused: false };
    }

    const now = new Date();
    const pausedAt = new Date(settings.pausedAt);
    const elapsedMinutes = Math.floor((now.getTime() - pausedAt.getTime()) / (1000 * 60));
    const remainingTimeMinutes = Math.max(0, settings.pauseDurationMinutes! - elapsedMinutes);

    // If time has elapsed, automatically unpause
    if (remainingTimeMinutes <= 0) {
      await this.createOrUpdateOrderPauseSettings({
        serviceType,
        isPaused: false,
        pauseDurationMinutes: settings.pauseDurationMinutes!,
        pauseReason: settings.pauseReason!,
      });
      return { isPaused: false };
    }

    return {
      isPaused: true,
      pausedAt: settings.pausedAt,
      pauseDurationMinutes: settings.pauseDurationMinutes!,
      pauseReason: settings.pauseReason!,
      remainingTimeMinutes,
    };
  }
}

export const storage = new MemStorage();
