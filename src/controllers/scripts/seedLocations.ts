

import LocationModel from '../../models/location.model';
import { ghanaLocations } from '../../data/locations.seed';


export const seedLocations = async () => {
    try {


        await LocationModel.deleteMany({});
        console.log('🗑️  Cleared existing locations');

        const locations = ghanaLocations.map((loc) => ({
            ...loc,
            slug: loc.name.toLowerCase().replace(/\s+/g, '-'),
            isActive: true,
        }));

        const result = await LocationModel.insertMany(locations);
        console.log(`✅ Seeded ${result.length} locations`);

        // Summary by region
        const byRegion = result.reduce((acc: any, loc) => {
            acc[loc.region] = (acc[loc.region] || 0) + 1;
            return acc;
        }, {});

        console.log('\n📊 Seed Summary by Region:');
        Object.entries(byRegion).forEach(([region, count]) => {
            console.log(`   ${region}: ${count}`);
        });
        console.log(`   Popular: ${result.filter((l) => l.isPopular).length}`);
        console.log(`  `);

        return `   Popular: ${result.filter((l) => l.isPopular).length}
        \n Total: ${result.length}`
    } catch (error) {
        console.error('❌ Seed failed:', error);
        return { error }
    }
};

