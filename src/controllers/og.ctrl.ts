import { Request, Response } from 'express';
import ListingModel from '../models/listing.model';
import { ENV } from '../config/env.config';

// ============================================
// OG TAGS FOR LISTING (Served to bots)
// ============================================
export const getListingOG = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const listing = await ListingModel.findById(id)
            .select('brand model year price condition location mileage engineCapacity images')
            .lean();

        if (!listing) {
            res.status(404).send(`
                <!DOCTYPE html>
                <html><head><title>Listing Not Found | ${ENV.APP_NAME}</title></head>
                <body><h1>Listing not found</h1></body></html>
            `);
            return;
        }

        // Build title
        const bikeTitle = [listing.brand, listing.model].filter(Boolean).join(' ');
        const year = listing.year ? `(${listing.year})` : '';
        const price = listing.price ? `GHS ${listing.price.toLocaleString()}` : '';
        const title = `${bikeTitle} ${year} - ${price}`.trim();

        // Build description
        const parts = [
            listing.condition,
            listing.mileage ? `${listing.mileage.toLocaleString()}km` : null,
            listing.engineCapacity ? `${listing.engineCapacity}cc` : null,
            listing.location ? `${listing.location}, Ghana` : 'Ghana',
        ].filter(Boolean);
        const description = parts.join(' | ');

        // Build image
        const image = listing.images?.[0]
        const frontendUrl = process.env.FRONTEND_URL
        const canonicalUrl = `${frontendUrl}/listing/${listing._id}`;

        const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>${title} | ${ENV.APP_NAME}</title>
            <meta name="description" content="${description}" />
            
            <!-- Open Graph -->
            <meta property="og:title" content="${title}" />
            <meta property="og:description" content="${description}" />
            <meta property="og:image" content="${image}" />
            <meta property="og:image:secure_url" content="${image}" />
            <meta property="og:image:type" content="image/jpeg" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:url" content="${canonicalUrl}" />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="${ENV.APP_NAME}" />
            <meta property="product:price:amount" content="${listing.price || 0}" />
            <meta property="product:price:currency" content="GHS" />
            <meta property="product:condition" content="${listing.condition?.toLowerCase() || 'used'}" />
            
            <!-- Twitter Card -->
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="${title}" />
            <meta name="twitter:description" content="${description}" />
            <meta name="twitter:image" content="${image}" />
            
            <!-- Redirect humans to the actual app -->
            <meta http-equiv="refresh" content="0; url=${canonicalUrl}" />
            <link rel="canonical" href="${canonicalUrl}" />
        </head>
        <body>
            <h1>${title}</h1>
            <p>${description}</p>
            <img src="${image}" alt="${title}" style="max-width:600px;" />
            <p><a href="${canonicalUrl}">View on ${ENV.APP_NAME}</a></p>
        </body>
        </html>`;

        // Cache for 1 hour on CDN, 1 day on browser
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=86400, stale-while-revalidate=86400');
        res.send(html);
    } catch (error) {
        console.error('OG listing error:', error);
        res.status(500).send('<html><body><h1>Error</h1></body></html>');
    }
};

// ============================================
// OG TAGS FOR HOME PAGE
// ============================================
export const getHomeOG = async (_req: Request, res: Response): Promise<void> => {
    const image = ENV.LOGO_URL
    const title = ENV.APP_NAME
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${ENV.APP_NAME} - Buy & Sell Motorbikes Safely in Ghana</title>
    <meta name="description" content="Ghana's trusted motorbike marketplace. Verified sellers, inspected bikes, trusted deals in Upper West." />
    
    <meta property="og:title" content="${title} - Buy & Sell Motorbikes Safely in Ghana" />
    <meta property="og:description" content="Ghana's trusted motorbike marketplace. Verified sellers, inspected bikes, trusted deals." />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${ENV.FRONTEND_URL}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${title}" />
    
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title} - Buy & Sell Motorbikes Safely in Ghana" />
    <meta name="twitter:description" content="Ghana's trusted motorbike marketplace." />
    <meta name="twitter:image" content="${image}" />
    
    <meta http-equiv="refresh" content="0; url=${ENV.FRONTEND_URL}" />
</head>
<body>
    <h1>${title}</h1>
    <p>Buy & Sell Motorbikes Safely in Ghana</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=86400');
    res.send(html);
};