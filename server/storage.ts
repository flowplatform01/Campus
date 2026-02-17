import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      avatarUrl: insertUser.avatarUrl ?? null,
      phone: insertUser.phone ?? null,
      profileCompletion: insertUser.profileCompletion ?? 0,
      verified: insertUser.verified ?? false,
      schoolId: insertUser.schoolId ?? null,
      subRole: insertUser.subRole ?? null,
      studentId: insertUser.studentId ?? null,
      employeeId: insertUser.employeeId ?? null,
      grade: insertUser.grade ?? null,
      classSection: insertUser.classSection ?? null,
      points: insertUser.points ?? 0,
      badges: Array.isArray(insertUser.badges) && insertUser.badges.every(b => typeof b === 'string') ? insertUser.badges : [],
      metadata: insertUser.metadata ?? null,
      emailVerifiedAt: insertUser.emailVerifiedAt ?? null,
      onboardingCompletedAt: insertUser.onboardingCompletedAt ?? null,
      referralCode: insertUser.referralCode ?? null,
      deletedAt: insertUser.deletedAt ?? null,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
