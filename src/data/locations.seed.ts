export interface LocationSeed {
    name: string;
    region: 'Upper West' | 'Upper East' | 'Northern' | 'Savannah' | 'North East' | 'Other';
    type: 'town' | 'city' | 'district';
    isPopular: boolean;
    displayOrder: number;
}

export const ghanaLocations: LocationSeed[] = [
    // ============================================
    // UPPER WEST (Core market)
    // ============================================
    { name: 'Wa', region: 'Upper West', type: 'city', isPopular: true, displayOrder: 1 },
    { name: 'Lawra', region: 'Upper West', type: 'town', isPopular: true, displayOrder: 2 },
    { name: 'Tumu', region: 'Upper West', type: 'town', isPopular: true, displayOrder: 3 },
    { name: 'Jirapa', region: 'Upper West', type: 'town', isPopular: true, displayOrder: 4 },
    { name: 'Nadowli', region: 'Upper West', type: 'town', isPopular: true, displayOrder: 5 },
    { name: 'Bamahu', region: 'Upper West', type: 'town', isPopular: false, displayOrder: 6 },
    { name: 'Hamile', region: 'Upper West', type: 'town', isPopular: false, displayOrder: 7 },
    { name: 'Nandom', region: 'Upper West', type: 'town', isPopular: false, displayOrder: 8 },
    { name: 'Lambussie', region: 'Upper West', type: 'town', isPopular: false, displayOrder: 9 },
    { name: 'Gwollu', region: 'Upper West', type: 'town', isPopular: false, displayOrder: 10 },
    { name: 'Funsi', region: 'Upper West', type: 'town', isPopular: false, displayOrder: 11 },
    { name: 'Wechiau', region: 'Upper West', type: 'town', isPopular: false, displayOrder: 12 },
    { name: 'Issa', region: 'Upper West', type: 'town', isPopular: false, displayOrder: 13 },
    { name: 'Daffiama', region: 'Upper West', type: 'town', isPopular: false, displayOrder: 14 },
    { name: 'Bussie', region: 'Upper West', type: 'town', isPopular: false, displayOrder: 15 },

    // ============================================
    // UPPER EAST
    // ============================================
    { name: 'Bolgatanga', region: 'Upper East', type: 'city', isPopular: true, displayOrder: 16 },
    { name: 'Navrongo', region: 'Upper East', type: 'town', isPopular: false, displayOrder: 17 },
    { name: 'Bawku', region: 'Upper East', type: 'town', isPopular: false, displayOrder: 18 },

    // ============================================
    // NORTHERN REGION
    // ============================================
    { name: 'Tamale', region: 'Northern', type: 'city', isPopular: true, displayOrder: 19 },
    { name: 'Yendi', region: 'Northern', type: 'town', isPopular: false, displayOrder: 20 },
    { name: 'Savelugu', region: 'Northern', type: 'town', isPopular: false, displayOrder: 21 },

    // ============================================
    // SAVANNAH REGION
    // ============================================
    { name: 'Damongo', region: 'Savannah', type: 'town', isPopular: false, displayOrder: 22 },
    { name: 'Bole', region: 'Savannah', type: 'town', isPopular: false, displayOrder: 23 },

    // ============================================
    // NORTH EAST REGION
    // ============================================
    { name: 'Nalerigu', region: 'North East', type: 'town', isPopular: false, displayOrder: 24 },
    { name: 'Gambaga', region: 'North East', type: 'town', isPopular: false, displayOrder: 25 },

    // ============================================
    // OTHER (Expansion areas)
    // ============================================
    { name: 'Techiman', region: 'Other', type: 'city', isPopular: false, displayOrder: 26 },
    { name: 'Kumasi', region: 'Other', type: 'city', isPopular: false, displayOrder: 27 },
    { name: 'Accra', region: 'Other', type: 'city', isPopular: false, displayOrder: 28 },
];