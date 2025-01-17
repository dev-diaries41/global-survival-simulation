# Global Survival Simulation

---

## Overview

The **Global Survival Simulation** is a resource-management game modeled to simulate global and national decision-making. It demonstrates the delicate balance between cooperation and defection within a group of entities striving to ensure their survival, as well as humanity's survival as a whole. The simulation explores decision-making dynamics in the face of finite resources and the risk of global collapse.

---

## Table of Contents

1. [Prerequisites](#prerequisites)  
2. [Features](#features)  
3. [Game Mechanics](#game-mechanics)  
   - [Nation Types](#nation-types)  
   - [Global Resources](#global-resources)  
   - [Decision-Making](#decision-making)  
4. [Simulation Workflow](#simulation-workflow)  
5. [Setup Instructions](#setup-instructions)  
6. [How to Run](#how-to-run)  
---

## Prerequisites

- Node.js installed on your machine.  
- OpenAI API key for AI-assisted decision-making.  
- Git for cloning the repository.

---

## Features

- **Dynamic Nation Generation**: Nations are dynamically generated with unique attributes.  
- **Resource Management**: Nations manage food, energy, and water resources.  
- **Decision-Making**: Nations make decisions to cooperate or defect based on their state and global context.  
- **Global Collapse Scenarios**: Tracks global collapse due to resource depletion, population decline, or the collapse of all entities.  
- **AI-Assisted Decision-Making**: Each nation's leader is simulated as an AI making decisions based on contextual prompts.

---

## Game Mechanics

### Nation Types

Each nation has the following attributes:
- **ID and Name**: Unique identifiers.  
- **Resources**: Levels of food, energy, and water.  
- **Population**: Total inhabitants.  
- **Category**: Defines resource availability: `low`, `medium`, or `high`.  
- **State**: `normal` or `struggling` based on resource availability.  
- **Collapse Status**: Determines if the nation has collapsed.

### Global Resources

- **Food, Energy, and Water**: Shared resources available to all entities.  
- **Depletion Rates**: Fixed annual reductions to global resources.

### Decision-Making

Each nation evaluates whether to:  
1. **Cooperate**: Contribute to the global resource pool, reducing depletion rates but at the cost of its own resources.  
2. **Defect**: Claim additional resources from the global pool for short-term survival, increasing the depletion rate.

---

## Simulation Workflow

1. **Initialize Simulation**: Generate entities and assign starting resources.  
2. **Annual Decision Cycle**:  
   - Each nation decides to cooperate or defect based on its resources and global state.  
   - Resources are adjusted based on decisions.  
   - Nations with depleted resources or populations collapse.  
3. **Apply Global Depletion**: Reduce global resources based on fixed depletion rates.  
4. **Check for Collapse Conditions**:  
   - Global collapse occurs if all entities collapse or if global resources are depleted.  
   - Victory is declared if humanity survives 50 years.  
5. **Save Results**: Simulation results are saved to a JSON file.

---

## Setup Instructions

1. **Clone Repository**:
   ```bash
   git clone https://github.com/dev-diaries41/global-survival-simulation.git
   cd global-survival-simulation
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   - Ensure you have an OpenAI API key.
   - Create a `.env` file in the project root and add your API key:
     ```env
     OPENAI_API_KEY=your_api_key_here
     ```

---

## How to Run

1. **Run the Simulation**:
   ```bash
   npm start
   ```

2. **View Results**:
   - Simulation results are saved in a file named `sim_result_<timestamp>.json`.  
   - Full logs are stored using the winston logger in the `logs/` directory.

---
