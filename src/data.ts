type SyntheticDataOptions = {
  ignoreKeys?: string[];
  limits?: Record<string, { min: number; max: number }>;
  sampleSize?: number;
};

const generateValue = (
  key: string,
  currentValue: any,
  limits: Record<string, { min: number; max: number }>
): any => {
  if (typeof currentValue === "number") {
    const { min = 0, max = currentValue > 100 ? currentValue : 100 } = limits[key] || {};
    return Math.random() * (max - min) + min;
  } else if (typeof currentValue === "object" && currentValue !== null && !Array.isArray(currentValue)) {
    const updatedObject = {} as Record<string, any>;
    for (const nestedKey in currentValue) {
      updatedObject[nestedKey] = generateValue(nestedKey, currentValue[nestedKey], limits);
    }
    return updatedObject;
  }
  return currentValue;
};

export const simulateSingle = <T extends Record<string, any>>(
  obj: T,
  options: SyntheticDataOptions
): T => {
  const { ignoreKeys = [], limits = {} } = options;
  const simulatedData = {} as T;

  Object.entries(obj).forEach(([key, value]) => {
    if (ignoreKeys.includes(key)) {
      simulatedData[key as keyof T] = value;
    } else {
      simulatedData[key as keyof T] = generateValue(key, value, limits);
    }
  });

  return simulatedData;
};

export const generateSimulatedData = <T extends Record<string, any>>(obj: T, options: SyntheticDataOptions = {}): IterableIterator<T> => {
  const { sampleSize = 1 } = options;
  function* generator() {
    for (let i = 0; i < sampleSize; i++) {
      yield simulateSingle(obj, options);
    }
  }
  return generator();
};

// Example usage

// const sampleEnvironmentData = {
//   year: 2025,
//   resources: {
//     food: 1000,
//     water: 500,
//     energy: 800,
//   },
//   isGlobalCollapse: false,
//   population: 8000000000,
// };

// const options: SyntheticDataOptions = {
//   ignoreKeys: ["isGlobalCollapse", "year"],
//   limits: {
//     food: { min: 50, max: 2000 },
//     water: { min: 100, max: 1000 },
//     energy: { min: 300, max: 1500 },
//     population: { min: 7_000_000_000, max: 10_000_000_000 },
//   },
//   sampleSize: 5,
// };

// for (const simulatedEnvironment of generateSimulatedData(sampleEnvironmentData, options)) {
//   console.log(simulatedEnvironment); // Process or save the simulated data
// }
