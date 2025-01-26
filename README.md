# Simiverse: Simulation Framework

---

## Overview

**Simiverse** is a versatile simulation framework designed to be a universal plugin for applications, providing the necessary base simulation class and a variety of simulation modules. It allows for easy integration into different systems and can be utilized across various domains such as training data generation for machine learning models, evaluating AI alignment, simulating complex decision-making processes, and more. The framework provides tools for managing entities, environments, and decision-making within simulations, with the flexibility to use AI-driven decision models through an extensible client architecture.

Simiverse features a base class, Simulation, enabling traditional and AI-assisted decision-making workflows. It includes specialized modules like `LLMClient`, an abstract class for AI interactions, and `OpenAIClient`, an implementation example demonstrating its usage with openai. The framework integrates seamlessly with a web platform for efficient and interactive simulations.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Features](#features)
3. [Simulations](#simulations)
4. [Setup Instructions](#setup-instructions)
5. [How to Run](#how-to-run)
6. [Early Thoughts](#early-thoughts)

---

## Prerequisites

- Node.js installed on your machine.  
- OpenAI API key for AI-assisted decision-making.  
- Git for cloning the repository.

---

## Features

- **Universal Simulation Framework**: Build your simulations using the base `Simulation` class, with support for integrating custom modules.
- **Dynamic Entity Generation**: Simulate diverse entities with customizable attributes.
- **AI-Assisted Decision-Making**: Easily integrate AI models for decision-making processes, using the `LLMClient` and `OpenAIClient` modules.
- **Custom Simulation Modules**: Extend the framework by adding specific modules to fit various use cases such as training, evaluation, and AI alignment.
- **Web Platform Integration**: Seamlessly run and manage simulations on a web platform built for simulation execution and interaction.

---

## Simulations

### Survival Simulation

**Description**: The Survival Simulation models global and national decision-making in a resource-constrained world. It demonstrates the delicate balance between cooperation and defection, where nations must decide whether to collaborate or claim resources to survive. The simulation tracks global resource levels and the collapse of nations based on their decisions.

- **Simulation Type**: Resource management, decision-making, global collapse.
- **Primary Focus**: Cooperation vs. defection dynamics among nations.
- **Features**:  
  - Dynamic nation generation with unique resource states.
  - Resource depletion and its impact on global stability.
  - AI-assisted decision-making for nations' actions.
  
**Example Usage**:

```typescript
import { SurvivalSimulation } from "simiverse/simulations";
import { OpenAIClient } from "../llms/openai";

const simulation = new SurvivalSimulation(entities, environment, {
  steps: 10,
  type: "llm",
  openaiApiKey: "your-api-key",
  onStepComplete: (eventData) => console.log(eventData),
});
simulation.run();
```

---

## Setup Instructions

1. **Clone Repository**:
   ```bash
   git clone https://github.com/dev-diaries41/simiverse.git
   cd simiverse
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

---

## Early Thoughts

Here are some early ideas and potential features I may implement into the **Simiverse** framework in the future:

- **3D Avatar Creation**: Generate 3D avatars from uploaded images for use in simulations.  
- **BCI Integration**: Incorporate brain-computer interfaces for real-time neural feedback and decision-making.  
- **VR Support**: Enable immersive real-time simulation interaction via VR headsets.  
- **Holographic Displays**: Utilize 3D holographic displays for advanced, multi-dimensional data visualization.
These ideas are in the early stages and will evolve as the framework continues to develop.