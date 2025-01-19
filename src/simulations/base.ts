import { LLMClient } from "../llms/base";
import { SimulationType, SimultionOptions } from "../types";

export abstract class Simulation<Entity extends Record<string, any>, Environment extends Record<string, any>, StepResult extends Record<string, any>> {
    protected entities: Entity[];
    protected environment: Environment;
    protected llmClient?: LLMClient;

    readonly steps: number;
    readonly type: SimulationType;

    protected eventHandlers: {
        onStepComplete?: (eventData: StepResult) => void;
    };

    protected readonly defaultSimulationOptions: Pick<SimultionOptions, "type" | "steps"> = {
        steps: 10,
        type: "sim",
    };

    private paused: boolean = false; 
    private stopped: boolean = false;

    constructor(entities: Entity[], environment: Environment, simulationOptions: Partial<SimultionOptions>) {
        this.entities = entities;
        this.environment = environment;

        // Use default options to fill in missing values
        const { steps, type, ...eventHandlers } = {
            ...this.defaultSimulationOptions,
            ...simulationOptions
        };

        this.steps = steps;
        this.type = type;
        this.eventHandlers = eventHandlers;
    }

    public pause(): void {
        this.paused = true;
        console.info("Simulation paused");
    }

    public resume(): void {
        this.paused = false;
        console.info("Simulation resumed");
    }

    protected async checkPause(): Promise<void> {
        while (this.paused) {
            await new Promise((resolve) => setTimeout(resolve, 100)); // Wait until resumed
        }
    }

    // Method to stop the simulation
    public stop(): void {
        this.stopped = true;
        console.info("Simulation stopped");
    }

    // Method to check if the simulation is stopped
    protected isStopped(): boolean {
        return this.stopped;
    }

    protected abstract decide<T extends string = string>(entity: Entity, prompt?: string, systemPrompt?: string): Promise<T>;

    protected abstract getStateChanges(entity: Entity, decision: string): { entityChanges: Record<string, any>; environmentChanges: Record<string, any> };

    protected abstract updateEntity(entity: Entity, entityChanges: Record<string, any>): void;

    protected abstract updateEnvironment(results: (Record<string, any> | null)[]): StepResult;

    protected abstract isSimulationCompleted(): boolean;

    // Abstract method to run the simulation
    abstract run(): Promise<Environment>;
}
