import { Injectable } from '@nestjs/common';
import type { ToolHandler, ToolResult } from '../../types/tool.types.js';
import type { AgentContext } from '../../types/agent.types.js';
import { RoomsService } from '../../../rooms/rooms.service.js';

@Injectable()
export class GetAllRoomsTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_all_rooms',
    description:
      'List all hostel rooms, each with its capacity, currently occupied count and occupants. (Warden only)',
    parameters: [],
  };

  constructor(private readonly rooms: RoomsService) {}

  async execute(_params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const rooms = await this.rooms.findWithOccupants();
      if (rooms.length === 0) return { success: true, data: [] };
      return { success: true, data: rooms };
    } catch {
      return { success: false, error: 'Failed to fetch rooms.' };
    }
  }
}

@Injectable()
export class GetAvailableRoomsTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_available_rooms',
    description:
      'List hostel rooms that still have free space (occupied is less than capacity), each with its occupants/students currently present. (Warden only)',
    parameters: [],
  };

  constructor(private readonly rooms: RoomsService) {}

  async execute(_params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const rooms = await this.rooms.findAvailable();
      if (rooms.length === 0) return { success: true, data: [] };
      return { success: true, data: rooms };
    } catch {
      return { success: false, error: 'Failed to fetch available rooms.' };
    }
  }
}

@Injectable()
export class GetRoomDetailsTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_room_details',
    description:
      'Get details of a hostel room by its room number, including current occupants. (Warden only)',
    parameters: [
      { name: 'roomNumber', type: 'string', description: 'Room number, e.g. "101" or "A-101"', required: true },
    ],
  };

  constructor(private readonly rooms: RoomsService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const roomNumber = params.roomNumber as string;
      const rooms = await this.rooms.findWithOccupants(roomNumber);
      if (rooms.length === 0) return { success: false, error: `Room ${roomNumber} not found.` };
      return { success: true, data: rooms[0] };
    } catch {
      return { success: false, error: 'Failed to fetch room details.' };
    }
  }
}

@Injectable()
export class CreateRoomTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'create_room',
    description:
      'Add a new hostel room with a room number, block, floor and capacity. Requires confirmation. (Warden only)',
    requiresConfirmation: true,
    parameters: [
      { name: 'roomNumber', type: 'string', description: 'Room number, e.g. "A101"', required: true },
      { name: 'block', type: 'string', description: 'Block, e.g. "A"', required: true },
      { name: 'floor', type: 'number', description: 'Floor number', required: true },
      { name: 'capacity', type: 'number', description: 'Number of beds/students the room holds', required: true },
    ],
  };

  constructor(private readonly rooms: RoomsService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const created = await this.rooms.create({
        roomNumber: params.roomNumber as string,
        block: params.block as string,
        floor: Number(params.floor),
        capacity: Number(params.capacity),
      });
      return { success: true, data: { id: created.id, roomNumber: created.roomNumber, block: created.block, floor: created.floor, capacity: created.capacity } };
    } catch {
      return { success: false, error: 'Failed to create room (it may already exist).' };
    }
  }
}
