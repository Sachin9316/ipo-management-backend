import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'IPO Wizard API',
            version: '1.0.0',
            description: 'API documentation for IPO Wizard Application',
        },
        servers: [
            {
                url: 'http://localhost:4000',
                description: 'Local Development Server',
            },
            {
                url: 'https://ipo-backend-theta.vercel.app',
                description: 'Production Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js', './src/models/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
