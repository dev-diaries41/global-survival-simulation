type SyntheticDataOptions = {
  ignoreKeys?: string[];
  limits?: Record<string, { min: number; max: number }>;
  sampleSize?: number;
};

export class DataSimulator {
  private ignoreKeys: string[];
  private limits: Record<string, { min: number; max: number }>;
  private sampleSize: number;

  constructor(options: SyntheticDataOptions = {}) {
    this.ignoreKeys = options.ignoreKeys || [];
    this.limits = options.limits || {};
    this.sampleSize = options.sampleSize || 1;
  }

  private generateValue(key: string, currentValue: any): any {
    if (typeof currentValue === "number") {
      const { min = 0, max = currentValue > 100 ? currentValue : 100 } = this.limits[key] || {};
      return Math.random() * (max - min) + min;
    } else if (typeof currentValue === "object" && currentValue !== null && !Array.isArray(currentValue)) {
      const updatedObject = {} as Record<string, any>;
      for (const nestedKey in currentValue) {
        updatedObject[nestedKey] = this.generateValue(nestedKey, currentValue[nestedKey]);
      }
      return updatedObject;
    }
    return currentValue;
  }

  private simulateSingle<T extends Record<string, any>>(obj: T): T {
    const simulatedData = {} as T;

    Object.entries(obj).forEach(([key, value]) => {
      if (this.ignoreKeys.includes(key)) {
        simulatedData[key as keyof T] = value;
      } else {
        simulatedData[key as keyof T] = this.generateValue(key, value);
      }
    });

    return simulatedData;
  }

  // Generator to lazily produce samples one by one
  public *generateSimulatedData<T extends Record<string, any>>(obj: T): IterableIterator<T> {
    for (let i = 0; i < this.sampleSize; i++) {
      yield this.simulateSingle(obj);
    }
  }
}

// Example usage

const sampleEnvironmentData = {
  year: 2025,
  resources: {
    food: 1000,
    water: 500,
    energy: 800,
  },
  isGlobalCollapse: false,
  population: 8000000000,
};

const options: SyntheticDataOptions = {
  ignoreKeys: ["isGlobalCollapse", "year"],
  limits: {
    food: { min: 50, max: 2000 },
    water: { min: 100, max: 1000 },
    energy: { min: 300, max: 1500 },
    population: { min: 7_000_000_000, max: 10_000_000_000 },
  },
  sampleSize: 100000, // Example of a large sample size
};

const simulator = new DataSimulator(options);

// Use a generator to process the samples one by one to minimize memory usage
for (const simulatedEnvironment of simulator.generateSimulatedData(sampleEnvironmentData)) {
  console.log(simulatedEnvironment);  // Process the simulated data (e.g., save or analyze)
}
