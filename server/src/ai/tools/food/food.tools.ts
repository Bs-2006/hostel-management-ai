import { Injectable } from '@nestjs/common';
import type { ToolHandler, ToolResult } from '../../types/tool.types.js';
import type { AgentContext } from '../../types/agent.types.js';
import { FoodMenuService } from '../../../food-menu/food-menu.service.js';
import type { CreateFoodMenuDto } from '../../../food-menu/dto/food-menu.dto.js';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function todayDay(): string {
  const index = (new Date().getDay() + 6) % 7; // 0=Monday ... 6=Sunday -> DAYS order
  return DAYS[index];
}

/**
 * Resolve a user-facing date (e.g. "2026-09-01" or "2026/09/01") to a weekday
 * name (MONDAY..SUNDAY). Falls back to today's weekday when the value is not a
 * parseable date.
 */
function dayFromDate(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const match = /^\s*(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s*$/.exec(trimmed);
  if (!match) return undefined;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return undefined;
  const index = (date.getDay() + 6) % 7;
  return DAYS[index];
}

@Injectable()
export class GetFoodMenuTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_food_menu',
    description:
      'Get the hostel food menu for a specific day (e.g. "monday") or a specific date (e.g. "2026-09-01"), ' +
      "or today's menu when neither is given.",
    parameters: [
      { name: 'day', type: 'string', description: 'Day of the week (e.g. MONDAY). Optional.', required: false },
      { name: 'date', type: 'string', description: 'A specific date (YYYY-MM-DD) to resolve its weekday. Optional.', required: false },
    ],
  };

  constructor(private readonly foodMenu: FoodMenuService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const rawDay = params.day as string | undefined;
      const rawDate = params.date as string | undefined;

      const day =
        rawDay?.trim().toUpperCase() ||
        dayFromDate(rawDate) ||
        todayDay();

      const menu = await this.foodMenu.findByDay(day);

      if (!menu) {
        const all = await this.foodMenu.findAll();
        if (all.length === 0) {
          return { success: true, data: { day, menu: null, note: 'No food menu has been added for that date.' } };
        }
        return { success: true, data: { day, menu: null, note: `No food menu has been added for ${day}.`, available: all } };
      }

      return { success: true, data: menu };
    } catch {
      return { success: false, error: 'Failed to fetch the food menu.' };
    }
  }
}

@Injectable()
export class GetFoodMenuWeekTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_food_menu_week',
    description: 'Get the full week\'s hostel food menu (all published days, e.g. the whole week).',
    parameters: [],
  };

  constructor(private readonly foodMenu: FoodMenuService) {}

  async execute(_params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const all = await this.foodMenu.findAll();
      if (all.length === 0) return { success: true, data: [] };
      return { success: true, data: all };
    } catch {
      return { success: false, error: 'Failed to fetch the weekly food menu.' };
    }
  }
}

@Injectable()
export class CreateFoodMenuTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'create_food_menu',
    description:
      'Publish a new food menu for a day of the week (MONDAY-SUNDAY) with breakfast, lunch, snacks and dinner. Requires confirmation. (Warden only)',
    requiresConfirmation: true,
    parameters: [
      { name: 'day', type: 'string', description: 'Day of the week (MONDAY..SUNDAY)', required: true, enum: DAYS },
      { name: 'breakfast', type: 'string', description: 'Breakfast items', required: true },
      { name: 'lunch', type: 'string', description: 'Lunch items', required: true },
      { name: 'snacks', type: 'string', description: 'Snacks items', required: true },
      { name: 'dinner', type: 'string', description: 'Dinner items', required: true },
    ],
  };

  constructor(private readonly foodMenu: FoodMenuService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const created = await this.foodMenu.create({
        day: String(params.day).trim().toUpperCase() as CreateFoodMenuDto['day'],
        breakfast: params.breakfast as string,
        lunch: params.lunch as string,
        snacks: params.snacks as string,
        dinner: params.dinner as string,
      });
      return { success: true, data: { id: created.id, day: created.day, breakfast: created.breakfast, lunch: created.lunch, snacks: created.snacks, dinner: created.dinner } };
    } catch {
      return { success: false, error: 'Failed to create the food menu (that day may already have one).' };
    }
  }
}
