import crypto from "crypto";
import type { LeadRecord, LeadRepository } from "../core/types.js";
import { getFirestore, isFirebaseConfigured } from "../database/firebase.js";

export class FirestoreLeadRepository implements LeadRepository {
  private collectionName = "leads";

  async createLead(lead: {
    sessionId?: string;
    name?: string;
    email?: string;
    phone?: string;
    data?: Record<string, unknown>;
  }): Promise<LeadRecord> {
    const firestore = getFirestore();
    const leadsCollection = firestore.collection(this.collectionName);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const record: LeadRecord = {
      id,
      sessionId: lead.sessionId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      data: lead.data || {},
      createdAt: now,
      updatedAt: now,
    };

    // Clean undefined fields for Firestore
    const firestoreData: Record<string, unknown> = {
      id: record.id,
      data: record.data,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    if (record.sessionId !== undefined) firestoreData.sessionId = record.sessionId;
    if (record.name !== undefined) firestoreData.name = record.name;
    if (record.email !== undefined) firestoreData.email = record.email;
    if (record.phone !== undefined) firestoreData.phone = record.phone;

    await leadsCollection.doc(id).set(firestoreData);

    return record;
  }

  async getLeadById(id: string): Promise<LeadRecord | null> {
    const firestore = getFirestore();
    const doc = await firestore.collection(this.collectionName).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      sessionId: data.sessionId as string | undefined,
      name: data.name as string | undefined,
      email: data.email as string | undefined,
      phone: data.phone as string | undefined,
      data: (data.data as Record<string, unknown>) || {},
      createdAt: (data.createdAt as string) || new Date().toISOString(),
      updatedAt: (data.updatedAt as string) || new Date().toISOString(),
    };
  }

  async getLeadBySessionId(sessionId: string): Promise<LeadRecord | null> {
    const firestore = getFirestore();
    const snapshot = await firestore
      .collection(this.collectionName)
      .where("sessionId", "==", sessionId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      sessionId: data.sessionId as string | undefined,
      name: data.name as string | undefined,
      email: data.email as string | undefined,
      phone: data.phone as string | undefined,
      data: (data.data as Record<string, unknown>) || {},
      createdAt: (data.createdAt as string) || new Date().toISOString(),
      updatedAt: (data.updatedAt as string) || new Date().toISOString(),
    };
  }
}

/**
 * In-memory repository used for unit testing and local offline CLI fallback.
 */
export class InMemoryLeadRepository implements LeadRepository {
  private leads: Map<string, LeadRecord> = new Map();

  async createLead(lead: {
    sessionId?: string;
    name?: string;
    email?: string;
    phone?: string;
    data?: Record<string, unknown>;
  }): Promise<LeadRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const record: LeadRecord = {
      id,
      sessionId: lead.sessionId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      data: lead.data || {},
      createdAt: now,
      updatedAt: now,
    };

    this.leads.set(id, record);
    return record;
  }

  async getLeadById(id: string): Promise<LeadRecord | null> {
    return this.leads.get(id) || null;
  }

  async getLeadBySessionId(sessionId: string): Promise<LeadRecord | null> {
    for (const lead of this.leads.values()) {
      if (lead.sessionId === sessionId) {
        return lead;
      }
    }
    return null;
  }

  getAllLeads(): LeadRecord[] {
    return Array.from(this.leads.values());
  }

  clear(): void {
    this.leads.clear();
  }
}

export function createDefaultLeadRepository(): LeadRepository {
  if (isFirebaseConfigured()) {
    try {
      return new FirestoreLeadRepository();
    } catch {
      // Fallback to in-memory if initialization fails
      return new InMemoryLeadRepository();
    }
  }
  return new InMemoryLeadRepository();
}
