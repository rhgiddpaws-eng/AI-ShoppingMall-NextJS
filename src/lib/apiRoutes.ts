
      // Auto-generated API routes
      interface ApiRoutes {
  routes: {
    admin: {
      routes: {
        dashboard: {
          path: string;
        };
        orders: {
          path: string;
          routes: {
            '[id]': {
              path: string;
            };
          };
        };
        products: {
          path: string;
          routes: {
            '[id]': {
              path: string;
            };
          };
        };
        users: {
          path: string;
          routes: {
            '[id]': {
              path: string;
            };
          };
        };
      };
    };
    embeddings: {
      path: string;
    };
    embeddings_alibaba_qwen: {
      path: string;
    };
    login: {
      path: string;
    };
    presignedUrl: {
      path: string;
    };
    products: {
      path: string;
      routes: {
        infinite: {
          path: string;
        };
        '[id]': {
          path: string;
        };
      };
    };
    register: {
      path: string;
    };
  };
}
      export const apiRoutes: ApiRoutes = {
  "routes": {
    "admin": {
      "routes": {
        "dashboard": {
          "path": "/api/admin/dashboard"
        },
        "orders": {
          "path": "/api/admin/orders",
          "routes": {
            "[id]": {
              "path": "/api/admin/orders/[id]"
            }
          }
        },
        "products": {
          "path": "/api/admin/products",
          "routes": {
            "[id]": {
              "path": "/api/admin/products/[id]"
            }
          }
        },
        "users": {
          "path": "/api/admin/users",
          "routes": {
            "[id]": {
              "path": "/api/admin/users/[id]"
            }
          }
        }
      }
    },
    "embeddings": {
      "path": "/api/embeddings"
    },
    "embeddings_alibaba_qwen": {
      "path": "/api/embeddings_alibaba_qwen"
    },
    "login": {
      "path": "/api/login"
    },
    "presignedUrl": {
      "path": "/api/presignedUrl"
    },
    "products": {
      "path": "/api/products",
      "routes": {
        "infinite": {
          "path": "/api/products/infinite"
        },
        "[id]": {
          "path": "/api/products/[id]"
        }
      }
    },
    "register": {
      "path": "/api/register"
    }
  }
};
    