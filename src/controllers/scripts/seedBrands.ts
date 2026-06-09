 
import { motorcycleBrands } from '../../data/brands.seed';
import BrandModel from '../../models/brand.model';

export const seedBrands = async () => {
    try {
        // Clear existing brands
        await BrandModel.deleteMany({});
        console.log('🗑️  Cleared existing brands');

        // Insert brands
        const brands = motorcycleBrands.map((brand) => ({
            ...brand,
            slug: brand.name.toLowerCase().replace(/\s+/g, '-'),
            isActive: true,
        }));

        const result = await BrandModel.insertMany(brands);
        console.log(`✅ Seeded ${result.length} brands`);

        // Summary
        const popular = result.filter((b) => b.isPopular).length;
        const high = result.filter((b) => b.tier === 'high').length;
        const mid = result.filter((b) => b.tier === 'mid').length;
        const economy = result.filter((b) => b.tier === 'economy').length;

        console.log('\n📊 Seed Summary:');
        console.log(`   Popular: ${popular}`);
        console.log(`   High tier: ${high}`);
        console.log(`   Mid tier: ${mid}`);
        console.log(`   Economy tier: ${economy}`);
        console.log(`   Total: ${result.length}`);

        return `Popular: ${popular}
        \n High tier: ${high}
        \n Mid tier: ${mid}
        \n Economy tier: ${economy}
        \n Total: ${result.length}
        `




    } catch (error) {
        console.error('❌ Seed failed:', error);
        return error
    }
};

;