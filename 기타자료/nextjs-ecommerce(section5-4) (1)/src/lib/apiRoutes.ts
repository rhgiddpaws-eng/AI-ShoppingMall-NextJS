// Auto-generated API routes
interface ApiRoutes {
  api: {
    admin: {
      dashboard: string;
      orders: string;
      products: string;
      users: string;
    };
    login: string;
    products: string;
    register: string;
  };
}

export const apiRoutes: ApiRoutes = {
  "api": {
    "admin": {
      "dashboard": "/api/admin/dashboard",
      "orders": "/api/admin/orders",
      "products": "/api/admin/products",
      "users": "/api/admin/users"
    },
    "login": "/api/login",
    "products": "/api/products",
    "register": "/api/register"
  }
};