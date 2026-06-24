const env = process.env;

export const ENV = {
    APP_NAME: env.APP_NAME,
    FRONTEND_URL: env.FRONTEND_URL,
    LOGO_URL: env.LOGO_URL,
    // Server
    PORT: env.PORT || 5000,
    NODE_ENV: env.NODE_ENV || 'development',

    // MongoDB
    MONGO_URI: env.MONGO_URI as string,

    // URLs
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],

    // JWT
    JWT: {
        ACCESS_SECRET: env.JWT_ACCESS_SECRET as string,
        ACCESS_EXPIRE: env.JWT_ACCESS_EXPIRE || '1h',
        REFRESH_SECRET: env.JWT_REFRESH_SECRET as string,
        REFRESH_EXPIRE: env.JWT_REFRESH_EXPIRE || '30d',
        ISSUER: 'motomartgh-api',
        AUDIENCE: 'motomartgh-client',
    },

    // Cookie
    COOKIE_SECURE: env.NODE_ENV === 'production',

    // Rate Limiting
    RATE_LIMIT_WINDOW: env.RATE_LIMIT_WINDOW ? parseInt(env.RATE_LIMIT_WINDOW) : 3600000,
    RATE_LIMIT_MAX: env.RATE_LIMIT_MAX ? parseInt(env.RATE_LIMIT_MAX) : 100,

    // Cloudinary
    CLOUDINARY: {
        NAME: env.CLOUD_NAME as string,
        KEY: env.CLOUD_API_KEY as string,
        SECRET: env.CLOUD_API_SECRET as string,
    },

    // Hubtel
    HUBTEL: {
        CLIENT_ID: env.HUBTEL_CLIENT_ID as string,
        CLIENT_SECRET: env.HUBTEL_CLIENT_SECRET as string,
        MERCHANT_ID: env.HUBTEL_MERCHANT_ID as string,
    },
    PAYSTACK: {
        SECRET_KEY: env.PAYSTACK_SECRET_KEY as string,
        PUBLIC_KEY: env.PAYSTACK_PUBLIC_KEY as string,
        WEBHOOK_SECRET: env.PAYSTACK_WEBHOOK_SECRET as string,
    },
    CONTACT_EMAIL: env.CONTACT_EMAIL,
    ADMIN_EMAIL: env.ADMIN_EMAIL,
    SMTP_MAILER: {
        HOST: env.SMTP_HOST,
        PORT: env.SMTP_PORT,
        AUTH_USER: env.SMTP_USER,
        AUTH_PASS: env.SMTP_PASS,
    }
} as const;