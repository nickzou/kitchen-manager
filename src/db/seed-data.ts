export const defaultUnits = [
	{ name: "Kilogram", abbreviation: "kg" },
	{ name: "Gram", abbreviation: "g" },
	{ name: "Milligram", abbreviation: "mg" },
	{ name: "Liter", abbreviation: "L" },
	{ name: "Milliliter", abbreviation: "mL" },
	{ name: "Fluid Ounce", abbreviation: "fl oz" },
	{ name: "Gallon", abbreviation: "gal" },
	{ name: "Pound", abbreviation: "lb" },
	{ name: "Ounce", abbreviation: "oz" },
	{ name: "Piece", abbreviation: "pc" },
	{ name: "Dozen", abbreviation: "dz" },
	{ name: "Teaspoon", abbreviation: "tsp" },
	{ name: "Tablespoon", abbreviation: "tbsp" },
	{ name: "Cup", abbreviation: "cup" },
] as const;

/** Conversion pairs: multiply `from` quantity by `factor` to get `to` quantity */
export const defaultConversions = [
	// Mass
	{ from: "kg", to: "g", factor: "1000" },
	{ from: "kg", to: "mg", factor: "1000000" },
	{ from: "g", to: "mg", factor: "1000" },
	{ from: "kg", to: "lb", factor: "2.20462" },
	{ from: "lb", to: "oz", factor: "16" },
	{ from: "lb", to: "g", factor: "453.592" },
	{ from: "oz", to: "g", factor: "28.3495" },

	// Volume
	{ from: "L", to: "mL", factor: "1000" },
	{ from: "gal", to: "L", factor: "3.78541" },
	{ from: "gal", to: "fl oz", factor: "128" },
	{ from: "L", to: "fl oz", factor: "33.814" },
	{ from: "cup", to: "mL", factor: "236.588" },
	{ from: "cup", to: "fl oz", factor: "8" },
	{ from: "tbsp", to: "mL", factor: "14.7868" },
	{ from: "tbsp", to: "tsp", factor: "3" },
	{ from: "tsp", to: "mL", factor: "4.92892" },
	{ from: "cup", to: "tbsp", factor: "16" },
	{ from: "L", to: "cup", factor: "4.22675" },

	// Count
	{ from: "dz", to: "pc", factor: "12" },
] as const;
