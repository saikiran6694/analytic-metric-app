import swaggerJSDoc from "swagger-jsdoc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "DataAI API Documentation",
      version: "1.0.0",
      description: "Comprehensive API documentation for Auth and Event Services",
    },
    servers: [
      {
        url: `https://analytic-metric-app.onrender.com/api`,
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "Provide your API key obtained during app registration.",
        },
      },
    },

    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },

  apis: [path.join(__dirname, "../routes/*.js")],
};

export const swaggerSpec = swaggerJSDoc(options);
