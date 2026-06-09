export interface IBrandSeed {
    name: string;
    tier: 'high' | 'mid' | 'economy';
    isPopular: boolean;
    displayOrder: number;
}

export const motorcycleBrands: IBrandSeed[] = [
    // ============================================
    // VERY COMMON IN UPPER WEST (Popular)
    // ============================================
    { name: 'Haojue', tier: 'mid', isPopular: true, displayOrder: 1 },
    { name: 'Bajaj', tier: 'high', isPopular: true, displayOrder: 2 },
    { name: 'TVS', tier: 'high', isPopular: true, displayOrder: 3 },
    { name: 'Royal', tier: 'high', isPopular: true, displayOrder: 4 },
    { name: 'Honda', tier: 'high', isPopular: true, displayOrder: 5 },
    { name: 'Yamaha', tier: 'high', isPopular: true, displayOrder: 6 },
    { name: 'Apsonic', tier: 'mid', isPopular: true, displayOrder: 7 },
    { name: 'Luojia', tier: 'mid', isPopular: true, displayOrder: 8 },
    { name: 'Lifan', tier: 'mid', isPopular: true, displayOrder: 9 },

    // ============================================
    // COMMON BUT NOT FEATURED
    // ============================================
    { name: 'Suzuki', tier: 'high', isPopular: false, displayOrder: 10 },
    { name: 'KTM', tier: 'high', isPopular: false, displayOrder: 11 },
    { name: 'Hero', tier: 'mid', isPopular: false, displayOrder: 12 },
    { name: 'Zongshen', tier: 'mid', isPopular: false, displayOrder: 13 },
    { name: 'Shineray', tier: 'mid', isPopular: false, displayOrder: 14 },
    { name: 'Loncin', tier: 'mid', isPopular: false, displayOrder: 15 },
    { name: 'CFMoto', tier: 'mid', isPopular: false, displayOrder: 16 },
    { name: 'Benelli', tier: 'mid', isPopular: false, displayOrder: 17 },
    { name: 'Piaggio', tier: 'mid', isPopular: false, displayOrder: 18 },
    { name: 'Haojin', tier: 'mid', isPopular: false, displayOrder: 19 },

    // ============================================
    // PREMIUM / RARE
    // ============================================
    { name: 'BMW', tier: 'high', isPopular: false, displayOrder: 20 },
    { name: 'Vespa', tier: 'high', isPopular: false, displayOrder: 21 },
    { name: 'Kawasaki', tier: 'high', isPopular: false, displayOrder: 22 },
    { name: 'Ducati', tier: 'high', isPopular: false, displayOrder: 23 },
    { name: 'Triumph', tier: 'high', isPopular: false, displayOrder: 24 },
    { name: 'Harley-Davidson', tier: 'high', isPopular: false, displayOrder: 25 },

    // ============================================
    // OTHER (Catch-all)
    // ============================================
    { name: 'Other', tier: 'economy', isPopular: false, displayOrder: 99 },
];