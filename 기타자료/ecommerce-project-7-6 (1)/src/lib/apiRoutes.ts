// Auto-generated API routes
interface ApiRoutes {
  api: {
    admin: {
      dashboard: string;
      orders: string;
      products: string;
      users: string;
    };
    embeddings: string;
    login: string;
    presignedUrl: string;
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
    "embeddings": "/api/embeddings",
    "login": "/api/login",
    "presignedUrl": "/api/presignedUrl",
    "products": "/api/products",
    "register": "/api/register"
  }
};