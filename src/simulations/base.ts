import { LLMClient } from "../llms/base";
import { OpenAIClient } from "../llms/openai";
import { SimulationType, SimulationConfig, DecisionResult, StepOutcome } from "../types";

export abstract class Simulation<Entity extends Record<string, any>, Environment extends Record<string, any>, StepResult extends Record<string, any>> {
    protected entities: Entity[];
    protected environment: Environment;
    protected llmClient?: LLMClient;

    readonly steps: number;
    readonly type: SimulationType;

    protected eventHandlers: {
        onStepComplete?: (eventData: StepOutcome<StepResult>) => void;
    };

    protected readonly defaultSimulationConfig: Pick<SimulationConfig, "type" | "steps"> = {
        steps: 10,
        type: "sim",
    };

    private paused: boolean = false;
    private stopped: boolean = false;

    constructor(entities: Entity[], environment: Environment, simulationConfig: Partial<SimulationConfig>) {
        this.entities = entities;
        this.environment = environment;

        // Use default options to fill in missing values
        const { steps, type, openaiApiKey, ...eventHandlers } = {
            ...this.defaultSimulationConfig,
            ...simulationConfig,
        };

        if (openaiApiKey) {
            this.llmClient = new OpenAIClient(openaiApiKey);
        } else if (type === "llm") {
            throw new Error("OpenAI API key is required to initialize LLM client.");
        }

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

    protected abstract getStateChanges(entity: Entity, decision: string): { entityChanges: DecisionResult['entityChanges']; environmentChanges: DecisionResult['environmentChanges'] };

    protected abstract updateEntity(entity: Entity, entityChanges: DecisionResult['entityChanges']): void;

    protected abstract updateEnvironment(results: (DecisionResult | null)[]): StepOutcome;

    protected abstract isSimulationCompleted(): boolean;

    abstract runStep(entity: Entity): Promise<DecisionResult<Entity, DecisionResult['environmentChanges'], DecisionResult['entityChanges']> | null>;

    abstract run(): Promise<Environment>;
}
