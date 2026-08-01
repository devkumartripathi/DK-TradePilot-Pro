/**
 * Core Engine
 * AI Framework Core
 * Version: 0.1.0
 */

import { ContextManager } from "./ContextManager";
import { SessionManager } from "./SessionManager";
import { RuleEngine } from "./RuleEngine";
import { TaskPlanner } from "./TaskPlanner";
import { ExecutionEngine } from "./ExecutionEngine";

export class CoreEngine {

  private contextManager: ContextManager;
  private sessionManager: SessionManager;
  private ruleEngine: RuleEngine;
  private taskPlanner: TaskPlanner;
  private executionEngine: ExecutionEngine;

  constructor() {
    this.contextManager = new ContextManager();
    this.sessionManager = new SessionManager();
    this.ruleEngine = new RuleEngine();
    this.taskPlanner = new TaskPlanner();
    this.executionEngine = new ExecutionEngine();
  }

}