// T-Shirt Sizing to Days Conversion
export const TSHIRT_TO_DAYS: Record<'XS' | 'S' | 'M' | 'L' | 'XL', number> = {
    'XS': 0.125,  // 1 hour
    'S': 0.5,     // 4 hours (half day)
    'M': 2,       // 2 days
    'L': 5,       // 1 week
    'XL': 10      // 2 weeks
};

// Helper function to convert T-Shirt size to days
export function tshirtToDays(size: 'XS' | 'S' | 'M' | 'L' | 'XL'): number {
    return TSHIRT_TO_DAYS[size];
}

// Helper function to get T-Shirt size label with days
export function getTshirtLabel(size: 'XS' | 'S' | 'M' | 'L' | 'XL'): string {
    const days = TSHIRT_TO_DAYS[size];
    if (days < 1) {
        const hours = days * 8;
        return `${size} (${hours}h)`;
    }
    return `${size} (${days}d)`;
}
