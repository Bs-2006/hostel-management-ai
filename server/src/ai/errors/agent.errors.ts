export class AgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class ToolNotFoundError extends AgentError {
  constructor(toolName: string) {
    super(`Tool "${toolName}" is not registered.`, 'TOOL_NOT_FOUND', 404);
  }
}

export class ToolExecutionError extends AgentError {
  constructor(toolName: string, reason: string) {
    super(`Tool "${toolName}" failed: ${reason}`, 'TOOL_EXECUTION_ERROR', 500);
  }
}

export class PermissionDeniedError extends AgentError {
  constructor(action: string) {
    super(`You do not have permission to ${action}.`, 'PERMISSION_DENIED', 403);
  }
}

export class ValidationError extends AgentError {
  constructor(reason: string) {
    super(`Validation failed: ${reason}`, 'VALIDATION_ERROR', 400);
  }
}

export class ConfirmationRequiredError extends AgentError {
  public readonly confirmationId: string;
  public readonly summary: string;

  constructor(confirmationId: string, summary: string) {
    super(`Confirmation required: ${summary}`, 'CONFIRMATION_REQUIRED', 409);
    this.confirmationId = confirmationId;
    this.summary = summary;
  }
}

export class SafetyBlockedError extends AgentError {
  constructor(reason: string) {
    super(`Action blocked by safety policy: ${reason}`, 'SAFETY_BLOCKED', 403);
  }
}
