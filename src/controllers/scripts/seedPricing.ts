

import mongoose from 'mongoose';
import PricingModel from '../../models/pricing.model';

const pricingData = [
    // ============================================
    // LISTING FEES
    // ============================================
    {
        category: 'listing_fee',
        categoryName: 'Listing Fees',
        key: 'standard',
        label: 'Standard Listing',
        description: '30-day listing • Appears in search results',
        amount: 25,
        currency: 'GHS',
        features: [
            '30-day listing duration',
            'Appears in search results',
            'Up to 8 photos',
            'Seller contact info',
        ],
        isPopular: false,
        isActive: true,
        displayOrder: 1,
        metadata: { durationDays: 30, maxImages: 8 },
    },
    {
        category: 'listing_fee',
        categoryName: 'Listing Fees',
        key: 'premium',
        label: 'Premium Listing',
        description: 'Featured badge • Top of search • 30-day listing',
        amount: 40,
        currency: 'GHS',
        features: [
            '30-day listing duration',
            'Top of search results',
            'Featured badge',
            'Up to 10 photos',
            'Priority placement',
        ],
        isPopular: true,
        isActive: true,
        displayOrder: 2,
        metadata: { durationDays: 30, maxImages: 10, priority: true },
    },

    // ============================================
    // FEATURED BOOSTS
    // ============================================
    {
        category: 'featured_boost',
        categoryName: 'Featured Boosts',
        key: '7day',
        label: '7-Day Boost',
        description: 'Top of search for 7 days',
        amount: 15,
        currency: 'GHS',
        features: ['Top of search results', '7-day duration', 'Highlighted border'],
        isPopular: false,
        isActive: true,
        displayOrder: 1,
        metadata: { durationDays: 7 },
    },
    {
        category: 'featured_boost',
        categoryName: 'Featured Boosts',
        key: '30day',
        label: '30-Day Boost',
        description: 'Top of search for a full month',
        amount: 35,
        currency: 'GHS',
        features: ['Top of search results', '30-day duration', 'Highlighted border', 'Priority over 7-day boosts'],
        isPopular: true,
        isActive: true,
        displayOrder: 2,
        metadata: { durationDays: 30 },
    },

    // ============================================
    // VERIFICATION
    // ============================================
    {
        category: 'verification',
        categoryName: 'Verification Services',
        key: 'physical',
        label: 'Physical Inspection',
        description: 'In-person bike inspection with certificate',
        amount: 60,
        currency: 'GHS',
        features: [
            'On-site inspection',
            'Engine & chassis verification',
            'Document check',
            'Test ride assessment',
            'Verification certificate',
            'Verified badge on listing',
        ],
        isPopular: true,
        isActive: true,
        displayOrder: 1,
    },

    // ============================================
    // SUBSCRIPTIONS (Inactive - Future)
    // ============================================
    {
        category: 'subscription',
        categoryName: 'Seller Subscriptions',
        key: 'pro_monthly',
        label: 'Seller Pro',
        description: '5 listings/month, 1 featured, priority support',
        amount: 50,
        currency: 'GHS',
        features: ['5 listings per month', '1 featured listing', 'Priority support', 'Advanced analytics'],
        isPopular: false,
        isActive: false,
        displayOrder: 1,
        metadata: { listingsPerMonth: 5, featuredIncluded: 1 },
    },
    {
        category: 'subscription',
        categoryName: 'Seller Subscriptions',
        key: 'dealer_monthly',
        label: 'Dealer Plan',
        description: 'Unlimited listings, all featured, dedicated support',
        amount: 150,
        currency: 'GHS',
        features: ['Unlimited listings', 'All featured', 'Dedicated support', 'Analytics', 'Bulk tools'],
        isPopular: true,
        isActive: false,
        displayOrder: 2,
        metadata: { listingsPerMonth: -1, featuredIncluded: -1 },
    },
];

export const seedPricing = async () => {
    try {


        // Clear existing
        await PricingModel.deleteMany({});
        console.log('🗑️  Cleared existing pricing');

        // Insert all
        const result = await PricingModel.insertMany(pricingData);
        console.log(`✅ Seeded ${result.length} pricing items`);

        // Summary by category
        const byCategory = result.reduce((acc: any, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
        }, {});

        console.log('\n📊 Seed Summary:');
        Object.entries(byCategory).forEach(([cat, count]) => {
            console.log(`   ${cat}: ${count} options`);
        });

        return {
            result, byCategory
        }
    } catch (error) {
        return error
    }
};

 