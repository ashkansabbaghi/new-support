import envelopeSchema from '../schemas/1.0/envelope.json' with { type: 'json' }
import hostCommandSchemas from '../schemas/1.0/host-commands.json' with { type: 'json' }
import moduleEventSchemas from '../schemas/1.0/module-events.json' with { type: 'json' }
import resultSchemas from '../schemas/1.0/results.json' with { type: 'json' }

export { envelopeSchema, hostCommandSchemas, moduleEventSchemas, resultSchemas }

export function payloadSchemaMap(): Record<string, object> {
  return {
    ...(hostCommandSchemas.$defs as Record<string, object>),
    ...(moduleEventSchemas.$defs as Record<string, object>),
    ...(resultSchemas.$defs as Record<string, object>),
  }
}
