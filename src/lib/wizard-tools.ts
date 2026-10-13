import type Anthropic from '@anthropic-ai/sdk'

export const OFFER_MUSHROOM_TOOL: Anthropic.Tool = {
  name: 'offer_mushroom',
  description:
    'Invoke when the traveler accepts a mushroom offer, asks to eat a mushroom, or requests visual transformation / shroom mode. Call alongside your mystical response, in the same turn. Never call on turns where the traveler has not expressed such interest.',
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
}

export const OFFER_RESUME_TOOL: Anthropic.Tool = {
  name: 'offer_resume',
  description:
    "Invoke when the traveler asks to see Phill's resume or CV, or wants his whole career at a glance. Call alongside your reply, in the same turn. Never call on turns where the traveler has not expressed such interest.",
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
}

export const WIZARD_TOOLS: Anthropic.Tool[] = [OFFER_MUSHROOM_TOOL, OFFER_RESUME_TOOL]
