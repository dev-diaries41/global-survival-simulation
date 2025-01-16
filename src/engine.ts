abstract class SimulationEngine<Entity, Environment, Outcome> {
    protected entities: Entity[];
    protected environment: Environment;
    protected steps: number;
    protected onStepOutcome?: (outcome: Outcome) => void;

    constructor(entities: Entity[], environment: Environment, steps: number, onStepOutcome?: (outcome: Outcome) => void) {
        this.entities = entities;
        this.environment = environment;
        this.steps = steps;
        this.onStepOutcome = onStepOutcome;
    }

    // Abstract method to decide an action for each entity in each step.
    abstract decide(entity: Entity): Promise<string>;

    // Abstract method to calculate the changes based on the decision.
    abstract calculateChanges(entity: Entity, decision: string): { entityChanges: Partial<Entity>; environmentChanges: Partial<Environment> };

    // Abstract method to apply the changes after a decision.
    abstract applyChanges(entity: Entity, entityChanges: Partial<Entity>, environmentChanges: Partial<Environment>): void;

    // Abstract method to update the environment after the step.
    abstract updateEnvironment(): void;

    // Method to check if the simulation has ended
    abstract isSimulationOver(): boolean;

    // Run the simulation for the defined steps.
    abstract  run (): Promise<Environment>;
        
}
