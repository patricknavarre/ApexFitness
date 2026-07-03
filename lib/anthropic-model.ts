/** Default vision + text model. Override with ANTHROPIC_MODEL env var. */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-5';

export function getAnthropicModelId(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}
