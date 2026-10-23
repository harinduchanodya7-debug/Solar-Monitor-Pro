/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Firebase Authentication & Cloud Firestore Client
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  getDocFromServer,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { HistoryPoint } from './storage';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with configured databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates connection to Firestore on boot
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Attempt non-cached server read to verify database reachability
    await getDocFromServer(doc(db, 'devices', 'connection-probe'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline or connection pending');
      return false;
    }
    // Permission denied on non-existent probe document is expected and confirms server is live
    return true;
  }
}

/**
 * Saves a timestamped telemetry sample to Firestore under the device's history subcollection
 */
export async function saveTelemetrySampleToFirestore(
  deviceId: string,
  sample: HistoryPoint
): Promise<void> {
  const path = `devices/${deviceId}/history/${sample.timestamp}`;
  try {
    await setDoc(doc(db, 'devices', deviceId, 'history', String(sample.timestamp)), {
      ...sample,
      deviceId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Queries chronological history from Firestore for a given time window
 */
export async function fetchHistoryFromFirestore(
  deviceId: string,
  startTs: number,
  endTs: number
): Promise<HistoryPoint[]> {
  const path = `devices/${deviceId}/history`;
  try {
    const q = query(
      collection(db, 'devices', deviceId, 'history'),
      where('timestamp', '>=', startTs),
      where('timestamp', '<=', endTs),
      orderBy('timestamp', 'asc'),
      limit(1000)
    );
    const snapshot = await getDocs(q);
    const points: HistoryPoint[] = [];
    snapshot.forEach((d) => {
      points.push(d.data() as HistoryPoint);
    });
    return points;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };
