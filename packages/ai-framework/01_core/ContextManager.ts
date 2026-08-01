/**
 * Context Manager
 * AI Framework Core
 * Version: 0.1.0
 */

export interface AIContext {
  projectPhase: string;
  userRequest: string;
  currentTask: string;
  relevantFiles: string[];
  nextAction: string;
}

export class ContextManager {
constructor() {
}
  public  buildContext(userRequest: string): AIContext {
return {
  projectPhase: "Development",
  userRequest,
  currentTask: "Build AI Context",
  relevantFiles: [],
  nextAction: "Read INDEX.md"
};
}
}
