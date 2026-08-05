import { RoomState } from '../../src/types/room';

class RoomStore {
  private rooms: Map<string, RoomState> = new Map();

  public getRoom(code: string): RoomState | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  public setRoom(code: string, room: RoomState): void {
    this.rooms.set(code.toUpperCase(), room);
  }

  public deleteRoom(code: string): void {
    this.rooms.delete(code.toUpperCase());
  }

  public hasRoom(code: string): boolean {
    return this.rooms.has(code.toUpperCase());
  }

  public getAllRooms(): RoomState[] {
    return Array.from(this.rooms.values());
  }
}

export const roomStore = new RoomStore();
